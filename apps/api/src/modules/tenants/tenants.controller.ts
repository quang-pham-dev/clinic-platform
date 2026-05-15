/**
 * TenantsController — public endpoint for tenant registration.
 * POST /tenants/register is public (no auth required).
 * See docs/5/04-api-specification.md §5
 */
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { TenantsService } from './tenants.service';
import { Public } from '@/common/decorators/public.decorator';
import { Body, Controller, Post } from '@nestjs/common';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  /**
   * POST /api/v1/tenants/register
   * Public endpoint — no auth required.
   * Creates a pending tenant and returns tenant ID.
   * Stripe checkout is handled in BillingModule (Sprint 2).
   */
  @Post('register')
  @Public()
  async register(@Body() dto: RegisterTenantDto) {
    const tenant = await this.tenantsService.register(dto);
    return {
      tenantId: tenant.id,
      slug: tenant.slug,
      message:
        'Tenant registered. Complete payment to activate your clinic account.',
    };
  }
}
