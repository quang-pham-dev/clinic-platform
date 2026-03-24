import { ErrorResponseDto } from '../dto/error-response.dto';
import { Type, applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiResponse,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';

/**
 * Standard generic response `{ data: T }` for endpoints returning a single resource.
 *
 * Mirrors the `ApiResponse<T>` interface from `@clinic-platform/types`.
 */
export const ApiDataResponse = <TModel extends Type<unknown>>(
  model: TModel,
  description = 'Successful operation',
  isArray = false,
  statusCode = 200,
) => {
  return applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status: statusCode,
      description,
      schema: {
        type: 'object',
        properties: {
          data: isArray
            ? {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              }
            : {
                $ref: getSchemaPath(model),
              },
        },
      },
    }),
  );
};

/**
 * Paginated response `{ data: T[], meta: { total, page, limit } }`.
 *
 * Mirrors the `PaginatedResponse<T>` type from `@clinic-platform/types`.
 */
export const ApiPaginatedResponse = <TModel extends Type<unknown>>(
  model: TModel,
  description = 'Successfully retrieved paginated list',
  statusCode = 200,
) => {
  return applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status: statusCode,
      description,
      schema: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(model) },
          },
          meta: {
            type: 'object',
            properties: {
              total: { type: 'number', example: 100 },
              page: { type: 'number', example: 1 },
              limit: { type: 'number', example: 20 },
            },
          },
        },
      },
    }),
  );
};

/**
 * Minimal generic response `{ data: boolean/string }` when not returning a complex object.
 */
export const ApiPrimitiveDataResponse = (
  type: string = 'boolean',
  description = 'Successful operation',
  statusCode = 200,
) => {
  return applyDecorators(
    ApiResponse({
      status: statusCode,
      description,
      schema: {
        type: 'object',
        properties: {
          data: {
            type,
          },
        },
      },
    }),
  );
};

/**
 * Standard error responses suitable for almost all endpoints.
 * Includes 400 (Bad Request) and 500 (Internal Server Error).
 */
export const ApiStandardResponses = () => {
  return applyDecorators(
    ApiBadRequestResponse({
      description: 'Bad Request / Validation Error',
      type: ErrorResponseDto,
    }),
    ApiInternalServerErrorResponse({
      description: 'Internal Server Error',
      type: ErrorResponseDto,
    }),
  );
};

/**
 * Standard authentication error responses for protected routes.
 * Includes 401 (Unauthorized) and 403 (Forbidden).
 */
export const ApiAuthResponses = () => {
  return applyDecorators(
    ApiUnauthorizedResponse({
      description: 'Unauthorized (Missing or invalid token)',
      type: ErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description: 'Forbidden (Insufficient role/permissions)',
      type: ErrorResponseDto,
    }),
  );
};
