import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserProfilesTable1742500003000 implements MigrationInterface {
  name = 'CreateUserProfilesTable1742500003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_profiles" (
        "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"       UUID NOT NULL,
        "full_name"     VARCHAR(255) NOT NULL,
        "phone"         VARCHAR(20),
        "date_of_birth" DATE,
        "gender"        VARCHAR(20),
        "address"       TEXT,
        "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_user_profiles_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "user_profiles_user_unique" UNIQUE ("user_id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_user_profiles_user_id" ON "user_profiles"("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_user_profiles_user_id"`);
    await queryRunner.query(`DROP TABLE "user_profiles"`);
  }
}
