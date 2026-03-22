import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBookingAuditLogsTable1742500007000 implements MigrationInterface {
  name = 'CreateBookingAuditLogsTable1742500007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "booking_audit_logs" (
        "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "appointment_id"   UUID NOT NULL,
        "actor_id"         UUID NOT NULL,
        "actor_role"       "user_role" NOT NULL,
        "from_status"      "appointment_status",
        "to_status"        "appointment_status" NOT NULL,
        "reason"           TEXT,
        "metadata"         JSONB,
        "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_audit_appointment"
          FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_audit_appointment" ON "booking_audit_logs"("appointment_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_actor" ON "booking_audit_logs"("actor_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_created_at" ON "booking_audit_logs"("created_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_audit_created_at"`);
    await queryRunner.query(`DROP INDEX "idx_audit_actor"`);
    await queryRunner.query(`DROP INDEX "idx_audit_appointment"`);
    await queryRunner.query(`DROP TABLE "booking_audit_logs"`);
  }
}
