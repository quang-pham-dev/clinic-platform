import type { HttpClient } from '../core/client';
import type { ApiResponse, PaginatedResponse } from '@clinic-platform/types';

export interface MedicalRecordQueryParams {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
}

export interface MedicalRecord {
  id: string;
  appointmentId?: string;
  diagnosis?: string;
  prescription?: string;
  notes?: string;
  followUpDate?: string | null;
  isVisibleToPatient?: boolean;
  createdAt: string;
  [key: string]: unknown;
}

export interface MedicalRecordsService {
  getMyRecords(
    params?: MedicalRecordQueryParams,
  ): Promise<PaginatedResponse<MedicalRecord>>;
  getById(id: string): Promise<ApiResponse<MedicalRecord>>;
}

export function createMedicalRecordsService(
  http: HttpClient,
): MedicalRecordsService {
  return {
    getMyRecords: (params) => http.get('/medical-records/me', { params }),
    getById: (id) => http.get(`/medical-records/${id}`),
  };
}
