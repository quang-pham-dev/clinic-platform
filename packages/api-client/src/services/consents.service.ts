import type { HttpClient } from '../core/client';
import type { ApiResponse, PaginatedResponse } from '@clinic-platform/types';

export interface PatientConsent {
  id: string;
  patientId: string;
  formType: string;
  versionSigned: string;
  signedAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  isCurrent?: boolean;
}

export interface CurrentConsentVersion {
  formType: string;
  currentVersion: string | null;
  strapiUrl: string;
}

export interface SignConsentRequest {
  formType: string;
  versionSigned: string;
}

export interface ConsentAdminQueryParams {
  patientId?: string;
  formType?: string;
  page?: number;
  limit?: number;
}

export interface ConsentsService {
  getMyConsents(): Promise<ApiResponse<PatientConsent[]>>;
  getCurrentVersion(
    formType: string,
  ): Promise<ApiResponse<CurrentConsentVersion>>;
  sign(dto: SignConsentRequest): Promise<ApiResponse<PatientConsent>>;
  getAllAdmin(
    params?: ConsentAdminQueryParams,
  ): Promise<PaginatedResponse<PatientConsent>>;
}

export function createConsentsService(http: HttpClient): ConsentsService {
  return {
    getMyConsents: () => http.get('/consents/me'),
    getCurrentVersion: (formType) =>
      http.get(`/consents/current-version/${formType}`),
    sign: (dto) => http.post('/consents', dto),
    getAllAdmin: (params) => http.get('/consents/admin', { params }),
  };
}
