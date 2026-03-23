import { Role } from '@/common/types/role.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

export class UserProfileResponseDto {
  @Expose()
  @ApiProperty()
  fullName: string;

  @Expose()
  @ApiPropertyOptional()
  phone?: string;

  @Expose()
  @ApiPropertyOptional()
  dateOfBirth?: Date;

  @Expose()
  @ApiPropertyOptional()
  gender?: string;

  @Expose()
  @ApiPropertyOptional()
  address?: string;
}

/**
 * Safe public representation of a User.
 * @Exclude() on class level ensures passwordHash and any
 * unlisted fields are NEVER serialized by ClassSerializerInterceptor.
 */
@Exclude()
export class UserResponseDto {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  email: string;

  @Expose()
  @ApiProperty({ enum: Role })
  role: Role;

  @Expose()
  @ApiProperty()
  isActive: boolean;

  @Expose()
  @ApiPropertyOptional({ type: () => UserProfileResponseDto })
  @Type(() => UserProfileResponseDto)
  profile?: UserProfileResponseDto | null;

  @Expose()
  @ApiProperty()
  createdAt: Date;

  // passwordHash is implicitly excluded by @Exclude() at class level
}
