import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DoseFormula } from './entities/dose-formula.entity';
import { AuditService } from '../audit/audit.service';
import { AuditEventType, UserRole, DOCUMENT_APPROVE_ROLES } from '@cnpv/shared-types';

const SAFE_OPERATORS = /^[0-9+\-*/().\s]+$/;

@Injectable()
export class DoseCalculatorService {
  constructor(
    @InjectRepository(DoseFormula)
    private readonly formulaRepo: Repository<DoseFormula>,
    private readonly audit: AuditService,
  ) {}

  async findAll(hospitalId: string): Promise<DoseFormula[]> {
    return this.formulaRepo.find({ where: { hospitalId, isActive: true } });
  }

  async findOne(id: string, hospitalId: string): Promise<DoseFormula> {
    const formula = await this.formulaRepo.findOne({ where: { id, hospitalId } });
    if (!formula) throw new NotFoundException('المعادلة غير موجودة');
    return formula;
  }

  async create(data: Partial<DoseFormula>, userId: string, userRole: UserRole): Promise<DoseFormula> {
    // Only pharmacist reviewer or above can create formulas
    const allowedRoles: UserRole[] = [
      UserRole.PHARMACIST_REVIEWER, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN,
    ];
    if (!allowedRoles.includes(userRole)) {
      throw new ForbiddenException('فقط الصيدلاني المراجع يمكنه إنشاء معادلات الجرعات');
    }

    const formula = await this.formulaRepo.save(
      this.formulaRepo.create({ ...data, createdBy: userId }),
    );

    await this.audit.log(AuditEventType.DOSE_FORMULA_CREATED, {
      userId,
      hospitalId: formula.hospitalId,
      entityType: 'dose_formula',
      entityId: formula.id,
    });

    return formula;
  }

  async calculate(
    formulaId: string,
    variables: Record<string, number>,
    userId: string,
    hospitalId: string,
  ) {
    const formula = await this.findOne(formulaId, hospitalId);

    // Validate all required variables are present
    for (const v of formula.formulaVariables) {
      if (variables[v.name] === undefined) {
        throw new BadRequestException(`المتغير '${v.labelAr}' مطلوب`);
      }
      if (v.min !== undefined && variables[v.name] < v.min) {
        throw new BadRequestException(`${v.labelAr}: القيمة أقل من الحد الأدنى (${v.min})`);
      }
      if (v.max !== undefined && variables[v.name] > v.max) {
        throw new BadRequestException(`${v.labelAr}: القيمة أعلى من الحد الأقصى (${v.max})`);
      }
    }

    // Safe formula evaluation — replace variable names with values
    let expr = formula.formulaExpression;
    for (const [name, value] of Object.entries(variables)) {
      expr = expr.replace(new RegExp(`\\b${name}\\b`, 'g'), String(value));
    }

    // Validate expression contains only safe characters
    if (!SAFE_OPERATORS.test(expr)) {
      throw new BadRequestException('صيغة المعادلة غير آمنة');
    }

    // eslint-disable-next-line no-eval
    const result = Number(eval(expr));
    if (isNaN(result) || !isFinite(result)) {
      throw new BadRequestException('خطأ في حساب الجرعة');
    }

    const withinSafeRange =
      (formula.minDose === null || result >= formula.minDose) &&
      (formula.maxDose === null || result <= formula.maxDose);

    await this.audit.log(AuditEventType.DOSE_CALCULATED, {
      userId,
      hospitalId,
      entityType: 'dose_formula',
      entityId: formulaId,
      metadata: { variables, result, withinSafeRange },
    });

    return {
      formulaId,
      drugNameAr: formula.drugNameAr,
      result: Math.round(result * 100) / 100,
      unit: formula.doseUnit,
      withinSafeRange,
      minDose: formula.minDose,
      maxDose: formula.maxDose,
      sourceDocumentTitle: null,
      sourcePage: formula.sourcePage,
      warning: '⚠️ هذا الحساب للإرشاد فقط ولا يُعتمد دون مراجعة سريرية من الطبيب المختص',
    };
  }
}
