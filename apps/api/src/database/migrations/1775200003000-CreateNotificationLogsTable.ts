import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationLogsTable1775200003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification_logs (
        id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id            UUID NOT NULL,
        channel            notification_channel NOT NULL,
        event_type         VARCHAR(100) NOT NULL,
        status             notification_status NOT NULL DEFAULT 'queued',
        reference_id       UUID,
        reference_type     VARCHAR(50),
        subject            TEXT,
        body_preview       TEXT,
        error_message      TEXT,
        bull_job_id        VARCHAR(255),
        is_read            BOOLEAN NOT NULL DEFAULT false,
        read_at            TIMESTAMPTZ,
        sent_at            TIMESTAMPTZ,
        created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT fk_notif_log_user
          FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notif_user_unread
        ON notification_logs(user_id, is_read, created_at DESC)
        WHERE is_read = false AND channel = 'in_app';
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notif_user_feed
        ON notification_logs(user_id, created_at DESC)
        WHERE channel = 'in_app';
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notif_status
        ON notification_logs(status, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notif_reference
        ON notification_logs(reference_id)
        WHERE reference_id IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notif_reference;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notif_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notif_user_feed;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notif_user_unread;`);
    await queryRunner.query(`DROP TABLE IF EXISTS notification_logs;`);
  }
}
