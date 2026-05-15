import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterTenantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  clinicName: string;

  @IsString()
  @Matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, {
    message:
      'slug must be lowercase alphanumeric with hyphens, start/end with alphanumeric',
  })
  @MinLength(3)
  @MaxLength(63)
  slug: string;

  @IsEmail()
  adminEmail: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  adminName: string;

  @IsIn(['basic', 'pro', 'enterprise'])
  plan: string;

  @IsIn(['monthly', 'annual'])
  billingCycle: string;
}
