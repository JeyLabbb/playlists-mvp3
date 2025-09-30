import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test the intent endpoint without Spotify
    const intentResponse = await fetch('http://localhost:3000/api/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: "jazz music",
        target_tracks: 20
      })
    });
    
    const intentData = await intentResponse.json();
    
    // Test debug endpoint
    const debugResponse = await fetch('http://localhost:3000/api/debug/last?format=json');
    const debugData = await debugResponse.json();
    
    return NextResponse.json({
      status: "✅ Sistema funcionando",
      timestamp: new Date().toISOString(),
      intent: {
        modo: intentData.modo,
        llmShare: intentData.llmShare,
        tracks_count: intentData.tracks_llm?.length || 0,
        artists_count: intentData.artists_llm?.length || 0,
        hasGenericTitles: intentData.tracks_llm?.some(t => 
          ['Study', 'Chill', 'Workout', 'Focus'].some(g => 
            t.title?.toLowerCase().includes(g.toLowerCase())
          )
        ) || false
      },
      debug: {
        hasRunData: debugData.runId ? "✅" : "❌",
        lastRunId: debugData.runId || "N/A"
      },
      checks: {
        "JSON válido": intentData.modo ? "✅" : "❌",
        "70% rule": intentData.tracks_llm?.length >= 14 ? "✅" : "❌",
        "Sin genéricos": !intentData.tracks_llm?.some(t => 
          ['Study', 'Chill', 'Workout', 'Focus'].some(g => 
            t.title?.toLowerCase().includes(g.toLowerCase())
          )
        ) ? "✅" : "❌",
        "Artistas variados": (intentData.artists_llm?.length || 0) >= 5 ? "✅" : "❌",
        "Debug endpoint": debugData.runId ? "✅" : "❌"
      },
      endpoints: {
        "Intent": "/api/intent",
        "Playlist LLM": "/api/playlist/llm", 
        "Debug": "/api/debug/last",
        "Refine": "/api/playlist/refine",
        "Remove": "/api/playlist/remove",
        "More": "/api/playlist/more"
      },
      note: "Para funcionalidad completa, autentica con Spotify"
    });
    
  } catch (error) {
    return NextResponse.json({
      status: "❌ Error",
      error: error.message,
      note: "Verifica que el servidor esté corriendo"
    });
  }
}
