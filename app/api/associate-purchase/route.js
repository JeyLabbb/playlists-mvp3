import { NextResponse } from 'next/server';
import { stripe } from '../../../lib/stripe';
import { getPleiaServerUser } from '../../../lib/auth/serverUser';

export async function POST(request) {
  try {
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Get the current user session (Supabase)
    const user = await getPleiaServerUser();
    
    if (!user?.email) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    console.log('[ASSOCIATE-PURCHASE] Associating purchase with user:', user.email);
    console.log('[ASSOCIATE-PURCHASE] Session ID:', sessionId);

    // Get session details from Stripe
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!stripeSession) {
      return NextResponse.json({ error: 'Stripe session not found' }, { status: 404 });
    }

    console.log('[ASSOCIATE-PURCHASE] Stripe session details:', {
      id: stripeSession.id,
      stripe_email: stripeSession.customer_details?.email,
      user_email: user.email,
      amount_total: stripeSession.amount_total,
      payment_status: stripeSession.payment_status
    });

    // Get line items to check if it's a Founder Pass
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);
    const isFounderPass = lineItems.data.some(item => 
      item.price?.id === process.env.STRIPE_PRICE_FOUNDER
    );

    console.log('[ASSOCIATE-PURCHASE] Is Founder Pass:', isFounderPass);

    if (isFounderPass) {
      // Mark user as Founder using the CURRENT SESSION EMAIL (not Stripe email)
      try {
        const kv = await import('@vercel/kv');
        const profileKey = `userprofile:${user.email}`; // Use session email, not Stripe email
        
        // Get existing profile
        const existingProfile = await kv.kv.get(profileKey) || {};
        
        // Update with Founder status
        const updatedProfile = {
          ...existingProfile,
          email: user.email, // Use session email
          plan: 'founder',
          founderSince: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await kv.kv.set(profileKey, updatedProfile);
        console.log('[ASSOCIATE-PURCHASE] User marked as Founder:', user.email, updatedProfile);
        
        // Send confirmation email to the SESSION EMAIL
        try {
          const { sendConfirmationEmail } = await import('../../../lib/resend');
          const planName = 'Founder Pass';
          const amount = (stripeSession.amount_total / 100).toFixed(2);
          const date = new Date(stripeSession.created * 1000).toLocaleDateString('es-ES');
          
          const emailSent = await sendConfirmationEmail(user.email, {
            planName,
            amount,
            date,
            sessionId: stripeSession.id
          });
          
          if (emailSent) {
            console.log('[ASSOCIATE-PURCHASE] founder_confirmation sent', user.email);
          } else {
            console.error('[ASSOCIATE-PURCHASE] Failed to send confirmation email to:', user.email);
          }
        } catch (emailError) {
          console.error('[ASSOCIATE-PURCHASE] Error sending confirmation email:', emailError);
        }
        
        return NextResponse.json({ 
          success: true, 
          message: 'Purchase associated with user account',
          isFounder: true,
          email: user.email, // Return session email
          stripe_email: stripeSession.customer_details?.email, // Also return Stripe email for reference
          profile: updatedProfile
        });
      } catch (error) {
        console.error('[ASSOCIATE-PURCHASE] Error marking user as Founder:', error);
        return NextResponse.json({ error: 'Failed to mark user as founder', details: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: false, 
      message: 'Not a Founder Pass purchase',
      email: user.email,
      stripe_email: stripeSession.customer_details?.email,
      isFounderPass
    });

  } catch (error) {
    console.error('[ASSOCIATE-PURCHASE] Error:', error);
    return NextResponse.json({ error: 'Failed to associate purchase', details: error.message }, { status: 500 });
  }
}
