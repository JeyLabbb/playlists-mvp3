import { NextResponse } from 'next/server';
import { stripe } from '../../../lib/stripe';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth/config';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Get the current user session (NextAuth)
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    console.log('[AUTO-PROCESS] Processing session:', sessionId);
    console.log('[AUTO-PROCESS] Current user session:', session.user.email);

    // Get session details from Stripe
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!stripeSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    console.log('[AUTO-PROCESS] Stripe session details:', {
      id: stripeSession.id,
      stripe_email: stripeSession.customer_details?.email,
      user_email: session.user.email,
      amount_total: stripeSession.amount_total,
      payment_status: stripeSession.payment_status
    });

    // Get line items to check if it's a Founder Pass
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);
    const isFounderPass = lineItems.data.some(item => 
      item.price?.id === process.env.STRIPE_PRICE_FOUNDER
    );

    console.log('[AUTO-PROCESS] Is Founder Pass:', isFounderPass);

    if (isFounderPass) {
      // Mark user as Founder using the CURRENT SESSION EMAIL (not Stripe email)
      try {
        const kv = await import('@vercel/kv');
        const profileKey = `userprofile:${session.user.email}`; // Use session email, not Stripe email
        
        // Get existing profile
        const existingProfile = await kv.kv.get(profileKey) || {};
        
        // Update with Founder status
        const updatedProfile = {
          ...existingProfile,
          email: session.user.email, // Use session email
          plan: 'founder',
          founderSince: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await kv.kv.set(profileKey, updatedProfile);
        console.log('[AUTO-PROCESS] User marked as Founder:', session.user.email, updatedProfile);
        
        // Send confirmation email to the SESSION EMAIL
        try {
          const { sendConfirmationEmail } = await import('../../../lib/resend');
          const planName = 'Founder Pass';
          const amount = (stripeSession.amount_total / 100).toFixed(2);
          const date = new Date(stripeSession.created * 1000).toLocaleDateString('es-ES');
          
          const emailSent = await sendConfirmationEmail(session.user.email, {
            planName,
            amount,
            date,
            sessionId: stripeSession.id
          });
          
          if (emailSent) {
            console.log('[AUTO-PROCESS] founder_confirmation sent', session.user.email);
          } else {
            console.error('[AUTO-PROCESS] Failed to send confirmation email to:', session.user.email);
          }
        } catch (emailError) {
          console.error('[AUTO-PROCESS] Error sending confirmation email:', emailError);
        }
        
        return NextResponse.json({ 
          success: true, 
          message: 'Auto-processing completed',
          isFounder: true,
          email: session.user.email, // Return session email
          stripe_email: stripeSession.customer_details?.email // Also return Stripe email for reference
        });
      } catch (error) {
        console.error('[AUTO-PROCESS] Error marking user as Founder:', error);
        return NextResponse.json({ error: 'Failed to mark user as founder', details: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: false, 
      message: 'Not a Founder Pass purchase',
      email: session.user.email,
      stripe_email: stripeSession.customer_details?.email,
      isFounderPass
    });

  } catch (error) {
    console.error('[AUTO-PROCESS] Error:', error);
    return NextResponse.json({ error: 'Failed to auto-process' }, { status: 500 });
  }
}