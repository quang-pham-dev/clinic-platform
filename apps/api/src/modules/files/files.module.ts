import { PatientFile } from '@/modules/files/entities/patient-file.entity';
import { FilesController } from '@/modules/files/files.controller';
import { FilesService } from '@/modules/files/files.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([PatientFile])],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
