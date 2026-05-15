/**
 * TenantContextService — AsyncLocalStorage-based tenant context propagation.
 * P5: Stores the resolved tenant context per request so any service
 * in the async call stack can access tenantId, plan, and feature flags
 * without passing them through every function argument.
 *
 * See docs/5/02-system-architecture.md §6 for design rationale (ADR-016).
 */
import { Feature } from '@/common/types/feature.enum';
import { Plan } from '@/common/types/plan.enum';
import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  plan: Plan;
  schemaName: string;
  featureFlags: Set<Feature>;
}

@Injectable()
export class TenantContextService {
  private readonly store = new AsyncLocalStorage<TenantContext>();

  /**
   * Run a function within a tenant context.
   * Called by TenantMiddleware on every request.
   */
  run<T>(context: TenantContext, fn: () => T): T {
    return this.store.run(context, fn);
  }

  /**
   * Get the current tenant context.
   * Throws if called outside TenantMiddleware scope (e.g., health check).
   */
  get(): TenantContext {
    const ctx = this.store.getStore();
    if (!ctx) {
      throw new Error(
        'TenantContext not initialized — request may have bypassed TenantMiddleware',
      );
    }
    return ctx;
  }

  /** Convenience accessor — current tenant ID. */
  get tenantId(): string {
    return this.get().tenantId;
  }

  /** Convenience accessor — current plan. */
  get plan(): Plan {
    return this.get().plan;
  }

  /** Convenience accessor — current schema name. */
  get schemaName(): string {
    return this.get().schemaName;
  }

  /** Check if the current tenant has a specific feature enabled. */
  hasFeature(feature: Feature): boolean {
    return this.get().featureFlags.has(feature);
  }

  /**
   * Check if context is available (non-throwing).
   * Useful for guards/interceptors that may run outside tenant scope.
   */
  isAvailable(): boolean {
    return this.store.getStore() !== undefined;
  }
}
