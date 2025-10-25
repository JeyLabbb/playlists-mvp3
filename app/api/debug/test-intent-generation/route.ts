import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    
    if (!prompt) {
      return NextResponse.json({
        ok: false,
        error: 'Prompt is required'
      }, { status: 400 });
    }
    
    console.log(`[DEBUG] Testing LLM intent generation for: "${prompt}"`);
    
    // Test the intent generation (this doesn't require Spotify auth)
    const intentResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    
    if (!intentResponse.ok) {
      const errorText = await intentResponse.text();
      console.error(`[DEBUG] Intent endpoint failed: ${intentResponse.status}`, errorText);
      return NextResponse.json({
        ok: false,
        error: `Intent endpoint failed: ${intentResponse.status}`,
        details: errorText
      }, { status: 500 });
    }
    
    const intentData = await intentResponse.json();
    console.log(`[DEBUG] Intent response received:`, {
      ok: intentData.ok,
      tracks_llm: intentData.tracks_llm?.length || 0,
      artists_llm: intentData.artists_llm?.length || 0
    });
    
    return NextResponse.json({
      ok: true,
      message: 'Intent generation test completed',
      result: intentData
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('[DEBUG] Error in intent generation test:', error);
    return NextResponse.json({
      ok: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
