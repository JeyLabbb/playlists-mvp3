import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({
        ok: false,
        error: 'Email is required'
      }, { status: 400 });
    }
    
    console.log(`[ADMIN] Removing founder status for: ${email}`);
    
    // Get existing profile
    const profileKey = `userprofile:${email}`;
    const existingProfile = await kv.get(profileKey) as Record<string, any> || {};
    
    // Remove founder status
    const updatedProfile = {
      ...existingProfile,
      email: email,
      plan: 'free', // Reset to free plan
      founderSince: null, // Remove founder date
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(profileKey, updatedProfile);
    
    console.log(`[ADMIN] Founder status removed for: ${email}`, updatedProfile);
    
    return NextResponse.json({
      ok: true,
      message: `Founder status removed for ${email}`,
      profile: updatedProfile
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('[ADMIN] Error removing founder status:', error);
    return NextResponse.json({
      ok: false,
      error: error.message
    }, { status: 500 });
  }
}
