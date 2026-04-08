import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateShiftAuditLogsTable1775100007000 implements MigrationInterface {
  name = 'CreateShiftAuditLogsTable1775100007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "shift_audit_logs" (
        "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "assignment_id"     UUID NOT NULL,
        "actor_id"          UUID NOT NULL,
        "actor_role"        user_role NOT NULL,
        "from_status"       assignment_status,
        "to_status"         assignment_status NOT NULL,
        "reason"            TEXT,
        "metadata"          JSONB,
        "created_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_shift_audit_assignment"
          FOREIGN KEY ("assignment_id") REFERENCES "shift_assignments"("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_shift_audit_assignment" ON "shift_audit_logs"("assignment_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_shift_audit_created_at" ON "shift_audit_logs"("created_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_shift_audit_created_at"`);
    await queryRunner.query(`DROP INDEX "idx_shift_audit_assignment"`);
    await queryRunner.query(`DROP TABLE "shift_audit_logs"`);
  }
}
