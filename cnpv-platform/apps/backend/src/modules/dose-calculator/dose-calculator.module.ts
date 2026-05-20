import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoseFormula } from './entities/dose-formula.entity';
import { DoseCalculatorController } from './dose-calculator.controller';
import { DoseCalculatorService } from './dose-calculator.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([DoseFormula]), AuditModule],
  controllers: [DoseCalculatorController],
  providers: [DoseCalculatorService],
})
export class DoseCalculatorModule {}
