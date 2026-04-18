import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateMedicalRecordsTable1775900002000 implements MigrationInterface {
  name = 'CreateMedicalRecordsTable1775900002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'medical_records',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'appointment_id', type: 'uuid', isNullable: false },
          { name: 'patient_id', type: 'uuid', isNullable: false },
          { name: 'doctor_id', type: 'uuid', isNullable: false },
          { name: 'diagnosis', type: 'text', isNullable: true },
          { name: 'prescription', type: 'text', isNullable: true },
          { name: 'notes', type: 'text', isNullable: true },
          { name: 'follow_up_date', type: 'date', isNullable: true },
          {
            name: 'is_visible_to_patient',
            type: 'boolean',
            isNullable: false,
            default: true,
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
        uniques: [{ columnNames: ['appointment_id'] }],
      }),
      true,
    );

    await queryRunner.createForeignKeys('medical_records', [
      new TableForeignKey({
        columnNames: ['appointment_id'],
        referencedTableName: 'appointments',
        referencedColumnNames: ['id'],
      }),
      new TableForeignKey({
        columnNames: ['patient_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
      }),
      new TableForeignKey({
        columnNames: ['doctor_id'],
        referencedTableName: 'doctors',
        referencedColumnNames: ['id'],
      }),
    ]);

    await queryRunner.createIndices('medical_records', [
      new TableIndex({
        name: 'idx_records_patient',
        columnNames: ['patient_id', 'created_at'],
      }),
      new TableIndex({
        name: 'idx_records_doctor',
        columnNames: ['doctor_id'],
      }),
      new TableIndex({
        name: 'idx_records_appointment',
        columnNames: ['appointment_id'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('medical_records', true, true, true);
  }
}
