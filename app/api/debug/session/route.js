import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth/config';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    return NextResponse.json({
      hasSession: !!session,
      hasAccessToken: !!session?.accessToken,
      hasRefreshToken: !!session?.refreshToken,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userName: session?.user?.name,
      sessionKeys: session ? Object.keys(session) : [],
      userKeys: session?.user ? Object.keys(session.user) : [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}