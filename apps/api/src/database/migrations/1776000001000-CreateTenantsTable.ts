import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateTenantsTable1776000001000 implements MigrationInterface {
  name = 'CreateTenantsTable1776000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure public schema is targeted explicitly
    await queryRunner.createTable(
      new Table({
        schema: 'public',
        name: 'tenants',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '63',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'admin_email',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: `'pending'`,
          },
          {
            name: 'schema_name',
            type: 'varchar',
            length: '63',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'stripe_customer_id',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'plan',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: `'basic'`,
          },
          {
            name: 'provisioned_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'suspended_at',
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
      }),
      true,
    );

    await queryRunner.createIndex(
      'public.tenants',
      new TableIndex({
        name: 'idx_tenants_slug',
        columnNames: ['slug'],
      }),
    );
    await queryRunner.createIndex(
      'public.tenants',
      new TableIndex({
        name: 'idx_tenants_status',
        columnNames: ['status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('public.tenants', true, true, true);
  }
}
