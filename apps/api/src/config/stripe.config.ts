/**
 * Stripe configuration — price IDs and secrets.
 * P5: See docs/5/06-billing-and-stripe.md §6
 */
import { registerAs } from '@nestjs/config';

export default registerAs('stripe', () => ({
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  prices: {
    basicMonthly: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID || '',
    basicAnnual: process.env.STRIPE_BASIC_ANNUAL_PRICE_ID || '',
    proMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '',
    proAnnual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || '',
    enterpriseMonthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || '',
    enterpriseAnnual: process.env.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID || '',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
}));
