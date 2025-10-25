import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userEmail, action, meta } = await request.json();

    if (!userEmail || !action) {
      return NextResponse.json({ error: 'Missing userEmail or action' }, { status: 400 });
    }

    // Simple logging to console for now
    console.log(`[METRICS] ${action} - ${userEmail}`, meta);

    return NextResponse.json({ 
      ok: true, 
      message: 'Metrics logged successfully',
      data: { userEmail, action, meta }
    }, { status: 200 });

  } catch (error: any) {
    console.error('[METRICS] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}