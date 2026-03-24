import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiPropertyOptional({
    description:
      'Refresh token — required for mobile clients. Web clients use httpOnly cookie instead.',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class LogoutDto {
  @ApiPropertyOptional({
    description:
      'Refresh token — required for mobile clients. Web clients use httpOnly cookie instead.',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
