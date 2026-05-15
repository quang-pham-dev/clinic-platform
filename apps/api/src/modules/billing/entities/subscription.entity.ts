/**
 * Subscription entity — mirrors Stripe subscription state.
 * Stored in the `public` schema. Updated exclusively by webhook events.
 * See docs/5/03-database-schema.md §2.2
 */
import { Tenant } from '@/modules/tenants/entities/tenant.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'subscriptions', schema: 'public' })
@Unique(['stripeSubscriptionId'])
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'stripe_subscription_id', length: 100 })
  stripeSubscriptionId: string;

  @Column({ name: 'stripe_price_id', length: 100 })
  stripePriceId: string;

  @Column({ length: 20 })
  plan: string;

  @Column({ length: 30 })
  status: string; // active | past_due | canceled | unpaid | trialing

  @Column({ name: 'current_period_start', type: 'timestamptz' })
  currentPeriodStart: Date;

  @Column({ name: 'current_period_end', type: 'timestamptz' })
  currentPeriodEnd: Date;

  @Column({ name: 'cancel_at_period_end', default: false })
  cancelAtPeriodEnd: boolean;

  @Column({ name: 'trial_end', type: 'timestamptz', nullable: true })
  trialEnd: Date | null;

  @Column({ name: 'seats_doctors', default: 0 })
  seatsDoctor: number;

  @Column({ name: 'seats_staff', default: 0 })
  seatsStaff: number;

  @Column({ name: 'bookings_limit', nullable: true })
  bookingsLimit: number | null; // null = unlimited

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
