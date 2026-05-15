import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateFeatureFlagsTable1776000003000 implements MigrationInterface {
  name = 'CreateFeatureFlagsTable1776000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        schema: 'public',
        name: 'feature_flags',
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
            name: 'feature',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'enabled',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'source',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: `'plan'`,
          },
          {
            name: 'overridden_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'expires_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            isNullable: false,
            default: 'NOW()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            isNullable: false,
            default: 'NOW()',
          },
        ],
        uniques: [
          {
            name: 'uq_feature_flags_tenant_feature',
            columnNames: ['tenant_id', 'feature'],
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'public.feature_flags',
      new TableForeignKey({
        columnNames: ['tenant_id'],
        referencedSchema: 'public',
        referencedTableName: 'tenants',
        referencedColumnNames: ['id'],
      }),
    );

    await queryRunner.createIndex(
      'public.feature_flags',
      new TableIndex({
        name: 'idx_feature_flags_tenant',
        columnNames: ['tenant_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('public.feature_flags', true, true, true);
  }
}
