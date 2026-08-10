import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@cnpv/shared-types';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN)
  overview(@CurrentUser() user: any) {
    return this.analyticsService.getOverview(user.hospitalId);
  }

  @Get('documents/by-status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN)
  byStatus(@CurrentUser() user: any) {
    return this.analyticsService.getDocumentsByStatus(user.hospitalId);
  }

  @Get('documents/by-category')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN)
  byCategory(@CurrentUser() user: any) {
    return this.analyticsService.getDocumentsByCategory(user.hospitalId);
  }

  @Get('ai/usage')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN)
  aiUsage(@CurrentUser() user: any, @Query('days') days = 30) {
    return this.analyticsService.getAiUsage(user.hospitalId, +days);
  }
}
