import { Appointment } from '@/modules/bookings/entities/appointment.entity';
import { Doctor } from '@/modules/doctors/entities/doctor.entity';
import { MedicalRecord } from '@/modules/medical-records/entities/medical-record.entity';
import { MedicalRecordsController } from '@/modules/medical-records/medical-records.controller';
import { MedicalRecordsService } from '@/modules/medical-records/medical-records.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([MedicalRecord, Appointment, Doctor])],
  controllers: [MedicalRecordsController],
  providers: [MedicalRecordsService],
  exports: [MedicalRecordsService],
})
export class MedicalRecordsModule {}
