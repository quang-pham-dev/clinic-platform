import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBroadcastMessagesTable1775100010000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS broadcast_messages (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_id       UUID NOT NULL,
        sender_role     user_role NOT NULL,
        target_room     VARCHAR(100) NOT NULL,
        message         TEXT NOT NULL,
        sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT fk_broadcast_sender
          FOREIGN KEY (sender_id) REFERENCES users(id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_broadcast_sent_at
        ON broadcast_messages(sent_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_broadcast_room
        ON broadcast_messages(target_room, sent_at DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_broadcast_room;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_broadcast_sent_at;`);
    await queryRunner.query(`DROP TABLE IF EXISTS broadcast_messages;`);
  }
}
