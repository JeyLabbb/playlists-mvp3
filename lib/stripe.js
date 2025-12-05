import Stripe from 'stripe';

// Check if Stripe is configured
const isStripeConfigured = !!process.env.STRIPE_SECRET_KEY;

if (!isStripeConfigured) {
  console.warn('[STRIPE] STRIPE_SECRET_KEY not found - Stripe functionality disabled');
}

export const stripe = isStripeConfigured ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
}) : null;

export const PRICES = {
  founder: process.env.STRIPE_PRICE_FOUNDER,
  monthly: process.env.STRIPE_PRICE_MONTHLY,
};

export const URLS = {
  success: process.env.STRIPE_SUCCESS_URL,
  cancel: process.env.STRIPE_CANCEL_URL,
};
