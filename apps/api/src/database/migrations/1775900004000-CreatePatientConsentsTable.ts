import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreatePatientConsentsTable1775900004000 implements MigrationInterface {
  name = 'CreatePatientConsentsTable1775900004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'patient_consents',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'patient_id', type: 'uuid', isNullable: false },
          {
            name: 'form_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'version_signed',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'signed_at',
            type: 'timestamptz',
            isNullable: false,
            default: 'NOW()',
          },
          { name: 'ip_address', type: 'inet', isNullable: true },
          { name: 'user_agent', type: 'text', isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'patient_consents',
      new TableForeignKey({
        columnNames: ['patient_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
      }),
    );

    await queryRunner.createIndex(
      'patient_consents',
      new TableIndex({
        name: 'idx_consents_patient_type',
        columnNames: ['patient_id', 'form_type', 'signed_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('patient_consents', true, true, true);
  }
}
