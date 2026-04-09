import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class QueryNotificationsDto {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isRead?: boolean;

  @IsOptional()
  @IsString()
  before?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  limit?: number;
}
