import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFile, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  UserRole, DocumentStatus, DocumentCategory, DOCUMENT_UPLOAD_ROLES, DOCUMENT_APPROVE_ROLES,
} from '@cnpv/shared-types';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  findAll(@Query() filters: any, @CurrentUser() user: any) {
    return this.documentsService.findAll({
      hospitalId: user.hospitalId,
      ...filters,
    });
  }

  @Post('upload')
  @Roles(...DOCUMENT_UPLOAD_ROLES)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.documentsService.upload(file, body, user.id, user.hospitalId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.documentsService.findOne(id, user.hospitalId);
  }

  @Get(':id/view')
  getViewUrl(@Param('id') id: string, @CurrentUser() user: any) {
    return this.documentsService.getSignedViewUrl(id, user.id, user.hospitalId);
  }

  @Get(':id/versions')
  getVersions(@Param('id') id: string, @CurrentUser() user: any) {
    return this.documentsService.getVersions(id, user.hospitalId);
  }

  @Post(':id/submit-review')
  @Roles(UserRole.KNOWLEDGE_MANAGER, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)
  submitReview(@Param('id') id: string, @CurrentUser() user: any) {
    return this.documentsService.transition(
      id, DocumentStatus.UNDER_REVIEW, user.id, user.role, user.hospitalId,
    );
  }

  @Post(':id/approve')
  @Roles(...DOCUMENT_APPROVE_ROLES)
  approve(@Param('id') id: string, @Body() body: { notes?: string }, @CurrentUser() user: any) {
    return this.documentsService.transition(
      id, DocumentStatus.APPROVED, user.id, user.role, user.hospitalId, body.notes,
    );
  }

  @Post(':id/reject')
  @Roles(...DOCUMENT_APPROVE_ROLES)
  reject(@Param('id') id: string, @Body() body: { reason: string }, @CurrentUser() user: any) {
    return this.documentsService.transition(
      id, DocumentStatus.REJECTED, user.id, user.role, user.hospitalId, body.reason,
    );
  }

  @Post(':id/index')
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)
  index(@Param('id') id: string, @CurrentUser() user: any) {
    return this.documentsService.transition(
      id, DocumentStatus.INDEXED, user.id, user.role, user.hospitalId,
    );
  }

  @Post(':id/activate')
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)
  activate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.documentsService.transition(
      id, DocumentStatus.ACTIVE, user.id, user.role, user.hospitalId,
    );
  }

  @Post(':id/expire')
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)
  expire(@Param('id') id: string, @CurrentUser() user: any) {
    return this.documentsService.transition(
      id, DocumentStatus.EXPIRED, user.id, user.role, user.hospitalId,
    );
  }
}
