import { PatientFileStorageService } from '@/modules/files/storage/patient-file-storage.service';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [PatientFileStorageService],
  exports: [PatientFileStorageService],
})
export class FilesStorageModule {}
