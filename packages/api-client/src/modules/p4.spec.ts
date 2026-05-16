import type { HttpClient } from '../core/client';
import { createApiClient } from '../index';
import {
  createConsentsService,
  createMedicalRecordsService,
  createPatientFilesService,
} from '../services';
import { describe, expect, it, vi } from 'vitest';

describe('P4 API client services', () => {
  it('exposes P4 services from the bundled API client', () => {
    const api = createApiClient({
      baseUrl: 'http://localhost:3000/api/v1',
      getAccessToken: () => 'token',
      onTokenRefreshed: () => {},
      onAuthError: () => {},
    });

    expect(api.medicalRecords).toBeDefined();
    expect(api.patientFiles).toBeDefined();
    expect(api.consents).toBeDefined();
  });

  it('calls documented medical records endpoints', async () => {
    const http = createMockHttpClient();
    const service = createMedicalRecordsService(http);

    await service.getMyRecords({ page: 2, limit: 10 });
    await service.getById('record-1');

    expect(http.get).toHaveBeenCalledWith('/medical-records/me', {
      params: { page: 2, limit: 10 },
    });
    expect(http.get).toHaveBeenCalledWith('/medical-records/record-1');
  });

  it('calls documented patient file endpoints', async () => {
    const http = createMockHttpClient();
    const service = createPatientFilesService(http);

    await service.getMyFiles({ appointmentId: 'appointment-1' });
    await service.getSignedUrl('file-1');
    await service.delete('file-1');

    expect(http.get).toHaveBeenCalledWith('/files/me', {
      params: { appointmentId: 'appointment-1' },
    });
    expect(http.get).toHaveBeenCalledWith('/files/file-1/url');
    expect(http.delete).toHaveBeenCalledWith('/files/file-1');
  });

  it('calls documented consent endpoints', async () => {
    const http = createMockHttpClient();
    const service = createConsentsService(http);

    await service.getMyConsents();
    await service.getCurrentVersion('telemedicine');
    await service.sign({ formType: 'telemedicine', versionSigned: '2.1' });

    expect(http.get).toHaveBeenCalledWith('/consents/me');
    expect(http.get).toHaveBeenCalledWith(
      '/consents/current-version/telemedicine',
    );
    expect(http.post).toHaveBeenCalledWith('/consents', {
      formType: 'telemedicine',
      versionSigned: '2.1',
    });
  });
});

function createMockHttpClient(): HttpClient {
  return {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  };
}
