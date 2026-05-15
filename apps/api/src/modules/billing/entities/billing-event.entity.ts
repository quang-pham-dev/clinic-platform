/**
 * BillingEvent entity — append-only log of every Stripe webhook received.
 * Stored in the `public` schema. Used for debugging and reconciliation.
 * See docs/5/03-database-schema.md §2.4
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity({ name: 'billing_events', schema: 'public' })
@Unique(['stripeEventId'])
export class BillingEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'stripe_event_id', length: 100 })
  stripeEventId: string;

  @Column({ name: 'event_type', length: 100 })
  eventType: string;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: string | null;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ default: false })
  processed: boolean;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
