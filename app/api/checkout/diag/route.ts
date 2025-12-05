import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    );
  }

  const diagnostics = {
    ok: true,
    NODE_ENV: process.env.NODE_ENV,
    LOCAL_CHECKOUT_TEST: process.env.NEXT_PUBLIC_LOCAL_CHECKOUT_TEST === 'true',
    hasPublishableKey: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
    hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    hasPrices: {
      creator: !!process.env.STRIPE_PRICE_CREATOR,
      pro: !!process.env.STRIPE_PRICE_PRO,
    },
    urls: {
      success: process.env.STRIPE_SUCCESS_URL || 'not-set',
      cancel: process.env.STRIPE_CANCEL_URL || 'not-set',
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(diagnostics);
}
