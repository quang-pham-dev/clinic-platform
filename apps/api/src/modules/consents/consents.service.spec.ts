import { RedisService } from '@/modules/auth/redis/redis.service';
import { ConsentsService } from '@/modules/consents/consents.service';
import { UnprocessableEntityException } from '@nestjs/common';
import { vi } from 'vitest';

describe('ConsentsService', () => {
  const consentsRepo = {
    create: vi.fn(),
    save: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    createQueryBuilder: vi.fn(),
  };
  const redisService = {
    get: vi.fn(),
    set: vi.fn(),
  };

  let service: ConsentsService;

  beforeEach(() => {
    vi.clearAllMocks();

    consentsRepo.create.mockImplementation((data) => data);
    consentsRepo.save.mockImplementation((data) => ({
      id: 'consent-1',
      signedAt: new Date('2026-05-15T00:00:00.000Z'),
      ...data,
    }));

    service = new ConsentsService(
      consentsRepo as never,
      redisService as unknown as RedisService,
    );
  });

  it('reads current consent versions from Redis-backed state', async () => {
    redisService.get.mockResolvedValue('2.1');

    await expect(service.getCurrentVersion('telemedicine')).resolves.toBe(
      '2.1',
    );
    expect(redisService.get).toHaveBeenCalledWith(
      'consent:current-version:telemedicine',
    );
  });

  it('falls back to local development defaults when Redis has no value', async () => {
    redisService.get.mockResolvedValue(null);

    await expect(service.getCurrentVersion('telemedicine')).resolves.toBe(
      '1.0',
    );
  });

  it('rejects signatures for stale consent versions', async () => {
    redisService.get.mockResolvedValue('2.1');

    await expect(
      service.sign(
        { formType: 'telemedicine', versionSigned: '1.0' },
        'patient-1',
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('marks patient consents current when signed version matches Redis current version', async () => {
    redisService.get.mockImplementation((key: string) => {
      if (key === 'consent:current-version:telemedicine') {
        return Promise.resolve('2.1');
      }
      return Promise.resolve(null);
    });
    consentsRepo.find.mockResolvedValue([
      {
        id: 'old-consent',
        formType: 'telemedicine',
        versionSigned: '1.0',
      },
      {
        id: 'current-consent',
        formType: 'telemedicine',
        versionSigned: '2.1',
      },
    ]);

    await expect(service.findMyConsents('patient-1')).resolves.toEqual([
      expect.objectContaining({ id: 'old-consent', isCurrent: false }),
      expect.objectContaining({ id: 'current-consent', isCurrent: true }),
    ]);
  });

  it('marks only the latest matching current version consent as current', async () => {
    redisService.get.mockResolvedValue('2.1');
    consentsRepo.find.mockResolvedValue([
      {
        id: 'latest-current-consent',
        formType: 'telemedicine',
        versionSigned: '2.1',
        signedAt: new Date('2026-05-15T02:00:00.000Z'),
      },
      {
        id: 'older-current-consent',
        formType: 'telemedicine',
        versionSigned: '2.1',
        signedAt: new Date('2026-05-15T01:00:00.000Z'),
      },
    ]);

    await expect(service.findMyConsents('patient-1')).resolves.toEqual([
      expect.objectContaining({
        id: 'latest-current-consent',
        isCurrent: true,
      }),
      expect.objectContaining({
        id: 'older-current-consent',
        isCurrent: false,
      }),
    ]);
  });

  it('writes current consent versions to Redis', async () => {
    await service.updateConsentVersion('telemedicine', '2.1');

    expect(redisService.set).toHaveBeenCalledWith(
      'consent:current-version:telemedicine',
      '2.1',
    );
  });
});
