import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import type { JwtPayload } from '@/common/types/jwt-payload.interface';
import { Role } from '@/common/types/role.enum';
import { ConsentsService } from '@/modules/consents/consents.service';
import { SignConsentDto } from '@/modules/consents/dto/sign-consent.dto';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
} from '@nestjs/common';

@Controller('consents')
export class ConsentsController {
  constructor(private readonly consentsService: ConsentsService) {}

  @Post()
  @Roles(Role.PATIENT)
  sign(
    @Body() dto: SignConsentDto,
    @CurrentUser() actor: JwtPayload,
    @Request()
    req: {
      ip: string;
      headers: Record<string, string>;
    },
  ) {
    return this.consentsService.sign(
      dto,
      actor.sub,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get('me')
  @Roles(Role.PATIENT)
  findMyConsents(@CurrentUser() actor: JwtPayload) {
    return this.consentsService.findMyConsents(actor.sub);
  }

  @Get('current-version/:formType')
  getCurrentVersion(@Param('formType') formType: string) {
    return this.consentsService.getCurrentVersionInfo(formType);
  }

  @Get('admin')
  @Roles(Role.ADMIN)
  findAllAdmin(
    @Query('patientId') patientId?: string,
    @Query('formType') formType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.consentsService.findAllAdmin({
      patientId,
      formType,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
