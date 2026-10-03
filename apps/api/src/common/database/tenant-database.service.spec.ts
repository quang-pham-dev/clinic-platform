import { TenantDatabaseService } from './tenant-database.service';
import { vi } from 'vitest';

describe('TenantDatabaseService', () => {
  it('sets tenant search_path on a dedicated query runner and releases it', async () => {
    const manager = { query: vi.fn() };
    const queryRunner = {
      connect: vi.fn(),
      startTransaction: vi.fn(),
      query: vi.fn(),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn(),
      release: vi.fn(),
      manager,
    };
    const dataSource = {
      createQueryRunner: vi.fn(() => queryRunner),
    };
    const service = new TenantDatabaseService(dataSource as never);

    const result = await service.runInTenantSchema(
      'tenant_clinic_a',
      async (tenantManager) => {
        expect(tenantManager).toBe(manager);
        return 'ok';
      },
    );

    expect(result).toBe('ok');
    expect(queryRunner.connect).toHaveBeenCalledOnce();
    expect(queryRunner.startTransaction).toHaveBeenCalledOnce();
    expect(queryRunner.query).toHaveBeenCalledWith(
      'SET LOCAL search_path = "tenant_clinic_a", public',
    );
    expect(queryRunner.commitTransaction).toHaveBeenCalledOnce();
    expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalledOnce();
  });

  it.each(['public', 'tenant-a', 'tenant_abc"; drop schema public; --'])(
    'rejects invalid schema name %s before creating a query runner',
    async (schemaName) => {
      const dataSource = {
        createQueryRunner: vi.fn(),
      };
      const service = new TenantDatabaseService(dataSource as never);

      await expect(
        service.runInTenantSchema(schemaName, async () => 'ok'),
      ).rejects.toThrow(`Invalid tenant schema name: ${schemaName}`);

      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    },
  );

  it('rolls back and releases the query runner when tenant work fails', async () => {
    const queryRunner = {
      connect: vi.fn(),
      startTransaction: vi.fn(),
      query: vi.fn(),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn(),
      release: vi.fn(),
      manager: {},
    };
    const dataSource = {
      createQueryRunner: vi.fn(() => queryRunner),
    };
    const service = new TenantDatabaseService(dataSource as never);

    await expect(
      service.runInTenantSchema('tenant_clinic_a', async () => {
        throw new Error('tenant query failed');
      }),
    ).rejects.toThrow('tenant query failed');

    expect(queryRunner.rollbackTransaction).toHaveBeenCalledOnce();
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalledOnce();
  });
});
