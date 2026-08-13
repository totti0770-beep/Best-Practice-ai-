import {
  Controller, Post, Body, UseGuards, Get, Req,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(
    @Body() body: { email: string; password: string },
    @Req() req: any,
  ) {
    return this.authService.login(body.email, body.password, req.ip);
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  verifyMfa(@Body() body: { tempToken: string; code: string }) {
    return this.authService.verifyMfa(body.tempToken, body.code);
  }

  @Post('mfa/setup')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  setupMfa(@CurrentUser('id') userId: string) {
    return this.authService.setupMfa(userId);
  }

  @Post('mfa/enable')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  enableMfa(@CurrentUser('id') userId: string, @Body() body: { code: string }) {
    return this.authService.enableMfa(userId, body.code);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser('id') userId: string) {
    return this.authService.logout(userId);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: any) {
    return this.usersService.findOne(user.id);
  }
}
