import { HealthService } from './health.service';
import { Test, TestingModule } from '@nestjs/testing';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthService],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLiveness', () => {
    it('should return ok status with timestamp', () => {
      const result = service.getLiveness();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).getTime()).toBeLessThanOrEqual(
        Date.now(),
      );
    });
  });

  describe('getReadiness', () => {
    it('should return ok status with timestamp', () => {
      const result = service.getReadiness();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
    });
  });
});
