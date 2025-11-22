import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Support both formats: userEmail/action (old) and playlistId/type (new)
    if (body.playlistId && body.type) {
      // New format: playlist metrics
      const { playlistId, type } = body;
      
      if (!playlistId || !type) {
        return NextResponse.json({ error: 'Missing playlistId or type' }, { status: 400 });
      }

      // Log the metric (for now, client-side will handle localStorage)
      console.log(`[METRICS] Playlist ${type}: ${playlistId}`);

      // Return success but indicate localStorage should be used
      // The client will handle updating metrics in localStorage
      return NextResponse.json({ 
        ok: true,
        success: true,
        message: 'Metrics logged (use localStorage fallback)',
        reason: 'fallback-localStorage',
        data: { playlistId, type }
      }, { status: 200 });

    } else if (body.userEmail && body.action) {
      // Old format: user metrics
      const { userEmail, action, meta } = body;
      
      // Simple logging to console for now
      console.log(`[METRICS] ${action} - ${userEmail}`, meta);

      return NextResponse.json({ 
        ok: true, 
        message: 'Metrics logged successfully',
        data: { userEmail, action, meta }
      }, { status: 200 });
    } else {
      return NextResponse.json({ 
        error: 'Missing required fields. Use either {playlistId, type} or {userEmail, action}' 
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('[METRICS] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}