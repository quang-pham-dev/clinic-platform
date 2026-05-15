import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateSubscriptionsTable1776000002000 implements MigrationInterface {
  name = 'CreateSubscriptionsTable1776000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        schema: 'public',
        name: 'subscriptions',
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
            name: 'stripe_subscription_id',
            type: 'varchar',
            length: '100',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'stripe_price_id',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'plan',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
            isNullable: false,
          },
          {
            name: 'current_period_start',
            type: 'timestamptz',
            isNullable: false,
          },
          {
            name: 'current_period_end',
            type: 'timestamptz',
            isNullable: false,
          },
          {
            name: 'cancel_at_period_end',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'trial_end',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'seats_doctors',
            type: 'integer',
            isNullable: false,
            default: 0,
          },
          {
            name: 'seats_staff',
            type: 'integer',
            isNullable: false,
            default: 0,
          },
          {
            name: 'bookings_limit',
            type: 'integer',
            isNullable: true,
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

    await queryRunner.createForeignKey(
      'public.subscriptions',
      new TableForeignKey({
        columnNames: ['tenant_id'],
        referencedSchema: 'public',
        referencedTableName: 'tenants',
        referencedColumnNames: ['id'],
      }),
    );

    await queryRunner.createIndex(
      'public.subscriptions',
      new TableIndex({
        name: 'idx_subscriptions_tenant',
        columnNames: ['tenant_id'],
      }),
    );
    await queryRunner.createIndex(
      'public.subscriptions',
      new TableIndex({
        name: 'idx_subscriptions_status',
        columnNames: ['status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('public.subscriptions', true, true, true);
  }
}
