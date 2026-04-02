import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDepartmentsTable1775100002000 implements MigrationInterface {
  name = 'CreateDepartmentsTable1775100002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "departments" (
        "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name"            VARCHAR(255) NOT NULL,
        "head_nurse_id"   UUID,
        "description"     TEXT,
        "is_active"       BOOLEAN NOT NULL DEFAULT true,
        "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "departments_name_unique" UNIQUE ("name")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_departments_active" ON "departments"("is_active") WHERE "is_active" = true`,
    );

    // head_nurse_id FK → users.id
    // Added here (not deferred) since users table already exists from P1.
    await queryRunner.query(`
      ALTER TABLE "departments"
        ADD CONSTRAINT "fk_departments_head_nurse"
          FOREIGN KEY ("head_nurse_id") REFERENCES "users"("id")
          ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "departments" DROP CONSTRAINT "fk_departments_head_nurse"`,
    );
    await queryRunner.query(`DROP INDEX "idx_departments_active"`);
    await queryRunner.query(`DROP TABLE "departments"`);
  }
}
