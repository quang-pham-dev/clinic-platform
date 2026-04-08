import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShiftIdToTimeSlots1775100009000 implements MigrationInterface {
  name = 'AddShiftIdToTimeSlots1775100009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "time_slots"
        ADD COLUMN "shift_assignment_id" UUID,
        ADD CONSTRAINT "fk_time_slots_shift"
          FOREIGN KEY ("shift_assignment_id")
          REFERENCES "shift_assignments"("id")
          ON DELETE SET NULL
    `);

    // Partial index — only index rows that have a shift link
    await queryRunner.query(`
      CREATE INDEX "idx_time_slots_shift" ON "time_slots"("shift_assignment_id")
        WHERE "shift_assignment_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_time_slots_shift"`);
    await queryRunner.query(
      `ALTER TABLE "time_slots" DROP CONSTRAINT "fk_time_slots_shift"`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_slots" DROP COLUMN "shift_assignment_id"`,
    );
  }
}
