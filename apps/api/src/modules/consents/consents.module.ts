import { AuthModule } from '@/modules/auth/auth.module';
import { ConsentsController } from '@/modules/consents/consents.controller';
import { ConsentsService } from '@/modules/consents/consents.service';
import { PatientConsent } from '@/modules/consents/entities/patient-consent.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([PatientConsent])],
  controllers: [ConsentsController],
  providers: [ConsentsService],
  exports: [ConsentsService],
})
export class ConsentsModule {}
