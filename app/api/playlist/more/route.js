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
      additionalTracks = 5,
      maxTracks = 200,
      originalPrompt,
      originalIntent
    } = await request.json();
    
    console.log(`[MORE] Adding ${additionalTracks} more tracks to ${currentTracks.length} existing tracks`);
    console.log(`[MORE] Max tracks limit: ${maxTracks}`);
    
    // Check if we can add more tracks
    const newTarget = currentTracks.length + additionalTracks;
    if (newTarget > maxTracks) {
      return NextResponse.json(
        { error: `Cannot exceed ${maxTracks} tracks` },
        { status: 400 }
      );
    }
    
    // Get additional tracks using the original intent
    let additionalTracksList = [];
    
    try {
      const response = await fetch('http://localhost:3000/api/playlist/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`
        },
        body: JSON.stringify({ 
          prompt: originalPrompt, 
          target_tracks: additionalTracks,
          intent: originalIntent
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        additionalTracksList = data.tracks || [];
        
        console.log(`[MORE] Got ${additionalTracksList.length} additional tracks`);
      }
    } catch (error) {
      console.warn(`[MORE] Failed to get additional tracks:`, error.message);
    }
    
    // Combine current tracks with additional tracks
    const allTracks = [...currentTracks, ...additionalTracksList];
    
    // Remove duplicates by ID
    const uniqueTracks = [];
    const seenIds = new Set();
    
    for (const track of allTracks) {
      if (!seenIds.has(track.id)) {
        seenIds.add(track.id);
        uniqueTracks.push(track);
      }
    }
    
    // Ensure we don't exceed max tracks
    const finalTracks = uniqueTracks.slice(0, maxTracks);
    
    console.log(`[MORE] Final playlist: ${finalTracks.length} tracks (added ${finalTracks.length - currentTracks.length})`);
    
    return NextResponse.json({
      tracks: finalTracks,
      metadata: {
        source: 'more',
        original_tracks: currentTracks.length,
        additional_tracks: additionalTracksList.length,
        final_tracks: finalTracks.length,
        duplicates_removed: allTracks.length - uniqueTracks.length
      }
    });
    
  } catch (error) {
    console.error('Add more tracks error:', error);
    return NextResponse.json(
      { error: 'Failed to add more tracks', message: error.message },
      { status: 500 }
    );
  }
}