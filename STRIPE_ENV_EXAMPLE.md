# Stripe Configuration
# Get these from your Stripe Dashboard: https://dashboard.stripe.com/test/apikeys

# Stripe Keys (Test Mode)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Price IDs (Test Mode)
# Create products and prices in Stripe Dashboard, then copy the price IDs here
STRIPE_PRICE_FOUNDER=price_test_founder_pass
STRIPE_PRICE_MONTHLY=price_test_monthly_subscription

# Checkout URLs
STRIPE_SUCCESS_URL=http://localhost:3000/checkout/success
STRIPE_CANCEL_URL=http://localhost:3000/checkout/cancel

# NextAuth URL (for other auth features)
NEXTAUTH_URL=http://localhost:3000

# Note: In production, replace with your actual domain
# NEXTAUTH_URL=https://yourdomain.com


