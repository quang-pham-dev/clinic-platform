import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCmsSyncLogsTable1775900005000 implements MigrationInterface {
  name = 'CreateCmsSyncLogsTable1775900005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'cms_sync_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'event_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'content_type',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          { name: 'entry_id', type: 'integer', isNullable: false },
          { name: 'payload', type: 'jsonb', isNullable: true },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'received'",
          },
          { name: 'error_message', type: 'text', isNullable: true },
          { name: 'processed_at', type: 'timestamptz', isNullable: true },
          {
            name: 'created_at',
            type: 'timestamptz',
            isNullable: false,
            default: 'NOW()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndices('cms_sync_logs', [
      new TableIndex({
        name: 'idx_cms_sync_content',
        columnNames: ['content_type', 'created_at'],
      }),
      new TableIndex({
        name: 'idx_cms_sync_status',
        columnNames: ['status', 'created_at'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('cms_sync_logs', true, true, true);
  }
}
