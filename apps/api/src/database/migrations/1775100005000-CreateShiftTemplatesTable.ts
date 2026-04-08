import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateShiftTemplatesTable1775100005000 implements MigrationInterface {
  name = 'CreateShiftTemplatesTable1775100005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "shift_templates" (
        "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name"        VARCHAR(100) NOT NULL,
        "start_time"  TIME NOT NULL,
        "end_time"    TIME NOT NULL,
        "color_hex"   CHAR(7) NOT NULL DEFAULT '#4A90D9',
        "is_active"   BOOLEAN NOT NULL DEFAULT true,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "shift_templates_name_unique" UNIQUE ("name")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "shift_templates"`);
  }
}
