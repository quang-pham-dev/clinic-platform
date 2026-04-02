import { TimeSlot } from './entities/time-slot.entity';
import { SlotsLookupController } from './slots-lookup.controller';
import { SlotsController } from './slots.controller';
import { SlotsService } from './slots.service';
import { DoctorsModule } from '@/modules/doctors/doctors.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([TimeSlot]), DoctorsModule],
  controllers: [SlotsController, SlotsLookupController],
  providers: [SlotsService],
  exports: [SlotsService],
})
export class SlotsModule {}
