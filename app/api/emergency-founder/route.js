import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    console.log(`[EMERGENCY-FOUNDER] Marking ${email} as Founder`);

    const profileKey = `jey_user_profile:${email}`;
    
    const updatedProfile = {
      email: email,
      plan: 'founder',
      founderSince: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await kv.set(profileKey, updatedProfile);
    
    console.log(`[EMERGENCY-FOUNDER] Successfully marked ${email} as Founder`);

    return NextResponse.json({ 
      success: true, 
      message: `User ${email} marked as Founder`,
      profile: updatedProfile
    }, { status: 200 });

  } catch (error) {
    console.error('[EMERGENCY-FOUNDER] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to mark as Founder',
      details: error.message 
    }, { status: 500 });
  }
}
