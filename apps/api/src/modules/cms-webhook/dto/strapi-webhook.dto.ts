import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class StrapiWebhookDto {
  @IsString()
  @IsIn([
    'entry.publish',
    'entry.update',
    'entry.unpublish',
    'entry.create',
    'entry.delete',
  ])
  event: string;

  @IsString()
  model: string;

  @IsString()
  @IsOptional()
  uid?: string;

  @IsObject()
  entry: {
    id: number;
    doctor_id?: string;
    doctorId?: string;
    slug?: string;
    form_type?: string;
    formType?: string;
    version?: string;
    [key: string]: unknown;
  };

  @IsString()
  @IsOptional()
  createdAt?: string;
}
