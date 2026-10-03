import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

const SCHEMA_NAME_PATTERN = /^tenant_[a-z0-9_]+$/;

@Injectable()
export class TenantDatabaseService {
  constructor(private readonly dataSource: DataSource) {}

  async runInTenantSchema<T>(
    schemaName: string,
    callback: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    if (!SCHEMA_NAME_PATTERN.test(schemaName)) {
      throw new Error(`Invalid tenant schema name: ${schemaName}`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.query(
        `SET LOCAL search_path = "${schemaName}", public`,
      );
      const result = await callback(queryRunner.manager);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
