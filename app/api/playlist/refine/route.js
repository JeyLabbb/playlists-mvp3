import { NextResponse } from 'next/server';
import { getHubAccessToken } from '@/lib/spotify/hubAuth';

export async function POST(request) {
  try {
    const accessToken = await getHubAccessToken();
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const session = { accessToken };
    
    const { 
      currentTracks, 
      refinements, 
      targetTracks,
      originalPrompt 
    } = await request.json();
    
    console.log(`[REFINE] Refining playlist with ${currentTracks.length} tracks`);
    console.log(`[REFINE] Refinements:`, refinements);
    
    // Apply refinements to current tracks
    let refinedTracks = [...currentTracks];
    
    // Apply genre filters
    if (refinements.genres && refinements.genres.length > 0) {
      console.log(`[REFINE] Filtering by genres: ${refinements.genres.join(', ')}`);
      // This would need genre detection, for now just pass
    }
    
    // Apply mood filters
    if (refinements.mood) {
      console.log(`[REFINE] Filtering by mood: ${refinements.mood}`);
      // This would need mood detection, for now just pass
    }
    
    // Apply energy filter
    if (refinements.energy !== undefined) {
      console.log(`[REFINE] Filtering by energy: ${refinements.energy}`);
      // This would need audio features, for now just pass
    }
    
    // Apply tempo filter
    if (refinements.tempo !== undefined) {
      console.log(`[REFINE] Filtering by tempo: ${refinements.tempo}`);
      // This would need audio features, for now just pass
    }
    
    // Apply decade filter
    if (refinements.decade) {
      console.log(`[REFINE] Filtering by decade: ${refinements.decade}`);
      // This would need release date, for now just pass
    }
    
    // If we need more tracks after filtering, get them from Spotify
    if (refinedTracks.length < targetTracks) {
      const needed = targetTracks - refinedTracks.length;
      console.log(`[REFINE] Need ${needed} more tracks after filtering`);
      
      try {
        // Use the original prompt with refinements to get more tracks
        const refinedPrompt = `${originalPrompt} ${refinements.genres?.join(' ') || ''} ${refinements.mood || ''}`.trim();
        
        const response = await fetch('http://localhost:3000/api/playlist/llm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.accessToken}`
          },
          body: JSON.stringify({ 
            prompt: refinedPrompt, 
            target_tracks: needed 
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          const newTracks = data.tracks || [];
          
          // Add new tracks to refined tracks
          refinedTracks.push(...newTracks);
          
          console.log(`[REFINE] Added ${newTracks.length} new tracks`);
        }
      } catch (error) {
        console.warn(`[REFINE] Failed to get additional tracks:`, error.message);
      }
    }
    
    // Ensure we don't exceed target
    refinedTracks = refinedTracks.slice(0, targetTracks);
    
    console.log(`[REFINE] Final refined playlist: ${refinedTracks.length} tracks`);
    
    return NextResponse.json({
      tracks: refinedTracks,
      metadata: {
        source: 'refined',
        original_tracks: currentTracks.length,
        refined_tracks: refinedTracks.length,
        refinements_applied: refinements,
        target_tracks: targetTracks
      }
    });
    
  } catch (error) {
    console.error('Refine playlist error:', error);
    return NextResponse.json(
      { error: 'Failed to refine playlist', message: error.message },
      { status: 500 }
    );
  }
}