import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * L2: Create video_chat_messages table
 *
 * Persists in-call text chat messages during a video session.
 * Messages are retained for 90 days (archival policy — P5 concern).
 * All messages reference a video_session row; cascade delete on session drop.
 */
export class CreateVideoChatMessagesTable1775300002000 implements MigrationInterface {
  name = 'CreateVideoChatMessagesTable1775300002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "video_chat_messages" (
        "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
        "session_id"  UUID        NOT NULL,
        "sender_id"   UUID        NOT NULL,
        "message"     TEXT        NOT NULL,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "pk_video_chat_messages" PRIMARY KEY ("id"),
        CONSTRAINT "fk_video_chat_session"
          FOREIGN KEY ("session_id")
          REFERENCES "video_sessions"("id")
          ON DELETE CASCADE,
        CONSTRAINT "fk_video_chat_sender"
          FOREIGN KEY ("sender_id")
          REFERENCES "users"("id")
          ON DELETE CASCADE
      )
    `);

    // Index for fetching chat history for a session (ordered by created_at)
    await queryRunner.query(`
      CREATE INDEX "idx_video_chat_session_time"
        ON "video_chat_messages"("session_id", "created_at" ASC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_video_chat_session_time"`);
    await queryRunner.query(`DROP TABLE "video_chat_messages"`);
  }
}
