import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateUsageSnapshotsTable1776000005000 implements MigrationInterface {
  name = 'CreateUsageSnapshotsTable1776000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        schema: 'public',
        name: 'usage_snapshots',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          {
            name: 'period_start',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'period_end',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'bookings_count',
            type: 'integer',
            isNullable: false,
            default: 0,
          },
          {
            name: 'doctors_count',
            type: 'integer',
            isNullable: false,
            default: 0,
          },
          {
            name: 'staff_count',
            type: 'integer',
            isNullable: false,
            default: 0,
          },
          {
            name: 'active_patients',
            type: 'integer',
            isNullable: false,
            default: 0,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            isNullable: false,
            default: 'NOW()',
          },
        ],
        uniques: [
          {
            name: 'uq_usage_snapshots_tenant_period',
            columnNames: ['tenant_id', 'period_start'],
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'public.usage_snapshots',
      new TableForeignKey({
        columnNames: ['tenant_id'],
        referencedSchema: 'public',
        referencedTableName: 'tenants',
        referencedColumnNames: ['id'],
      }),
    );

    await queryRunner.createIndex(
      'public.usage_snapshots',
      new TableIndex({
        name: 'idx_usage_tenant_period',
        columnNames: ['tenant_id', 'period_start'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('public.usage_snapshots', true, true, true);
  }
}
