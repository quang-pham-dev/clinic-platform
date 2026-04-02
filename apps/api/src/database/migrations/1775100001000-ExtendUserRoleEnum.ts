import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendUserRoleEnum1775100001000 implements MigrationInterface {
  name = 'ExtendUserRoleEnum1775100001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL enum additions are forward-only (cannot be rolled back cleanly).
    // Using a DO block with IF NOT EXISTS guard for idempotency.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'head_nurse'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role'))
        THEN
          ALTER TYPE "user_role" ADD VALUE 'head_nurse';
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'nurse'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role'))
        THEN
          ALTER TYPE "user_role" ADD VALUE 'nurse';
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'receptionist'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role'))
        THEN
          ALTER TYPE "user_role" ADD VALUE 'receptionist';
        END IF;
      END $$
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values.
    // This migration is intentionally non-reversible.
    // To remove values, you must recreate the type (see docs/2/03-database-schema.md §1.1).
    console.warn(
      '⚠️  ExtendUserRoleEnum: Cannot remove enum values in PostgreSQL. Manual intervention required.',
    );
  }
}
