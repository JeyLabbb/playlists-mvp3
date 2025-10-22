# Stripe Configuration (Local Test Mode)
# Copy this file to .env.local and configure with your Stripe test keys

# Stripe Keys (Test Mode)
# Get from: https://dashboard.stripe.com/test/apikeys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here

# Webhook Secret (Test Mode)
# Get from: https://dashboard.stripe.com/test/webhooks
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Local Test Mode
NEXT_PUBLIC_LOCAL_CHECKOUT_TEST=false

# Checkout URLs (Local)
STRIPE_SUCCESS_URL=http://127.0.0.1:3000/checkout/success
STRIPE_CANCEL_URL=http://127.0.0.1:3000/checkout/cancel

# Price IDs (Test Mode)
# Create products and prices in Stripe Dashboard, then copy the price IDs here
STRIPE_PRICE_CREATOR=price_test_creator_monthly
STRIPE_PRICE_PRO=price_test_pro_monthly

# NextAuth URL (for other auth features)
NEXTAUTH_URL=http://localhost:3000

