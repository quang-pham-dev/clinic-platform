import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDoctorsTable1742500004000 implements MigrationInterface {
  name = 'CreateDoctorsTable1742500004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "doctors" (
        "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"               UUID NOT NULL,
        "specialty"             VARCHAR(255) NOT NULL,
        "license_number"        VARCHAR(100),
        "bio"                   TEXT,
        "consultation_fee"      DECIMAL(10, 2),
        "is_accepting_patients" BOOLEAN NOT NULL DEFAULT true,
        "created_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_doctors_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "doctors_user_unique" UNIQUE ("user_id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_doctors_specialty" ON "doctors"("specialty")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_doctors_accepting" ON "doctors"("is_accepting_patients") WHERE "is_accepting_patients" = true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_doctors_accepting"`);
    await queryRunner.query(`DROP INDEX "idx_doctors_specialty"`);
    await queryRunner.query(`DROP TABLE "doctors"`);
  }
}
