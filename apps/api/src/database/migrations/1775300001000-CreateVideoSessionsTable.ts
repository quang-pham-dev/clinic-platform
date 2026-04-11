import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * L1: Create video_sessions table
 *
 * Each row represents one telemedicine call attempt, linked to a confirmed appointment.
 * The room_id is a unique UUID used as the signaling room identifier.
 *
 * Status lifecycle: waiting → active → ended | missed | failed
 * (Managed by VideoSessionStateMachine)
 */
export class CreateVideoSessionsTable1775300001000 implements MigrationInterface {
  name = 'CreateVideoSessionsTable1775300001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create video_session_status enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "video_session_status" AS ENUM (
          'waiting',
          'active',
          'ended',
          'missed',
          'failed'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE "video_sessions" (
        "id"              UUID          NOT NULL DEFAULT gen_random_uuid(),
        "appointment_id"  UUID          NOT NULL UNIQUE,
        "room_id"         UUID          NOT NULL UNIQUE DEFAULT gen_random_uuid(),
        "doctor_user_id"  UUID          NOT NULL,
        "patient_user_id" UUID          NOT NULL,
        "status"          "video_session_status" NOT NULL DEFAULT 'waiting',
        "timeout_job_id"  VARCHAR(255),
        "started_at"      TIMESTAMPTZ,
        "ended_at"        TIMESTAMPTZ,
        "created_at"      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "updated_at"      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        CONSTRAINT "pk_video_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "fk_video_sessions_appointment"
          FOREIGN KEY ("appointment_id")
          REFERENCES "appointments"("id")
          ON DELETE CASCADE,
        CONSTRAINT "fk_video_sessions_doctor"
          FOREIGN KEY ("doctor_user_id")
          REFERENCES "users"("id")
          ON DELETE CASCADE,
        CONSTRAINT "fk_video_sessions_patient"
          FOREIGN KEY ("patient_user_id")
          REFERENCES "users"("id")
          ON DELETE CASCADE
      )
    `);

    // Index for looking up session by appointment
    await queryRunner.query(`
      CREATE INDEX "idx_video_sessions_appointment"
        ON "video_sessions"("appointment_id")
    `);

    // Index for filtering by status (e.g. find all waiting sessions)
    await queryRunner.query(`
      CREATE INDEX "idx_video_sessions_status"
        ON "video_sessions"("status")
        WHERE "status" IN ('waiting', 'active')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_video_sessions_status"`);
    await queryRunner.query(`DROP INDEX "idx_video_sessions_appointment"`);
    await queryRunner.query(`DROP TABLE "video_sessions"`);
    await queryRunner.query(`DROP TYPE "video_session_status"`);
  }
}
