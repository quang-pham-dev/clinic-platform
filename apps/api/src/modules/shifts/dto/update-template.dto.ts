import { CreateTemplateDto } from './create-template.dto';
import { PartialType } from '@nestjs/swagger';

export class UpdateTemplateDto extends PartialType(CreateTemplateDto) {}
