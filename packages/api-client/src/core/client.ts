import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

export interface TokenPair {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface ApiError {
  code?: string;
  message: string;
  statusCode?: number;
}

export type ClientType = 'web' | 'mobile';

export interface ClientConfig {
  /** Base URL for all API requests (e.g., 'http://localhost:3000/api/v1') */
  baseUrl: string;
  /** Client type — determines how refresh tokens are transmitted. Default: 'web' */
  clientType?: ClientType;
  /** Function to retrieve the current access token from storage */
  getAccessToken: () => string | null;
  /** Function to retrieve the current refresh token. Only needed for mobile (web uses httpOnly cookies) */
  getRefreshToken?: () => string | null;
  /** Called when tokens are successfully refreshed */
  onTokenRefreshed: (
    accessToken: string,
    expiresIn: number,
    refreshToken?: string,
  ) => void;
  /** Called when authentication fails (e.g., redirect to login) */
  onAuthError: () => void;
  /** Optional custom error handler for all non-401 errors */
  onError?: (error: ApiError) => void;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * A typed HTTP client that automatically unwraps Axios responses.
 * Methods return the response body directly instead of AxiosResponse.
 */
export interface HttpClient {
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T>;
  put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T>;
  patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T>;
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
}

/**
 * Creates a configured HTTP client (Axios) with:
 * - Automatic Bearer token injection
 * - X-Client-Type header for dual-mode auth
 * - withCredentials for cookie transmission (web)
 * - 401 → token refresh → retry queue (scoped per instance, no shared state)
 * - Response unwrapping (returns `res.data` instead of `AxiosResponse`)
 * - Error normalization to `ApiError`
 */
export function createHttpClient(config: ClientConfig): HttpClient {
  const clientType: ClientType = config.clientType ?? 'web';

  const instance: AxiosInstance = axios.create({
    baseURL: config.baseUrl,
    timeout: config.timeout ?? 30_000,
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Type': clientType,
    },
    // Send cookies for cross-origin requests (required for httpOnly cookie on web)
    withCredentials: true,
  });

  // ── Refresh-token state (scoped to this closure — no shared globals) ──
  let isRefreshing = false;
  let refreshSubscribers: Array<(token: string) => void> = [];

  const subscribeTokenRefresh = (cb: (token: string) => void) => {
    refreshSubscribers.push(cb);
  };

  const notifySubscribers = (token: string) => {
    refreshSubscribers.forEach((cb) => cb(token));
    refreshSubscribers = [];
  };

  const resetRefreshState = () => {
    isRefreshing = false;
    refreshSubscribers = [];
  };

  instance.interceptors.request.use(
    (request: InternalAxiosRequestConfig) => {
      const token = config.getAccessToken();
      if (token) {
        request.headers.Authorization = `Bearer ${token}`;
      }
      return request;
    },
    (error) => Promise.reject(error),
  );

  // ── Response interceptor: unwrap + refresh + error normalization ───
  instance.interceptors.response.use(
    // Success: unwrap AxiosResponse → return response.data directly
    (response) => response.data,

    async (error) => {
      const originalRequest = error.config as AxiosRequestConfig & {
        _retry?: boolean;
      };

      // Handle 401: attempt token refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve) => {
            subscribeTokenRefresh((token: string) => {
              originalRequest.headers = originalRequest.headers ?? {};
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(instance(originalRequest));
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Build refresh request based on client type
          const refreshBody =
            clientType === 'mobile' && config.getRefreshToken
              ? { refreshToken: config.getRefreshToken() }
              : {}; // Web: empty body, cookie is auto-attached

          const { data } = await axios.post<{ data: TokenPair }>(
            `${config.baseUrl}/auth/refresh`,
            refreshBody,
            {
              timeout: 10_000,
              withCredentials: true,
              headers: { 'X-Client-Type': clientType },
            },
          );

          const tokens = data.data;
          config.onTokenRefreshed(
            tokens.accessToken,
            tokens.expiresIn,
            tokens.refreshToken,
          );
          notifySubscribers(tokens.accessToken);
          isRefreshing = false;

          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
          return instance(originalRequest);
        } catch (refreshError) {
          resetRefreshState();
          config.onAuthError();
          return Promise.reject(refreshError);
        }
      }

      // Normalize all other errors to ApiError
      const apiError: ApiError = {
        code: error.response?.data?.error?.code ?? error.response?.data?.code,
        message:
          error.response?.data?.error?.message ??
          error.response?.data?.message ??
          error.message,
        statusCode: error.response?.status,
      };

      config.onError?.(apiError);
      return Promise.reject(apiError);
    },
  );

  // Cast: interceptor changes runtime return type to match HttpClient
  return instance as unknown as HttpClient;
}
