import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEnums1742500001000 implements MigrationInterface {
  name = 'CreateEnums1742500001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "user_role" AS ENUM ('patient', 'doctor', 'admin')
    `);

    await queryRunner.query(`
      CREATE TYPE "appointment_status" AS ENUM (
        'pending',
        'confirmed',
        'in_progress',
        'completed',
        'cancelled',
        'no_show'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TYPE "appointment_status"`);
    await queryRunner.query(`DROP TYPE "user_role"`);
  }
}
