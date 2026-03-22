import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTimeSlotsTable1742500005000 implements MigrationInterface {
  name = 'CreateTimeSlotsTable1742500005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "time_slots" (
        "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "doctor_id"   UUID NOT NULL,
        "slot_date"   DATE NOT NULL,
        "start_time"  TIME NOT NULL,
        "end_time"    TIME NOT NULL,
        "is_available" BOOLEAN NOT NULL DEFAULT true,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_time_slots_doctor"
          FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE,
        CONSTRAINT "time_slots_no_overlap"
          UNIQUE ("doctor_id", "slot_date", "start_time")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_time_slots_doctor_date" ON "time_slots"("doctor_id", "slot_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_time_slots_available" ON "time_slots"("doctor_id", "slot_date", "is_available") WHERE "is_available" = true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_time_slots_available"`);
    await queryRunner.query(`DROP INDEX "idx_time_slots_doctor_date"`);
    await queryRunner.query(`DROP TABLE "time_slots"`);
  }
}
