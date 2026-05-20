import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('dose_formulas')
export class DoseFormula {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'hospital_id' })
  @Index()
  hospitalId: string;

  @Column({ name: 'drug_name_ar' })
  drugNameAr: string;

  @Column({ name: 'drug_name_en', nullable: true })
  drugNameEn: string | null;

  @Column({ name: 'formula_type' })
  formulaType: string;

  @Column({ name: 'formula_expression', type: 'text' })
  formulaExpression: string;

  @Column({ name: 'formula_variables', type: 'jsonb' })
  formulaVariables: FormulaVariable[];

  @Column({ name: 'min_dose', type: 'decimal', precision: 10, scale: 4, nullable: true })
  minDose: number | null;

  @Column({ name: 'max_dose', type: 'decimal', precision: 10, scale: 4, nullable: true })
  maxDose: number | null;

  @Column({ name: 'dose_unit' })
  doseUnit: string;

  @Column({ nullable: true })
  route: string | null;

  @Column({ name: 'source_document_id', nullable: true })
  sourceDocumentId: string | null;

  @Column({ name: 'source_page', nullable: true })
  sourcePage: number | null;

  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

export interface FormulaVariable {
  name: string;
  labelAr: string;
  unit: string;
  min?: number;
  max?: number;
}
