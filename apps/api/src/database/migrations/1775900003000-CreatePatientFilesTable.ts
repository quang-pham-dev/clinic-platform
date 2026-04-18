import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreatePatientFilesTable1775900003000 implements MigrationInterface {
  name = 'CreatePatientFilesTable1775900003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'patient_files',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'patient_id', type: 'uuid', isNullable: false },
          { name: 'appointment_id', type: 'uuid', isNullable: true },
          {
            name: 'file_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          { name: 'file_size', type: 'integer', isNullable: false },
          {
            name: 'mime_type',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          { name: 's3_key', type: 'text', isNullable: false },
          { name: 'description', type: 'text', isNullable: true },
          {
            name: 'is_deleted',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          { name: 'deleted_at', type: 'timestamptz', isNullable: true },
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

    await queryRunner.createForeignKeys('patient_files', [
      new TableForeignKey({
        columnNames: ['patient_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
      }),
      new TableForeignKey({
        columnNames: ['appointment_id'],
        referencedTableName: 'appointments',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    ]);

    await queryRunner.createIndices('patient_files', [
      new TableIndex({
        name: 'idx_files_patient',
        columnNames: ['patient_id', 'created_at'],
        where: 'is_deleted = false',
      }),
      new TableIndex({
        name: 'idx_files_appointment',
        columnNames: ['appointment_id'],
        where: 'appointment_id IS NOT NULL AND is_deleted = false',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('patient_files', true, true, true);
  }
}
