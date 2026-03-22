import { BookingStateMachine } from './booking-state-machine';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { Appointment } from './entities/appointment.entity';
import { BookingAuditLog } from './entities/booking-audit-log.entity';
import { DoctorsModule } from '@/modules/doctors/doctors.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, BookingAuditLog]),
    DoctorsModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService, BookingStateMachine],
})
export class BookingsModule {}
