import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddMissingAppointmentColumns1775876443000 implements MigrationInterface {
  name = 'AddMissingAppointmentColumns1775876443000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('appointments', [
      new TableColumn({
        name: 'video_session_id',
        type: 'uuid',
        isNullable: true,
      }),
      new TableColumn({
        name: 'email_reminder_job_id',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
      new TableColumn({
        name: 'sms_reminder_job_id',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    ]);

    await queryRunner.createForeignKey(
      'appointments',
      new TableForeignKey({
        columnNames: ['video_session_id'],
        referencedTableName: 'video_sessions',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('appointments');
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('video_session_id') !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('appointments', foreignKey);
    }
    await queryRunner.dropColumns('appointments', [
      'video_session_id',
      'email_reminder_job_id',
      'sms_reminder_job_id',
    ]);
  }
}
