import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import type { JwtPayload } from '@/common/types/jwt-payload.interface';
import { Role } from '@/common/types/role.enum';
import { FilesService } from '@/modules/files/files.service';
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller()
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('files')
  @Roles(Role.PATIENT)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  upload(
    @UploadedFile()
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
    @CurrentUser() actor: JwtPayload,
    @Request() req: { body: Record<string, string> },
  ) {
    return this.filesService.upload(
      file,
      actor.sub,
      req.body.appointmentId,
      req.body.description,
    );
  }

  @Get('files/me')
  @Roles(Role.PATIENT)
  findMyFiles(
    @CurrentUser() actor: JwtPayload,
    @Query('appointmentId') appointmentId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.filesService.findMyFiles(actor.sub, {
      appointmentId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('files/:id/url')
  getSignedUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.filesService.getSignedUrl(id, actor);
  }

  @Delete('files/:id')
  @Roles(Role.PATIENT, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  softDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.filesService.softDelete(id, actor);
  }

  @Get('patients/:patientId/files')
  @Roles(Role.DOCTOR, Role.ADMIN)
  findPatientFiles(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @CurrentUser() actor: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.filesService.findPatientFiles(patientId, actor, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
