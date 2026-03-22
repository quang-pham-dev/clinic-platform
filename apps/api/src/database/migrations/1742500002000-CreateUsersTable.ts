import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1742500002000 implements MigrationInterface {
  name = 'CreateUsersTable1742500002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "email"         VARCHAR(255) NOT NULL,
        "password_hash" VARCHAR(255) NOT NULL,
        "role"          "user_role" NOT NULL DEFAULT 'patient',
        "is_active"     BOOLEAN NOT NULL DEFAULT true,
        "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at"    TIMESTAMPTZ,
        CONSTRAINT "users_email_unique" UNIQUE ("email")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_users_email" ON "users"("email")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_users_role" ON "users"("role")`);
    await queryRunner.query(
      `CREATE INDEX "idx_users_active" ON "users"("is_active") WHERE "is_active" = true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_users_active"`);
    await queryRunner.query(`DROP INDEX "idx_users_role"`);
    await queryRunner.query(`DROP INDEX "idx_users_email"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
