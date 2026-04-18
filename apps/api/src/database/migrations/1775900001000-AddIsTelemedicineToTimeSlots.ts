import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class AddIsTelemedicineToTimeSlots1775900001000 implements MigrationInterface {
  name = 'AddIsTelemedicineToTimeSlots1775900001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'time_slots',
      new TableColumn({
        name: 'is_telemedicine',
        type: 'boolean',
        isNullable: false,
        default: false,
      }),
    );

    await queryRunner.createIndex(
      'time_slots',
      new TableIndex({
        name: 'idx_slots_telemedicine',
        columnNames: ['is_telemedicine'],
        where: 'is_telemedicine = true',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('time_slots', 'idx_slots_telemedicine');
    await queryRunner.dropColumn('time_slots', 'is_telemedicine');
  }
}
