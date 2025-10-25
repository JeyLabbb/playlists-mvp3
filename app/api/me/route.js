import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth/config';

// Force no caching
export const revalidate = 0;
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        isFounder: false,
        plan: null,
        founderSince: null,
        email: null
      });
    }

    // Get profile from KV
    const kv = await import('@vercel/kv');
    const profileKey = `jey_user_profile:${session.user.email}`;
    const profile = await kv.kv.get(profileKey);
    
    console.log('[ME] Profile data source:', { email: session.user.email, profileKey, profile });
    
    const isFounder = profile?.plan === 'founder';
    
    const response = NextResponse.json({ 
      isFounder,
      plan: profile?.plan || null,
      founderSince: profile?.founderSince || null,
      email: session.user.email
    });

    // Force no caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('[ME] Error:', error);
    return NextResponse.json({ 
      isFounder: false,
      plan: null,
      founderSince: null,
      email: null,
      error: error.message
    });
  }
}