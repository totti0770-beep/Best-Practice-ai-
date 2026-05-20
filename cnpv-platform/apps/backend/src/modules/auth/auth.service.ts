import {
  Injectable, UnauthorizedException, BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { UsersService } from '../users/users.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  async login(email: string, password: string, ipAddress?: string) {
    const user = await this.usersService.findByEmail(email, true);

    if (!user) {
      throw new UnauthorizedException('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('الحساب مقفل مؤقتاً بسبب محاولات تسجيل دخول متعددة');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      await this.usersService.incrementFailedLogins(user.id);
      throw new UnauthorizedException('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    await this.usersService.resetFailedLogins(user.id);

    if (user.isMfaEnabled) {
      const tempToken = this.jwtService.sign(
        { sub: user.id, email: user.email, role: user.role, hospitalId: user.hospitalId, mfaPending: true },
        { expiresIn: this.configService.get('MFA_TEMP_TOKEN_EXPIRY', '5m') },
      );
      return { mfaPending: true, tempToken };
    }

    return this.issueTokens(user);
  }

  async verifyMfa(tempToken: string, totpCode: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(tempToken) as JwtPayload;
    } catch {
      throw new UnauthorizedException('رمز التحقق المؤقت غير صالح');
    }

    if (!payload.mfaPending) {
      throw new BadRequestException('الرمز المؤقت غير صالح');
    }

    const user = await this.usersService.findByEmail(payload.email, true);
    if (!user?.mfaSecret) throw new UnauthorizedException('لم يتم إعداد التحقق بخطوتين');

    const isValid = authenticator.verify({ token: totpCode, secret: user.mfaSecret });
    if (!isValid) throw new UnauthorizedException('رمز التحقق غير صحيح');

    return this.issueTokens(user);
  }

  async setupMfa(userId: string) {
    const user = await this.usersService.findOne(userId);
    const secret = authenticator.generateSecret();
    await this.usersService.setMfaSecret(userId, secret);

    const otpAuthUrl = authenticator.keyuri(user.email, 'CNPV Platform', secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);
    return { secret, qrCode: qrCodeDataUrl };
  }

  async enableMfa(userId: string, totpCode: string) {
    const user = await this.usersService.findByEmail(
      (await this.usersService.findOne(userId)).email, true
    );
    if (!user?.mfaSecret) throw new BadRequestException('قم بإعداد MFA أولاً');

    const isValid = authenticator.verify({ token: totpCode, secret: user.mfaSecret });
    if (!isValid) throw new UnauthorizedException('رمز التحقق غير صحيح');

    await this.usersService.enableMfa(userId);
    return { message: 'تم تفعيل التحقق بخطوتين بنجاح' };
  }

  async refresh(tokenValue: string) {
    const tokenHash = crypto.createHash('sha256').update(tokenValue).digest('hex');
    const stored = await this.refreshTokenRepo.findOne({
      where: { tokenHash },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('رمز التحديث غير صالح أو منتهي الصلاحية');
    }

    await this.refreshTokenRepo.update(stored.id, { revokedAt: new Date() });
    const user = await this.usersService.findOne(stored.userId);
    return this.issueTokens(user);
  }

  async logout(userId: string): Promise<void> {
    await this.refreshTokenRepo.update(
      { userId, revokedAt: undefined as any },
      { revokedAt: new Date() },
    );
  }

  private async issueTokens(user: any) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      hospitalId: user.hospitalId,
    };

    const accessToken = this.jwtService.sign(payload);

    // Generate refresh token
    const rawRefreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    const expiresAt = new Date(
      Date.now() + this.parseExpiry(this.configService.get('JWT_REFRESH_EXPIRY', '7d')),
    );

    await this.refreshTokenRepo.save({ userId: user.id, tokenHash, expiresAt });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        fullNameAr: user.fullNameAr,
        email: user.email,
        role: user.role,
        hospitalId: user.hospitalId,
        isMfaEnabled: user.isMfaEnabled,
      },
    };
  }

  private parseExpiry(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));
    const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return value * (multipliers[unit] || 86400000);
  }
}
