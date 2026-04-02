import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStaffProfilesTable1775100003000 implements MigrationInterface {
  name = 'CreateStaffProfilesTable1775100003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "staff_profiles" (
        "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"           UUID NOT NULL,
        "department_id"     UUID,
        "staff_role"        VARCHAR(50) NOT NULL,
        "employee_number"   VARCHAR(50),
        "hire_date"         DATE,
        "created_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_staff_profiles_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_staff_profiles_department"
          FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL,
        CONSTRAINT "staff_profiles_user_unique" UNIQUE ("user_id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_staff_profiles_department" ON "staff_profiles"("department_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_staff_profiles_role" ON "staff_profiles"("staff_role")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_staff_profiles_role"`);
    await queryRunner.query(`DROP INDEX "idx_staff_profiles_department"`);
    await queryRunner.query(`DROP TABLE "staff_profiles"`);
  }
}
