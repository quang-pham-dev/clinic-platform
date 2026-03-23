import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';
import 'reflect-metadata';
import { DataSource } from 'typeorm';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'clinic_booking',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'secret',
  entities: [path.resolve(__dirname, '../**/*.entity{.ts,.js}')],
  synchronize: false,
});

async function seed() {
  await dataSource.initialize();
  console.log('🌱 Seeding development data...');

  try {
    const usersRepo = dataSource.getRepository('users');
    const profilesRepo = dataSource.getRepository('user_profiles');
    const doctorsRepo = dataSource.getRepository('doctors');

    // Admin user
    const [adminExists] = await usersRepo.query(
      `SELECT id FROM users WHERE email = $1`,
      ['admin@clinic.local'],
    );
    if (!adminExists) {
      await usersRepo.query(
        `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id`,
        ['admin@clinic.local', await bcrypt.hash('Admin@123', 12), 'admin'],
      );
      const [admin] = await usersRepo.query(
        `SELECT id FROM users WHERE email = $1`,
        ['admin@clinic.local'],
      );
      await profilesRepo.query(
        `INSERT INTO user_profiles (user_id, full_name) VALUES ($1, $2)`,
        [admin.id, 'Clinic Admin'],
      );
      console.log('✅ Admin created: admin@clinic.local / Admin@123');
    } else {
      console.log('⏭️  Admin already exists, skipping');
    }

    // Doctor 1 — Dr. Nguyen
    const [doc1Exists] = await usersRepo.query(
      `SELECT id FROM users WHERE email = $1`,
      ['dr.nguyen@clinic.local'],
    );
    if (!doc1Exists) {
      const [doc1] = await usersRepo.query(
        `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id`,
        [
          'dr.nguyen@clinic.local',
          await bcrypt.hash('Doctor@123', 12),
          'doctor',
        ],
      );
      await profilesRepo.query(
        `INSERT INTO user_profiles (user_id, full_name) VALUES ($1, $2)`,
        [doc1.id, 'Dr. Pham Ngoc Quang'],
      );
      await doctorsRepo.query(
        `INSERT INTO doctors (user_id, specialty, license_number, bio) VALUES ($1, $2, $3, $4)`,
        [
          doc1.id,
          'General Practice',
          'GP-001',
          '15 years of experience in general practice',
        ],
      );
      console.log('✅ Doctor 1 created: dr.nguyen@clinic.local / Doctor@123');
    } else {
      console.log('⏭️  Doctor 1 already exists, skipping');
    }

    // Doctor 2 — Dr. Tran
    const [doc2Exists] = await usersRepo.query(
      `SELECT id FROM users WHERE email = $1`,
      ['dr.tran@clinic.local'],
    );
    if (!doc2Exists) {
      const [doc2] = await usersRepo.query(
        `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id`,
        ['dr.tran@clinic.local', await bcrypt.hash('Doctor@123', 12), 'doctor'],
      );
      await profilesRepo.query(
        `INSERT INTO user_profiles (user_id, full_name) VALUES ($1, $2)`,
        [doc2.id, 'Dr. Tran Thi B'],
      );
      await doctorsRepo.query(
        `INSERT INTO doctors (user_id, specialty, license_number, bio) VALUES ($1, $2, $3, $4)`,
        [
          doc2.id,
          'Cardiology',
          'CARD-002',
          'Specialist in cardiovascular disease',
        ],
      );
      console.log('✅ Doctor 2 created: dr.tran@clinic.local / Doctor@123');
    } else {
      console.log('⏭️  Doctor 2 already exists, skipping');
    }

    // Sample patient
    const [patientExists] = await usersRepo.query(
      `SELECT id FROM users WHERE email = $1`,
      ['patient@example.com'],
    );
    if (!patientExists) {
      const [patient] = await usersRepo.query(
        `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id`,
        [
          'patient@example.com',
          await bcrypt.hash('Patient@123', 12),
          'patient',
        ],
      );
      await profilesRepo.query(
        `INSERT INTO user_profiles (user_id, full_name, phone, date_of_birth) VALUES ($1, $2, $3, $4)`,
        [patient.id, 'Nguyen Van Patient', '0901234567', '1990-01-15'],
      );
      console.log('✅ Patient created: patient@example.com / Patient@123');
    } else {
      console.log('⏭️  Patient already exists, skipping');
    }

    console.log('\n🌱 Seed complete!');
    console.log('\nTest credentials:');
    console.log('  Admin:   admin@clinic.local   / Admin@123');
    console.log('  Doctor1: dr.nguyen@clinic.local / Doctor@123');
    console.log('  Doctor2: dr.tran@clinic.local  / Doctor@123');
    console.log('  Patient: patient@example.com  / Patient@123');
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
