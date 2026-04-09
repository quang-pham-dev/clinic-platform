import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationEnums1775200001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE notification_channel AS ENUM (
        'email',
        'sms',
        'in_app'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE notification_status AS ENUM (
        'queued',
        'sent',
        'delivered',
        'failed',
        'unread',
        'read'
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TYPE IF EXISTS notification_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS notification_channel;`);
  }
}
