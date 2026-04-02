import { UsersModule } from '../users/users.module';
import { StaffProfile } from './entities/staff-profile.entity';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([StaffProfile]), UsersModule],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
