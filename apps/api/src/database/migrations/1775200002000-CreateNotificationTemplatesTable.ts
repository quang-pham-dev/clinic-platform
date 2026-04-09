import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationTemplatesTable1775200002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification_templates (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type   VARCHAR(100) NOT NULL,
        channel      notification_channel NOT NULL,
        subject      VARCHAR(255),
        body         TEXT NOT NULL,
        is_active    BOOLEAN NOT NULL DEFAULT true,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT templates_event_channel_unique
          UNIQUE (event_type, channel)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_templates_event_active
        ON notification_templates(event_type, channel)
        WHERE is_active = true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_templates_event_active;`);
    await queryRunner.query(`DROP TABLE IF EXISTS notification_templates;`);
  }
}
