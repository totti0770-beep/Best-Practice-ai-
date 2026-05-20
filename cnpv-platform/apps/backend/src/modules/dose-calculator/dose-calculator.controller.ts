import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DoseCalculatorService } from './dose-calculator.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Dose Calculator')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dose-calculator')
export class DoseCalculatorController {
  constructor(private readonly doseService: DoseCalculatorService) {}

  @Get('formulas')
  findAll(@CurrentUser() user: any) {
    return this.doseService.findAll(user.hospitalId);
  }

  @Get('formulas/:id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.doseService.findOne(id, user.hospitalId);
  }

  @Post('formulas')
  create(@Body() body: any, @CurrentUser() user: any) {
    return this.doseService.create({ ...body, hospitalId: user.hospitalId }, user.id, user.role);
  }

  @Post('calculate')
  calculate(
    @Body() body: { formulaId: string; variables: Record<string, number> },
    @CurrentUser() user: any,
  ) {
    return this.doseService.calculate(body.formulaId, body.variables, user.id, user.hospitalId);
  }
}
