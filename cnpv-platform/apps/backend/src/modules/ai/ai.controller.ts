import {
  Controller, Get, Post, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('AI Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('sessions')
  createSession(
    @CurrentUser() user: any,
    @Body() body: { sessionType?: string },
  ) {
    return this.aiService.createSession(user.id, user.hospitalId, body.sessionType);
  }

  @Get('sessions')
  getSessions(@CurrentUser() user: any) {
    return this.aiService.getSessions(user.id);
  }

  @Get('sessions/:id')
  getSession(@Param('id') id: string, @CurrentUser() user: any) {
    return this.aiService.getSession(id, user.id);
  }

  @Get('sessions/:id/messages')
  getMessages(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.aiService.getMessages(id, user.id, +page, +limit);
  }

  @Post('sessions/:id/ask')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  ask(
    @Param('id') id: string,
    @Body() body: { question: string; category?: string },
    @CurrentUser() user: any,
  ) {
    return this.aiService.ask(id, body.question, user.id, user.hospitalId, body.category);
  }
}
