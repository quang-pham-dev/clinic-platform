import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAppointmentsTable1742500006000 implements MigrationInterface {
  name = 'CreateAppointmentsTable1742500006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "appointments" (
        "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "patient_id"  UUID NOT NULL,
        "doctor_id"   UUID NOT NULL,
        "slot_id"     UUID NOT NULL,
        "status"      "appointment_status" NOT NULL DEFAULT 'pending',
        "notes"       TEXT,
        "version"     INTEGER NOT NULL DEFAULT 1,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at"  TIMESTAMPTZ,
        CONSTRAINT "fk_appointments_patient"
          FOREIGN KEY ("patient_id") REFERENCES "users"("id"),
        CONSTRAINT "fk_appointments_doctor"
          FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id"),
        CONSTRAINT "fk_appointments_slot"
          FOREIGN KEY ("slot_id") REFERENCES "time_slots"("id"),
        CONSTRAINT "appointments_slot_unique"
          UNIQUE ("slot_id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_appointments_patient" ON "appointments"("patient_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_appointments_doctor" ON "appointments"("doctor_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_appointments_status" ON "appointments"("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_appointments_created_at" ON "appointments"("created_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_appointments_created_at"`);
    await queryRunner.query(`DROP INDEX "idx_appointments_status"`);
    await queryRunner.query(`DROP INDEX "idx_appointments_doctor"`);
    await queryRunner.query(`DROP INDEX "idx_appointments_patient"`);
    await queryRunner.query(`DROP TABLE "appointments"`);
  }
}
