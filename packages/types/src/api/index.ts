/**
 * Standard API response envelope.
 * All API responses follow this shape (see docs/1/02-system-architecture.md §9).
 */
export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

/**
 * Standard API error response.
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    statusCode: number;
  };
}

/**
 * Pagination metadata for list endpoints.
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
}

/**
 * Paginated response wrapper.
 */
export type PaginatedResponse<T> = ApiResponse<T[]>;
