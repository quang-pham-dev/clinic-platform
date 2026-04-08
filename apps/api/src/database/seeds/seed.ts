import { SHIFT_PRESET_COLORS } from '@clinic-platform/types';
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
        name: 'Dr. Quang Pham',
        specialty: 'General Practice',
        license: 'GP-001',
        bio: '15 years of experience in general practice. Dedicated to holistic family care.',
        fee: 30,
      },
      {
        email: 'dr.tran@clinic.local',
        name: 'Dr. Sarah Brown',
        specialty: 'Cardiology',
        license: 'CARD-002',
        bio: 'Specialist in cardiovascular disease and echocardiography.',
        fee: 50,
      },
      {
        email: 'dr.le@clinic.local',
        name: 'Dr. Michael Chen',
        specialty: 'Dermatology',
        license: 'DERM-003',
        bio: 'Board-certified dermatologist treating all conditions of hair, skin, and nails.',
        fee: 40,
      },
      {
        email: 'dr.pham@clinic.local',
        name: 'Dr. Emily Davis',
        specialty: 'Neurology',
        license: 'NEUR-004',
        bio: 'Expert in neurological disorders, specializing in migraine and epilepsy management.',
        fee: 60,
      },
      {
        email: 'dr.vu@clinic.local',
        name: 'Dr. Robert Taylor',
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
        name: 'John Smith',
        phone: '555-0101',
        dob: '1990-01-15',
      },
      {
        email: 'patient2@example.com',
        name: 'Jane Doe',
        phone: '555-0102',
        dob: '1985-05-20',
      },
      {
        email: 'patient3@example.com',
        name: 'Bob Johnson',
        phone: '555-0103',
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
          `INSERT INTO appointments (patient_id, doctor_id, slot_id, status, notes)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [pId, slot.doctor_id, slot.id, status, notes || null],
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

    // ────────────────────────────────────────────────
    // P2: Departments
    // ────────────────────────────────────────────────
    const [existingDepts] = await dataSource.query(
      `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'departments'`,
    );
    if (parseInt(existingDepts?.count || '0', 10) > 0) {
      const [deptsCount] = await dataSource.query(
        `SELECT COUNT(*) as count FROM departments`,
      );
      if (parseInt(deptsCount?.count || '0', 10) === 0) {
        const departments = [
          {
            name: 'Emergency',
            description:
              'Handles urgent and life-threatening medical conditions.',
          },
          {
            name: 'General Ward',
            description: 'Inpatient care for general medical conditions.',
          },
          {
            name: 'Outpatient Clinic',
            description: 'Walk-in and scheduled consultations.',
          },
        ];

        const deptIds: Record<string, string> = {};
        for (const dept of departments) {
          const [row] = await dataSource.query(
            `INSERT INTO departments (name, description) VALUES ($1, $2) RETURNING id`,
            [dept.name, dept.description],
          );
          deptIds[dept.name] = row.id;
        }
        console.log(
          `✅ Created ${departments.length} departments: ${departments.map((d) => d.name).join(', ')}`,
        );

        // ────────────────────────────────────────────────
        // P2: Staff users + profiles
        // ────────────────────────────────────────────────
        const staffMembers = [
          {
            email: 'headnurse@clinic.local',
            password: 'HeadNurse@123',
            role: 'head_nurse',
            fullName: 'Mary Johnson',
            phone: '555-0101',
            department: 'Emergency',
            employeeNumber: 'HN-001',
          },
          {
            email: 'nurse1@clinic.local',
            password: 'Nurse@123',
            role: 'nurse',
            fullName: 'Lisa Anderson',
            phone: '555-0102',
            department: 'Emergency',
            employeeNumber: 'NRS-001',
          },
          {
            email: 'nurse2@clinic.local',
            password: 'Nurse@123',
            role: 'nurse',
            fullName: 'David Martinez',
            phone: '555-0103',
            department: 'General Ward',
            employeeNumber: 'NRS-002',
          },
          {
            email: 'receptionist1@clinic.local',
            password: 'Recept@123',
            role: 'receptionist',
            fullName: 'Karen White',
            phone: '555-0104',
            department: 'Outpatient Clinic',
            employeeNumber: 'RCP-001',
          },
          {
            email: 'nurse3@clinic.local',
            password: 'Nurse@123',
            role: 'nurse',
            fullName: 'Kevin Lee',
            phone: '555-0105',
            department: 'General Ward',
            employeeNumber: 'NRS-003',
          },
        ];

        const SALT_ROUNDS = 12;
        for (const staff of staffMembers) {
          const hash = await bcrypt.hash(staff.password, SALT_ROUNDS);

          // Create user
          const [user] = await dataSource.query(
            `INSERT INTO users (email, password_hash, role)
             VALUES ($1, $2, $3::user_role) RETURNING id`,
            [staff.email, hash, staff.role],
          );

          // Create user profile
          await dataSource.query(
            `INSERT INTO user_profiles (user_id, full_name, phone) VALUES ($1, $2, $3)`,
            [user.id, staff.fullName, staff.phone],
          );

          // Create staff profile
          await dataSource.query(
            `INSERT INTO staff_profiles (user_id, department_id, staff_role, employee_number, hire_date)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              user.id,
              deptIds[staff.department],
              staff.role,
              staff.employeeNumber,
              '2025-01-15',
            ],
          );
        }

        // Set head nurse for Emergency department
        const [headNurseUser] = await dataSource.query(
          `SELECT id FROM users WHERE email = 'headnurse@clinic.local'`,
        );
        if (headNurseUser) {
          await dataSource.query(
            `UPDATE departments SET head_nurse_id = $1 WHERE name = 'Emergency'`,
            [headNurseUser.id],
          );
        }

        console.log(`✅ Created ${staffMembers.length} staff members.`);
      } else {
        console.log('⏭️  Departments already exist, skipping P2 seed.');
      }
    } else {
      console.log('⏭️  departments table not found — run P2 migrations first.');
    }

    // ────────────────────────────────────────────────
    // P2: Shift Templates + Sample Assignments
    // ────────────────────────────────────────────────
    const [shiftTablesExist] = await dataSource.query(
      `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'shift_templates'`,
    );
    if (parseInt(shiftTablesExist?.count || '0', 10) > 0) {
      const [templatesCount] = await dataSource.query(
        `SELECT COUNT(*) as count FROM shift_templates`,
      );
      if (parseInt(templatesCount?.count || '0', 10) === 0) {
        const templates = [
          {
            name: 'Morning',
            startTime: '07:00:00',
            endTime: '15:00:00',
            colorHex: SHIFT_PRESET_COLORS[0],
          },
          {
            name: 'Afternoon',
            startTime: '15:00:00',
            endTime: '23:00:00',
            colorHex: SHIFT_PRESET_COLORS[1],
          },
          {
            name: 'Night',
            startTime: '23:00:00',
            endTime: '07:00:00',
            colorHex: SHIFT_PRESET_COLORS[2],
          },
          {
            name: 'On-call',
            startTime: '00:00:00',
            endTime: '23:59:00',
            colorHex: SHIFT_PRESET_COLORS[3],
          },
        ];

        const templateIds: Record<string, string> = {};
        for (const t of templates) {
          const [row] = await dataSource.query(
            `INSERT INTO shift_templates (name, start_time, end_time, color_hex) VALUES ($1, $2, $3, $4) RETURNING id`,
            [t.name, t.startTime, t.endTime, t.colorHex],
          );
          templateIds[t.name] = row.id;
        }
        console.log(
          `✅ Created ${templates.length} shift templates: ${templates.map((t) => t.name).join(', ')}`,
        );

        // Create sample shift assignments for the next 7 days
        const [assignmentsExist] = await dataSource.query(
          `SELECT COUNT(*) as count FROM shift_assignments`,
        );
        if (parseInt(assignmentsExist?.count || '0', 10) === 0) {
          // Get staff user IDs + their department IDs
          const staffRows = await dataSource.query(
            `SELECT sp.user_id as "userId", sp.department_id as "departmentId"
             FROM staff_profiles sp
             JOIN users u ON u.id = sp.user_id
             WHERE u.is_active = true
             LIMIT 5`,
          );

          // Get admin ID for created_by
          const [adminRow] = await dataSource.query(
            `SELECT id FROM users WHERE email = 'admin@clinic.local'`,
          );
          const adminId = adminRow?.id;

          if (staffRows.length > 0 && adminId) {
            const shiftToday = new Date();
            let assignmentCount = 0;

            const templateNames = ['Morning', 'Afternoon', 'Night'];

            for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
              const d = new Date(shiftToday);
              d.setDate(shiftToday.getDate() + dayOffset);
              if (d.getDay() === 0) continue; // skip Sunday
              const dateStr = d.toISOString().split('T')[0];

              for (let i = 0; i < staffRows.length; i++) {
                const staff = staffRows[i];
                const templateName = templateNames[i % templateNames.length]!;
                const tplId = templateIds[templateName];

                if (!staff || !tplId || !staff.departmentId) continue;

                try {
                  await dataSource.query(
                    `INSERT INTO shift_assignments (staff_id, template_id, department_id, shift_date, status, created_by)
                     VALUES ($1, $2, $3, $4, 'scheduled', $5)
                     ON CONFLICT DO NOTHING`,
                    [staff.userId, tplId, staff.departmentId, dateStr, adminId],
                  );
                  assignmentCount++;
                } catch {
                  // ignore duplicates
                }
              }
            }
            console.log(
              `✅ Created ~${assignmentCount} sample shift assignments.`,
            );
          }
        }
      } else {
        console.log('⏭️  Shift templates already exist, skipping.');
      }
    } else {
      console.log(
        '⏭️  shift_templates table not found — run H migrations first.',
      );
    }

    console.log('\n🌟 Seed complete!');
    console.log('\nTest credentials (Role: Email / Password):');
    console.log('  Admin:        admin@clinic.local       / Admin@123');
    console.log('  Doctor:       dr.nguyen@clinic.local   / Doctor@123');
    console.log('  Doctor:       dr.tran@clinic.local     / Doctor@123');
    console.log('  Patient:      patient@example.com      / Patient@123');
    console.log('  Head Nurse:   headnurse@clinic.local   / HeadNurse@123');
    console.log('  Nurse:        nurse1@clinic.local      / Nurse@123');
    console.log('  Receptionist: receptionist1@clinic.local / Recept@123');
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
