import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Email is required' 
      }, { status: 400 });
    }

    console.log(`[REMOVE-FOUNDER] Removing Founder Pass from ${email}`);

    const profileKey = `jey_user_profile:${email}`;
    const existingProfile = await kv.get(profileKey) as Record<string, any> || {};
    
    const updatedProfile = {
      ...existingProfile,
      email: email,
      plan: 'free', // Reset to free plan
      founderSince: null, // Remove founder date
      updatedAt: new Date().toISOString()
    };

    await kv.set(profileKey, updatedProfile);

    console.log(`[REMOVE-FOUNDER] Successfully removed Founder Pass from ${email}`);

    return NextResponse.json({
      ok: true,
      message: `Founder Pass removed from ${email}`,
      profile: updatedProfile
    }, { status: 200 });

  } catch (error) {
    console.error('[REMOVE-FOUNDER] Error:', error);
    return NextResponse.json({
      ok: false,
      error: 'Failed to remove Founder Pass',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}