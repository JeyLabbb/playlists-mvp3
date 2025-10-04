import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;
    
    const hasKV = !!(kvUrl && kvToken);
    
    return NextResponse.json({
      hasKV,
      kvUrl: kvUrl ? 'Configured' : 'Not configured',
      kvToken: kvToken ? 'Configured' : 'Not configured',
      message: hasKV ? 'KV is properly configured' : 'KV is not configured - trending playlists will not work',
      recommendation: hasKV ? 'All good!' : 'Configure KV_REST_API_URL and KV_REST_API_TOKEN environment variables'
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Debug endpoint failed',
      message: error.message
    }, { status: 500 });
  }
}
