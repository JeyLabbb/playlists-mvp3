# PLEIA Environment Variables

## Usage Limits
```
FREE_USAGE_LIMIT=5
USAGE_WINDOW_DAYS=30
```

## Stripe Configuration (Test Mode)
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=http://localhost:3000/checkout/success
STRIPE_CANCEL_URL=http://localhost:3000/checkout/cancel
STRIPE_PRICE_FOUNDER=price_...
STRIPE_PRICE_MONTHLY=price_...
```

## NextAuth Configuration
```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

## Spotify OAuth
```
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
```

## KV Storage (Optional - for production)
```
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

## Feature Flags
```
NODE_ENV=development
```

## Setup Instructions

1. Copy this file to `.env.local`
2. Fill in your actual values for Stripe, Spotify, and NextAuth
3. Set `FREE_USAGE_LIMIT` to the number of free playlists per window
4. Set `USAGE_WINDOW_DAYS` to the window duration (30 for monthly)
5. In production, set `NODE_ENV=production` to disable checkout

