import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY missing');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

export const PRICES = {
  founder: process.env.STRIPE_PRICE_FOUNDER,
  monthly: process.env.STRIPE_PRICE_MONTHLY,
};

export const URLS = {
  success: process.env.STRIPE_SUCCESS_URL,
  cancel: process.env.STRIPE_CANCEL_URL,
};
