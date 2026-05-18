import type { HttpClient } from '../core/client';
import type { ApiResponse, PaginatedResponse } from '@clinic-platform/types';

export interface PatientFileQueryParams {
  appointmentId?: string;
  page?: number;
  limit?: number;
}

export interface PatientFile {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  appointmentId?: string | null;
  description?: string | null;
  createdAt: string;
}

export interface SignedFileUrl {
  signedUrl: string;
  expiresAt: string;
}

export interface UploadedPatientFile extends PatientFile {
  signedUrl: string;
  signedUrlExpiresAt: string;
}

export interface UploadPatientFileRequest {
  file: File | Blob;
  appointmentId?: string;
  description?: string;
}

export interface PatientFilesService {
  getMyFiles(
    params?: PatientFileQueryParams,
  ): Promise<PaginatedResponse<PatientFile>>;
  getSignedUrl(id: string): Promise<ApiResponse<SignedFileUrl>>;
  upload(
    dto: UploadPatientFileRequest,
  ): Promise<ApiResponse<UploadedPatientFile>>;
  delete(id: string): Promise<ApiResponse<void>>;
}

export function createPatientFilesService(
  http: HttpClient,
): PatientFilesService {
  return {
    getMyFiles: (params) => http.get('/files/me', { params }),
    getSignedUrl: (id) => http.get(`/files/${id}/url`),
    upload: ({ file, appointmentId, description }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (appointmentId) {
        formData.append('appointmentId', appointmentId);
      }
      if (description) {
        formData.append('description', description);
      }

      return http.post('/files', formData);
    },
    delete: (id) => http.delete(`/files/${id}`),
  };
}
