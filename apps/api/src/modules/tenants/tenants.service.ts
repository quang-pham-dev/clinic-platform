/**
 * TenantsService — CRUD for tenant records in the public schema.
 * See docs/5/04-api-specification.md §5
 */
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { Tenant } from './entities/tenant.entity';
import { CacheService } from '@/common/cache/cache.service';
import { Plan } from '@/common/types/plan.enum';
import { TenantStatus } from '@/common/types/tenant-status.enum';
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantsRepo: Repository<Tenant>,
    private readonly cache: CacheService,
  ) {}

  async register(dto: RegisterTenantDto): Promise<Tenant> {
    // Check slug uniqueness
    const existing = await this.tenantsRepo.findOne({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException({
        code: 'SLUG_TAKEN',
        message: `The slug "${dto.slug}" is already in use`,
      });
    }

    const schemaName = `tenant_${dto.slug.replace(/-/g, '_')}`;
    const tenant = this.tenantsRepo.create({
      slug: dto.slug,
      name: dto.clinicName,
      adminEmail: dto.adminEmail,
      schemaName,
      plan: dto.plan as Plan,
      status: TenantStatus.PENDING,
    });

    const saved = await this.tenantsRepo.save(tenant);
    this.logger.log(
      `Tenant registered: id=${saved.id}, slug=${saved.slug}, plan=${saved.plan}`,
    );
    return saved;
  }

  async findById(id: string): Promise<Tenant> {
    const cacheKey = `tenant:${id}`;
    const cached = await this.cache.get<Tenant>(cacheKey);
    if (cached) return cached;

    const tenant = await this.tenantsRepo.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException({ code: 'TENANT_NOT_FOUND' });
    }

    await this.cache.set(cacheKey, tenant, { ttl: 300 });
    return tenant;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.tenantsRepo.findOne({ where: { slug } });
  }

  async findAll(filters: {
    status?: TenantStatus;
    plan?: Plan;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 100);

    const qb = this.tenantsRepo
      .createQueryBuilder('t')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('t.createdAt', 'DESC');

    if (filters.status) {
      qb.andWhere('t.status = :status', { status: filters.status });
    }
    if (filters.plan) {
      qb.andWhere('t.plan = :plan', { plan: filters.plan });
    }
    if (filters.search) {
      qb.andWhere('(t.slug ILIKE :search OR t.name ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, page, limit } };
  }

  async updateStatus(
    id: string,
    status: TenantStatus,
    extra?: Partial<Tenant>,
  ): Promise<void> {
    await this.tenantsRepo.update(id, { status, ...extra });
    await this.cache.del(`tenant:${id}`);
  }

  async update(id: string, data: Partial<Tenant>): Promise<void> {
    await this.tenantsRepo.update(id, data);
    await this.cache.del(`tenant:${id}`);
  }
}
