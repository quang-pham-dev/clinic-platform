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
    const slotsRepo = dataSource.getRepository('time_slots');
    const bookingsRepo = dataSource.getRepository('appointments');

    const createAccount = async (
      email: string,
      pass: string,
      role: string,
      profile: any,
      doctorData?: any,
    ) => {
      const [exists] = await usersRepo.query(
        'SELECT id FROM users WHERE email = $1',
        [email],
      );
      if (exists) {
        console.log(
          `⏭️  User ${email} already exists, skipping user creation.`,
        );
        return exists.id;
      }

      const [user] = await usersRepo.query(
        `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id`,
        [email, await bcrypt.hash(pass, 12), role],
      );

      await profilesRepo.query(
        `INSERT INTO user_profiles (user_id, full_name, phone, date_of_birth) VALUES ($1, $2, $3, $4)`,
        [user.id, profile.fullName, profile.phone || null, profile.dob || null],
      );

      if (role === 'doctor' && doctorData) {
        await doctorsRepo.query(
          `INSERT INTO doctors (user_id, specialty, license_number, bio, consultation_fee, is_accepting_patients) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            user.id,
            doctorData.specialty,
            doctorData.license,
            doctorData.bio,
            doctorData.fee || 50,
            true,
          ],
        );
      }

      console.log(`✅ Created ${role}: ${email}`);
      return user.id;
    };

    // 1. Create Admin
    await createAccount('admin@clinic.local', 'Admin@123', 'admin', {
      fullName: 'Clinic Admin',
    });

    // 2. Create Doctors
    const doctors = [
      {
        email: 'dr.nguyen@clinic.local',
        name: 'Dr. Pham Ngoc Quang',
        specialty: 'General Practice',
        license: 'GP-001',
        bio: '15 years of experience in general practice. Dedicated to holistic family care.',
        fee: 30,
      },
      {
        email: 'dr.tran@clinic.local',
        name: 'Dr. Tran Thi B',
        specialty: 'Cardiology',
        license: 'CARD-002',
        bio: 'Specialist in cardiovascular disease and echocardiography.',
        fee: 50,
      },
      {
        email: 'dr.le@clinic.local',
        name: 'Dr. Le Van C',
        specialty: 'Dermatology',
        license: 'DERM-003',
        bio: 'Board-certified dermatologist treating all conditions of hair, skin, and nails.',
        fee: 40,
      },
      {
        email: 'dr.pham@clinic.local',
        name: 'Dr. Pham Thi D',
        specialty: 'Neurology',
        license: 'NEUR-004',
        bio: 'Expert in neurological disorders, specializing in migraine and epilepsy management.',
        fee: 60,
      },
      {
        email: 'dr.vu@clinic.local',
        name: 'Dr. Vu Dang E',
        specialty: 'Pediatrics',
        license: 'PED-005',
        bio: 'Compassionate pediatric care for infants to teens.',
        fee: 35,
      },
    ];

    const doctorIds: Record<string, string> = {};
    for (const d of doctors) {
      const uid = await createAccount(
        d.email,
        'Doctor@123',
        'doctor',
        { fullName: d.name },
        d,
      );
      const [docProfile] = await doctorsRepo.query(
        `SELECT id FROM doctors WHERE user_id = $1`,
        [uid],
      );
      doctorIds[d.email] = docProfile.id;
    }

    // 3. Create Patients
    const patients = [
      {
        email: 'patient@example.com',
        name: 'Nguyen Van Patient',
        phone: '0901234567',
        dob: '1990-01-15',
      },
      {
        email: 'patient2@example.com',
        name: 'Tran Thi Patient',
        phone: '0912345678',
        dob: '1985-05-20',
      },
      {
        email: 'patient3@example.com',
        name: 'Le Van Patient',
        phone: '0923456789',
        dob: '1995-10-10',
      },
    ];

    const patientIds: Record<string, string> = {};
    for (const p of patients) {
      const uid = await createAccount(p.email, 'Patient@123', 'patient', {
        fullName: p.name,
        phone: p.phone,
        dob: p.dob,
      });
      patientIds[p.email] = uid;
    }

    // 4. Generate Slots
    console.log('📅 Generating time slots for the next 7 days...');
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);
      const dayOfWeek = targetDate.getDay();

      // Skip Sundays (0)
      if (dayOfWeek === 0) continue;

      const dateStr = targetDate.toISOString().split('T')[0];

      for (const [email, docId] of Object.entries(doctorIds)) {
        // Different doctors have different schedules
        let times: string[] = [];
        if (email === 'dr.nguyen@clinic.local')
          times = ['09:00', '09:30', '10:00', '10:30', '14:00', '14:30'];
        if (email === 'dr.tran@clinic.local')
          times = ['08:00', '08:30', '09:00', '13:00', '13:30'];
        if (email === 'dr.le@clinic.local')
          times = ['10:00', '10:30', '11:00', '15:00', '15:30', '16:00'];
        if (email === 'dr.pham@clinic.local')
          times = ['09:00', '10:00', '11:00'];
        if (email === 'dr.vu@clinic.local')
          times = ['08:30', '09:30', '10:30', '14:30', '15:30'];

        for (const time of times) {
          const [startHour, startMin] = time.split(':').map(Number) as [
            number,
            number,
          ];
          const endMin = startMin + 30;
          const endHour = startHour + Math.floor(endMin / 60);
          const endTime = `${endHour.toString().padStart(2, '0')}:${(endMin % 60).toString().padStart(2, '0')}`;

          await slotsRepo.query(
            `INSERT INTO time_slots (doctor_id, slot_date, start_time, end_time, is_available) 
             VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
            [docId, dateStr, `${time}:00`, `${endTime}:00`, true],
          );
        }
      }
    }
    console.log('✅ Time slots generated.');

    // 5. Generate Bookings
    console.log('📝 Generating sample bookings...');

    const [allSlots] = await slotsRepo.query(
      `SELECT * FROM time_slots WHERE is_available = true LIMIT 50`,
    );

    if (Array.isArray(allSlots) && allSlots.length > 0) {
      console.log(`Found slots to book, length: ${allSlots.length}`);
    }

    // Wait, the above returns the array of rows if we use postgres directly, but TypeORM query returns raw array
    const rawSlots = await slotsRepo.query(
      `SELECT * FROM time_slots WHERE is_available = true`,
    );

    // Check if bookings already exist to avoid duplicating many bookings
    const [existingBookings] = await bookingsRepo.query(
      `SELECT COUNT(*) as count FROM appointments`,
    );
    if (
      parseInt(existingBookings?.count || '0', 10) === 0 &&
      rawSlots.length >= 10
    ) {
      const createBooking = async (
        slotIdx: number,
        pId: string,
        status: string,
        notes: string,
      ) => {
        const slot = rawSlots[slotIdx];
        if (!slot) return;

        const [booking] = await bookingsRepo.query(
          `INSERT INTO appointments (patient_id, doctor_id, slot_id, appointment_date, start_time, end_time, status, reason, clinical_notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
          [
            pId,
            slot.doctor_id,
            slot.id,
            slot.slot_date,
            slot.start_time,
            slot.end_time,
            status,
            'Routine checkup',
            notes,
          ],
        );

        await slotsRepo.query(
          `UPDATE time_slots SET is_available = false WHERE id = $1`,
          [slot.id],
        );
        return booking.id;
      };

      const p1 = patientIds['patient@example.com'] as string;
      const p2 = patientIds['patient2@example.com'] as string;
      const p3 = patientIds['patient3@example.com'] as string;

      // 2 pending
      await createBooking(0, p1, 'pending', '');
      await createBooking(1, p2, 'pending', '');
      // 2 confirmed
      await createBooking(2, p3, 'confirmed', '');
      await createBooking(3, p1, 'confirmed', '');
      // 1 in_progress
      await createBooking(
        4,
        p2,
        'in_progress',
        'Patient arrived and vitals taken.',
      );
      // 3 completed
      await createBooking(
        5,
        p1,
        'completed',
        'Prescribed antibiotics. Patient advised to rest.',
      );
      await createBooking(
        6,
        p2,
        'completed',
        'Normal checkup. Blood pressure slightly high.',
      );
      await createBooking(7, p3, 'completed', 'Follow up in 2 weeks.');
      // 1 cancelled
      await createBooking(8, p1, 'cancelled', '');
      // 1 no_show
      await createBooking(
        9,
        p2,
        'no_show',
        'Patient did not arrive 30 mins past appointment.',
      );

      console.log('✅ Generated 10 sample bookings across varied statuses.');
    } else {
      console.log(
        '⏭️  Bookings already exist or not enough slots, skipping booking generation.',
      );
    }

    console.log('\n🌟 Seed complete!');
    console.log('\nTest credentials (Role: Email / Password):');
    console.log('  Admin:   admin@clinic.local   / Admin@123');
    console.log('  Doctor:  dr.nguyen@clinic.local / Doctor@123');
    console.log('  Doctor:  dr.tran@clinic.local / Doctor@123');
    console.log('  Patient: patient@example.com  / Patient@123');
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
