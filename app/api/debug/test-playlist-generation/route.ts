import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt, email } = await request.json();
    
    if (!prompt || !email) {
      return NextResponse.json({
        ok: false,
        error: 'Prompt and email are required'
      }, { status: 400 });
    }
    
    console.log(`[DEBUG] Testing playlist generation for: ${email}`);
    console.log(`[DEBUG] Prompt: "${prompt}"`);
    
    // Test the LLM endpoint directly
    const llmResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/playlist/llm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt,
        target_tracks: 10 // Small number for testing
      })
    });
    
    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error(`[DEBUG] LLM endpoint failed: ${llmResponse.status}`, errorText);
      return NextResponse.json({
        ok: false,
        error: `LLM endpoint failed: ${llmResponse.status}`,
        details: errorText
      }, { status: 500 });
    }
    
    const llmData = await llmResponse.json();
    console.log(`[DEBUG] LLM response received:`, {
      ok: llmData.ok,
      tracks: llmData.tracks?.length || 0,
      mode: llmData.mode
    });
    
    return NextResponse.json({
      ok: true,
      message: 'Playlist generation test completed',
      result: llmData
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('[DEBUG] Error in playlist generation test:', error);
    return NextResponse.json({
      ok: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
