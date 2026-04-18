import { IsString } from 'class-validator';

export class SignConsentDto {
  @IsString()
  formType: string;

  @IsString()
  versionSigned: string;
}
