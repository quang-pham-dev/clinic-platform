import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateShiftAssignmentsTable1775100006000 implements MigrationInterface {
  name = 'CreateShiftAssignmentsTable1775100006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the assignment_status enum
    await queryRunner.query(`
      CREATE TYPE "assignment_status" AS ENUM (
        'scheduled',
        'in_progress',
        'completed',
        'cancelled'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "shift_assignments" (
        "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "staff_id"        UUID NOT NULL,
        "template_id"     UUID NOT NULL,
        "department_id"   UUID NOT NULL,
        "shift_date"      DATE NOT NULL,
        "status"          assignment_status NOT NULL DEFAULT 'scheduled',
        "notes"           TEXT,
        "version"         INTEGER NOT NULL DEFAULT 1,
        "created_by"      UUID NOT NULL,
        "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at"      TIMESTAMPTZ,
        CONSTRAINT "fk_assignments_staff"
          FOREIGN KEY ("staff_id") REFERENCES "users"("id"),
        CONSTRAINT "fk_assignments_template"
          FOREIGN KEY ("template_id") REFERENCES "shift_templates"("id"),
        CONSTRAINT "fk_assignments_department"
          FOREIGN KEY ("department_id") REFERENCES "departments"("id"),
        CONSTRAINT "fk_assignments_created_by"
          FOREIGN KEY ("created_by") REFERENCES "users"("id"),
        CONSTRAINT "assignments_no_duplicate"
          UNIQUE ("staff_id", "shift_date", "template_id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_assignments_staff_date" ON "shift_assignments"("staff_id", "shift_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_assignments_dept_date" ON "shift_assignments"("department_id", "shift_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_assignments_status" ON "shift_assignments"("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_assignments_date" ON "shift_assignments"("shift_date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_assignments_date"`);
    await queryRunner.query(`DROP INDEX "idx_assignments_status"`);
    await queryRunner.query(`DROP INDEX "idx_assignments_dept_date"`);
    await queryRunner.query(`DROP INDEX "idx_assignments_staff_date"`);
    await queryRunner.query(`DROP TABLE "shift_assignments"`);
    await queryRunner.query(`DROP TYPE "assignment_status"`);
  }
}
