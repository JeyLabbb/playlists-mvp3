# Stripe Configuration Guide

## Environment Variables

Add these variables to your `.env.local` file:

```bash
# Stripe Secret Key (starts with sk_test_...)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here

# Stripe Webhook Secret (starts with whsec_...)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# NextAuth URL (for success/cancel redirects)
NEXTAUTH_URL=http://localhost:3000
```

## Getting Stripe Keys

### 1. Secret Key
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Copy the "Secret key" (starts with `sk_test_...`)

### 2. Webhook Secret
1. Go to Stripe Dashboard > Webhooks
2. Create a new webhook endpoint pointing to: `https://yourdomain.com/api/stripe/webhook`
3. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook signing secret (starts with `whsec_...`)

## Test Mode

Currently configured for Stripe test mode. All transactions will be test transactions.

## Price IDs

Update the price IDs in `web/lib/stripe.ts` with your actual Stripe price IDs:

```typescript
PRICE_IDS: {
  FREE: null, // Free plan doesn't need a price ID
  CREATOR: 'price_your_creator_price_id', // Replace with actual test price ID
  PRO: 'price_your_pro_price_id', // Replace with actual test price ID
},
```

## Feature Flags

The payment system is controlled by feature flags in `web/lib/flags.ts`:

- `CHECKOUT_ENABLED=false` - Disables checkout functionality
- `LAUNCH_READY=false` - General launch readiness flag

Set these to `true` when ready to enable payments.

