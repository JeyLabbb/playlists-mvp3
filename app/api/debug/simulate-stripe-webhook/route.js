import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function POST(request) {
  try {
    const { email, amount = 500, plan = 'founder' } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    console.log(`[SIMULATE-WEBHOOK] Simulating Stripe webhook for ${email}`);

    // Simulate the webhook logic
    const profileKey = `jey_user_profile:${email}`;
    
    // Get existing profile
    const existingProfile = await kv.get(profileKey) || {};
    
    // Update with Founder status
    const updatedProfile = {
      ...existingProfile,
      email: email,
      plan: 'founder',
      founderSince: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(profileKey, updatedProfile);
    console.log(`[SIMULATE-WEBHOOK] User marked as Founder:`, updatedProfile);

    // Simulate payment logging
    try {
      const logResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/telemetry/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'payment',
          payload: {
            email: email,
            stripePaymentIntentId: 'sim_test_' + Date.now(),
            stripeCustomerId: 'sim_customer_' + Date.now(),
            amount: amount,
            plan: plan,
            status: 'completed'
          }
        })
      });
      
      if (logResponse.ok) {
        const logResult = await logResponse.json();
        console.log(`[SIMULATE-WEBHOOK] Payment logged:`, logResult);
      } else {
        console.error(`[SIMULATE-WEBHOOK] Failed to log payment:`, await logResponse.text());
      }
    } catch (logError) {
      console.error(`[SIMULATE-WEBHOOK] Error logging payment:`, logError);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Simulated webhook for ${email}`,
      profile: updatedProfile,
      amount,
      plan
    }, { status: 200 });

  } catch (error) {
    console.error('[SIMULATE-WEBHOOK] Error:', error);
    return NextResponse.json({ 
      error: 'Simulation failed',
      details: error.message 
    }, { status: 500 });
  }
}
