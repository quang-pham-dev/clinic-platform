/**
 * TenantsModule — multi-tenancy management.
 * P5: Tenant CRUD, provisioning, feature flags.
 */
import { FeatureFlag } from './entities/feature-flag.entity';
import { Tenant } from './entities/tenant.entity';
import { TenantProvisioningService } from './tenant-provisioning.service';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, FeatureFlag])],
  controllers: [TenantsController],
  providers: [TenantsService, TenantProvisioningService],
  exports: [TenantsService, TenantProvisioningService],
})
export class TenantsModule {}
