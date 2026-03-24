import type { ApiErrorResponse } from '@clinic-platform/types';
import { ApiProperty } from '@nestjs/swagger';

export class ErrorDetailDto {
  @ApiProperty({
    example: 'VALIDATION_ERROR',
    description: 'A machine-readable error code',
  })
  code: string;

  @ApiProperty({
    example: 'Invalid input data',
    description: 'A human-readable error message',
  })
  message: string;

  @ApiProperty({ example: 400, description: 'The HTTP status code' })
  statusCode: number;
}

/**
 * Swagger-friendly class that implements ApiErrorResponse from shared types.
 * NestJS Swagger needs classes with @ApiProperty; plain interfaces are not enough.
 */
export class ErrorResponseDto implements ApiErrorResponse {
  @ApiProperty({ type: () => ErrorDetailDto })
  error: ErrorDetailDto;
}
