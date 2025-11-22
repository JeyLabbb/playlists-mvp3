import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth/config';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const { 
      currentTracks, 
      trackToRemove, 
      targetTracks,
      originalPrompt,
      blacklist = []
    } = await request.json();
    
    console.log(`[REMOVE] Removing track: ${trackToRemove.name} by ${trackToRemove.artists[0]}`);
    console.log(`[REMOVE] Current blacklist: ${blacklist.length} tracks`);
    
    // Add track to blacklist
    const updatedBlacklist = [...blacklist, trackToRemove.id];
    
    // Remove track from current tracks
    const remainingTracks = currentTracks.filter(track => track.id !== trackToRemove.id);
    
    console.log(`[REMOVE] Remaining tracks: ${remainingTracks.length}/${targetTracks}`);
    
    // If we need to fill the slot, get a replacement track
    if (remainingTracks.length < targetTracks) {
      const needed = targetTracks - remainingTracks.length;
      console.log(`[REMOVE] Need ${needed} replacement tracks`);
      
      try {
        // Get replacement tracks from Spotify, excluding blacklisted ones
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://playlists.jeylabbb.com';
        const response = await fetch(`${baseUrl}/api/playlist/llm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.accessToken}`
          },
          body: JSON.stringify({ 
            prompt: originalPrompt, 
            target_tracks: needed,
            blacklist: updatedBlacklist
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          const replacementTracks = data.tracks || [];
          
          // Add replacement tracks
          remainingTracks.push(...replacementTracks);
          
          console.log(`[REMOVE] Added ${replacementTracks.length} replacement tracks`);
        }
      } catch (error) {
        console.warn(`[REMOVE] Failed to get replacement tracks:`, error.message);
      }
    }
    
    // Ensure we don't exceed target
    const finalTracks = remainingTracks.slice(0, targetTracks);
    
    console.log(`[REMOVE] Final playlist: ${finalTracks.length} tracks`);
    
    return NextResponse.json({
      tracks: finalTracks,
      blacklist: updatedBlacklist,
      metadata: {
        source: 'removed',
        original_tracks: currentTracks.length,
        final_tracks: finalTracks.length,
        removed_track: trackToRemove,
        blacklist_size: updatedBlacklist.length
      }
    });
    
  } catch (error) {
    console.error('Remove track error:', error);
    return NextResponse.json(
      { error: 'Failed to remove track', message: error.message },
      { status: 500 }
    );
  }
}