/**
 * TenantContextModule — Global module for tenant context propagation.
 * Must be imported once in AppModule. Exports TenantContextService for DI.
 */
import { TenantContextService } from './tenant-context.service';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
  providers: [TenantContextService],
  exports: [TenantContextService],
})
export class TenantContextModule {}
