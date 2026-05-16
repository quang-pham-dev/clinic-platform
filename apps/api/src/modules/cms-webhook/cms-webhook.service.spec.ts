import { CmsWebhookService } from '@/modules/cms-webhook/cms-webhook.service';
import { StrapiWebhookDto } from '@/modules/cms-webhook/dto/strapi-webhook.dto';
import { ConfigService } from '@nestjs/config';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

describe('CmsWebhookService', () => {
  const syncLogsRepo = {
    save: vi.fn(),
    update: vi.fn(),
    findOneOrFail: vi.fn(),
  };
  const configService = {
    get: vi.fn(),
  };
  const consentsService = {
    updateConsentVersion: vi.fn(),
    getCurrentVersion: vi.fn(),
  };

  let service: CmsWebhookService;
  let fetchMock: Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    syncLogsRepo.save.mockResolvedValue({ id: 'log-1' });
    syncLogsRepo.update.mockResolvedValue(undefined);
    syncLogsRepo.findOneOrFail.mockResolvedValue({
      id: 'log-1',
      status: 'processed',
    });

    configService.get.mockImplementation((key: string, fallback?: string) => {
      const values: Record<string, string> = {
        NEXTJS_MEMBER_URL: 'http://member.test',
        REVALIDATION_SECRET: 'test-secret',
      };

      return values[key] ?? fallback;
    });

    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock;

    service = new CmsWebhookService(
      syncLogsRepo as never,
      configService as unknown as ConfigService,
      consentsService as never,
    );
  });

  it('revalidates doctor detail and listing paths with tags for snake_case doctor-page payloads', async () => {
    await service.processWebhook(
      makeWebhook({ model: 'doctor-page', entry: { doctor_id: 'doctor-1' } }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://member.test/api/revalidate?secret=test-secret',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          path: '/doctors/doctor-1',
          tag: 'doctor-page-doctor-1',
        }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://member.test/api/revalidate?secret=test-secret',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ path: '/doctors', tag: 'doctor-listing' }),
      }),
    );
  });

  it('supports camelCase doctorId payloads during the Strapi schema transition', async () => {
    await service.processWebhook(
      makeWebhook({ model: 'doctor-page', entry: { doctorId: 'doctor-2' } }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://member.test/api/revalidate?secret=test-secret',
      expect.objectContaining({
        body: JSON.stringify({
          path: '/doctors/doctor-2',
          tag: 'doctor-page-doctor-2',
        }),
      }),
    );
  });

  it('revalidates article detail and listing paths with tags', async () => {
    await service.processWebhook(
      makeWebhook({ model: 'article', entry: { slug: 'healthy-sleep' } }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://member.test/api/revalidate?secret=test-secret',
      expect.objectContaining({
        body: JSON.stringify({
          path: '/articles/healthy-sleep',
          tag: 'article-healthy-sleep',
        }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://member.test/api/revalidate?secret=test-secret',
      expect.objectContaining({
        body: JSON.stringify({ path: '/articles', tag: 'article-listing' }),
      }),
    );
  });

  it('revalidates FAQ pages with the faq-page tag', async () => {
    await service.processWebhook(makeWebhook({ model: 'faq' }));

    expect(fetchMock).toHaveBeenCalledWith(
      'http://member.test/api/revalidate?secret=test-secret',
      expect.objectContaining({
        body: JSON.stringify({ path: '/faq', tag: 'faq-page' }),
      }),
    );
  });

  it('updates current consent versions and revalidates consent pages with tags', async () => {
    await service.processWebhook(
      makeWebhook({
        model: 'consent-form',
        entry: { form_type: 'telemedicine', version: '2.1' },
      }),
    );

    expect(consentsService.updateConsentVersion).toHaveBeenCalledWith(
      'telemedicine',
      '2.1',
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://member.test/api/revalidate?secret=test-secret',
      expect.objectContaining({
        body: JSON.stringify({
          path: '/consent/telemedicine',
          tag: 'consent-telemedicine',
        }),
      }),
    );
  });

  it('marks the sync log as failed when member revalidation fails', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });

    await service.processWebhook(
      makeWebhook({ model: 'article', entry: { slug: 'broken-cache' } }),
    );

    expect(syncLogsRepo.update).toHaveBeenCalledWith(
      'log-1',
      expect.objectContaining({
        status: 'failed',
        errorMessage: 'ISR revalidation failed for /articles/broken-cache: 500',
      }),
    );
  });
});

function makeWebhook(overrides: {
  model: string;
  event?: string;
  entry?: Partial<StrapiWebhookDto['entry']>;
}): StrapiWebhookDto {
  return {
    event: overrides.event ?? 'entry.publish',
    model: overrides.model,
    uid: `api::${overrides.model}.${overrides.model}`,
    entry: {
      id: 1,
      ...overrides.entry,
    },
  };
}
