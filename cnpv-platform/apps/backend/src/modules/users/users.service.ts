import {
  Injectable, NotFoundException, ConflictException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UserRole } from '@cnpv/shared-types';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findAll(filters: {
    hospitalId?: string;
    role?: UserRole;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { hospitalId, role, search, page = 1, limit = 20 } = filters;
    const qb = this.userRepo.createQueryBuilder('u');

    if (hospitalId) qb.andWhere('u.hospitalId = :hospitalId', { hospitalId });
    if (role) qb.andWhere('u.role = :role', { role });
    if (search) {
      qb.andWhere('(u.fullNameAr ILIKE :s OR u.email ILIKE :s)', { s: `%${search}%` });
    }

    qb.andWhere('u.isActive = true');
    qb.skip((page - 1) * limit).take(limit);
    qb.orderBy('u.createdAt', 'DESC');

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('المستخدم غير موجود');
    return user;
  }

  async findByEmail(email: string, withPassword = false): Promise<User | null> {
    const qb = this.userRepo.createQueryBuilder('u').where('u.email = :email', { email });
    if (withPassword) qb.addSelect('u.passwordHash');
    if (withPassword) qb.addSelect('u.mfaSecret');
    return qb.getOne();
  }

  async create(data: {
    fullNameAr: string;
    fullNameEn?: string;
    email: string;
    role: UserRole;
    hospitalId: string;
    department?: string;
    employeeId?: string;
  }, createdBy: string): Promise<User> {
    const existing = await this.userRepo.findOne({ where: { email: data.email } });
    if (existing) throw new ConflictException('البريد الإلكتروني مستخدم بالفعل');

    const tempPassword = `Temp@${Math.random().toString(36).slice(2, 10)}!`;
    const passwordHash = await bcrypt.hash(tempPassword, parseInt(process.env.BCRYPT_ROUNDS || '12'));

    const user = this.userRepo.create({ ...data, passwordHash, createdBy });
    await this.userRepo.save(user);
    // In production: send email with tempPassword
    return user;
  }

  async update(id: string, data: Partial<User>, requesterId: string, requesterRole: UserRole): Promise<User> {
    const user = await this.findOne(id);
    // Prevent privilege escalation
    if (data.role && requesterRole === UserRole.HOSPITAL_ADMIN && data.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('لا يمكن تعيين دور المسؤول العام');
    }
    await this.userRepo.update(id, data);
    return this.findOne(id);
  }

  async deactivate(id: string): Promise<void> {
    await this.findOne(id);
    await this.userRepo.update(id, { isActive: false });
  }

  async updatePassword(id: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS || '12'));
    await this.userRepo.update(id, { passwordHash });
  }

  async incrementFailedLogins(id: string): Promise<void> {
    await this.userRepo.increment({ id }, 'failedLoginCount', 1);
    const user = await this.findOne(id);
    // Lock after 5 failed attempts for 15 minutes
    if (user.failedLoginCount >= 5) {
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      await this.userRepo.update(id, { lockedUntil });
    }
  }

  async resetFailedLogins(id: string): Promise<void> {
    await this.userRepo.update(id, { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() });
  }

  async setMfaSecret(id: string, secret: string): Promise<void> {
    await this.userRepo.update(id, { mfaSecret: secret });
  }

  async enableMfa(id: string): Promise<void> {
    await this.userRepo.update(id, { isMfaEnabled: true });
  }
}
