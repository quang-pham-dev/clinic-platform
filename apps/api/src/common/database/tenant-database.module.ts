import { TenantDatabaseService } from './tenant-database.service';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
  providers: [TenantDatabaseService],
  exports: [TenantDatabaseService],
})
export class TenantDatabaseModule {}
