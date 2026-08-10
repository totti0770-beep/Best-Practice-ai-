import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
});

async function runSeeds() {
  try {
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();

    console.log('Seeding database...');

    // Seed hospital
    const hospitalResult = await queryRunner.query(`
      INSERT INTO hospitals (name_ar, name_en, license_no, city)
      VALUES ('مستشفى CNPV التجريبي', 'CNPV Demo Hospital', 'LIC-001', 'الرياض')
      ON CONFLICT (license_no) DO UPDATE SET name_ar = EXCLUDED.name_ar
      RETURNING id;
    `);
    const hospitalId = hospitalResult[0].id;
    console.log('Hospital seeded:', hospitalId);

    // Seed super admin
    const passwordHash = await bcrypt.hash('Admin@1234!', parseInt(process.env.BCRYPT_ROUNDS || '12'));
    await queryRunner.query(`
      INSERT INTO users (full_name_ar, full_name_en, email, password_hash, role, hospital_id)
      VALUES ('المسؤول العام', 'Super Admin', 'admin@cnpv.sa', $1, 'super_admin', $2)
      ON CONFLICT (email) DO NOTHING;
    `, [passwordHash, hospitalId]);
    console.log('Super admin seeded: admin@cnpv.sa / Admin@1234!');

    // Seed hospital admin
    const adminHash = await bcrypt.hash('HAdmin@1234!', parseInt(process.env.BCRYPT_ROUNDS || '12'));
    await queryRunner.query(`
      INSERT INTO users (full_name_ar, full_name_en, email, password_hash, role, hospital_id)
      VALUES ('مدير المستشفى', 'Hospital Admin', 'hospital-admin@cnpv.sa', $1, 'hospital_admin', $2)
      ON CONFLICT (email) DO NOTHING;
    `, [adminHash, hospitalId]);

    // Seed nurse user
    const nurseHash = await bcrypt.hash('Nurse@1234!', parseInt(process.env.BCRYPT_ROUNDS || '12'));
    await queryRunner.query(`
      INSERT INTO users (full_name_ar, full_name_en, email, password_hash, role, hospital_id, department)
      VALUES ('ممرضة تجريبية', 'Demo Nurse', 'nurse@cnpv.sa', $1, 'nurse', $2, 'قسم الباطنية')
      ON CONFLICT (email) DO NOTHING;
    `, [nurseHash, hospitalId]);

    // Seed pharmacist reviewer
    const pharmHash = await bcrypt.hash('Pharm@1234!', parseInt(process.env.BCRYPT_ROUNDS || '12'));
    await queryRunner.query(`
      INSERT INTO users (full_name_ar, full_name_en, email, password_hash, role, hospital_id)
      VALUES ('الصيدلاني المراجع', 'Pharmacist Reviewer', 'pharmacist@cnpv.sa', $1, 'pharmacist_reviewer', $2)
      ON CONFLICT (email) DO NOTHING;
    `, [pharmHash, hospitalId]);

    // Seed knowledge manager
    const kmHash = await bcrypt.hash('KMgr@1234!', parseInt(process.env.BCRYPT_ROUNDS || '12'));
    await queryRunner.query(`
      INSERT INTO users (full_name_ar, full_name_en, email, password_hash, role, hospital_id)
      VALUES ('مدير المعرفة', 'Knowledge Manager', 'km@cnpv.sa', $1, 'knowledge_manager', $2)
      ON CONFLICT (email) DO NOTHING;
    `, [kmHash, hospitalId]);

    // Seed sample dose formula
    const pharmUser = await queryRunner.query(
      `SELECT id FROM users WHERE email = 'pharmacist@cnpv.sa' LIMIT 1`
    );
    if (pharmUser.length > 0) {
      await queryRunner.query(`
        INSERT INTO dose_formulas (
          hospital_id, drug_name_ar, drug_name_en,
          formula_type, formula_expression, formula_variables,
          min_dose, max_dose, dose_unit, route, created_by
        )
        VALUES (
          $1, 'أموكسيسيلين', 'Amoxicillin',
          'weight_based', 'dose_mg_per_kg * weight_kg',
          '[{"name":"weight_kg","label_ar":"الوزن (كغ)","unit":"kg","min":1,"max":200},
            {"name":"dose_mg_per_kg","label_ar":"الجرعة (ملغ/كغ)","unit":"mg/kg","min":10,"max":25}]',
          50, 500, 'mg', 'PO', $2
        )
        ON CONFLICT DO NOTHING;
      `, [hospitalId, pharmUser[0].id]);
    }

    console.log('');
    console.log('=== Test Credentials ===');
    console.log('Super Admin:   admin@cnpv.sa         / Admin@1234!');
    console.log('Hospital Admin: hospital-admin@cnpv.sa / HAdmin@1234!');
    console.log('Nurse:          nurse@cnpv.sa         / Nurse@1234!');
    console.log('Pharmacist:     pharmacist@cnpv.sa    / Pharm@1234!');
    console.log('Knowledge Mgr:  km@cnpv.sa            / KMgr@1234!');
    console.log('========================');

    await queryRunner.release();
    await dataSource.destroy();
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

runSeeds();
