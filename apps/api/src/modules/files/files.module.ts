import { PatientFile } from '@/modules/files/entities/patient-file.entity';
import { FilesController } from '@/modules/files/files.controller';
import { FilesService } from '@/modules/files/files.service';
import { FilesStorageModule } from '@/modules/files/storage/files-storage.module';
import { QueueModule } from '@/modules/queue/queue.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    FilesStorageModule,
    QueueModule,
    TypeOrmModule.forFeature([PatientFile]),
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
