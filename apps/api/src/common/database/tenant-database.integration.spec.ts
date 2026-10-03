import { TenantDatabaseService } from './tenant-database.service';
import { DataSource } from 'typeorm';

const runDatabaseIntegration = process.env.RUN_DB_INTEGRATION === 'true';

describe.runIf(runDatabaseIntegration)(
  'TenantDatabaseService integration',
  () => {
    const suffix = `${process.pid}_${Date.now()}`;
    const tenantA = `tenant_isolation_a_${suffix}`;
    const tenantB = `tenant_isolation_b_${suffix}`;
    let dataSource: DataSource;
    let service: TenantDatabaseService;

    beforeAll(async () => {
      dataSource = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST ?? '127.0.0.1',
        port: Number(process.env.DB_PORT ?? 5432),
        database: process.env.DB_NAME ?? 'clinic_booking',
        username: process.env.DB_USER ?? 'postgres',
        password: process.env.DB_PASSWORD ?? 'secret',
      });
      await dataSource.initialize();
      service = new TenantDatabaseService(dataSource);
      await dataSource.query(`CREATE SCHEMA "${tenantA}"`);
      await dataSource.query(`CREATE SCHEMA "${tenantB}"`);
    });

    afterAll(async () => {
      if (!dataSource?.isInitialized) return;
      await dataSource.query(`DROP SCHEMA IF EXISTS "${tenantA}" CASCADE`);
      await dataSource.query(`DROP SCHEMA IF EXISTS "${tenantB}" CASCADE`);
      await dataSource.destroy();
    });

    it('keeps identically named tables isolated between tenant schemas', async () => {
      await service.runInTenantSchema(tenantA, async (manager) => {
        await manager.query(
          'CREATE TABLE isolation_probe (value text NOT NULL)',
        );
        await manager.query('INSERT INTO isolation_probe (value) VALUES ($1)', [
          'tenant-a',
        ]);
      });
      await service.runInTenantSchema(tenantB, async (manager) => {
        await manager.query(
          'CREATE TABLE isolation_probe (value text NOT NULL)',
        );
        await manager.query('INSERT INTO isolation_probe (value) VALUES ($1)', [
          'tenant-b',
        ]);
      });

      const valuesA = await service.runInTenantSchema(
        tenantA,
        async (manager) => manager.query('SELECT value FROM isolation_probe'),
      );
      const valuesB = await service.runInTenantSchema(
        tenantB,
        async (manager) => manager.query('SELECT value FROM isolation_probe'),
      );

      expect(valuesA).toEqual([{ value: 'tenant-a' }]);
      expect(valuesB).toEqual([{ value: 'tenant-b' }]);
    });
  },
);
