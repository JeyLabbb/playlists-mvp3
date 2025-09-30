import { NextResponse } from 'next/server';
import { getLastRunData } from '../../../../lib/debug/utils';

// GET /api/debug/last?format=json|text
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    
    const lastRunData = getLastRunData();
    if (!lastRunData) {
      return NextResponse.json(
        { error: 'No run data available' },
        { status: 404 }
      );
    }
    
    // Remove sensitive data
    const sanitizedData = {
      runId: lastRunData.runId,
      timestamp: lastRunData.timestamp,
      prompt: lastRunData.prompt,
      targetTracks: lastRunData.targetTracks,
      modo: lastRunData.modo,
      llmShare: lastRunData.llmShare,
      collectionLog: lastRunData.collectionLog,
      relaxationSteps: lastRunData.relaxationSteps || [],
      artistDistribution: lastRunData.artistDistribution || {},
      llmTracksCount: lastRunData.llmTracksCount || 0,
      spotifyTracksCount: lastRunData.spotifyTracksCount || 0,
      finalTracksCount: lastRunData.finalTracksCount || 0,
      note: lastRunData.note || null,
      duration: lastRunData.duration || 0,
      success: lastRunData.success || false
    };
    
    if (format === 'text') {
      // Return as formatted text
      const textOutput = `
=== JEYLABBB PLAYLIST GENERATOR DEBUG ===
Run ID: ${sanitizedData.runId}
Timestamp: ${sanitizedData.timestamp}
Duration: ${sanitizedData.duration}ms
Success: ${sanitizedData.success}

=== INPUT ===
Prompt: "${sanitizedData.prompt}"
Target Tracks: ${sanitizedData.targetTracks}
Mode: ${sanitizedData.modo}
LLM Share: ${sanitizedData.llmShare}

=== COLLECTION LOG ===
Collected: ${sanitizedData.collectionLog?.collected || 0}
After Features: ${sanitizedData.collectionLog?.after_features || 0}
After Filters: ${sanitizedData.collectionLog?.after_filters || 0}
After Caps: ${sanitizedData.collectionLog?.after_caps || 0}
After Relaxation: ${sanitizedData.collectionLog?.after_relaxation || 0}
Final: ${sanitizedData.collectionLog?.final || 0}

=== RELAXATION STEPS ===
${sanitizedData.relaxationSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

=== TRACK DISTRIBUTION ===
LLM Tracks: ${sanitizedData.llmTracksCount}
Spotify Tracks: ${sanitizedData.spotifyTracksCount}
Total: ${sanitizedData.finalTracksCount}

=== ARTIST DISTRIBUTION ===
${Object.entries(sanitizedData.artistDistribution)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([artist, count]) => `${artist}: ${count}`)
  .join('\n')}

=== NOTES ===
${sanitizedData.note || 'No notes'}
      `.trim();
      
      return new NextResponse(textOutput, {
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    // Return as JSON
    return NextResponse.json(sanitizedData);
    
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}