import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const TRENDING_FILE = path.join(process.cwd(), 'data', 'trending_playlists.json');

// Ensure data directory exists
async function ensureDataDir() {
  const dataDir = path.dirname(TRENDING_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Read trending playlists
async function getTrendingPlaylists() {
  try {
    await fs.access(TRENDING_FILE);
    const data = await fs.readFile(TRENDING_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Write trending playlists
async function writeTrendingPlaylists(playlists) {
  await ensureDataDir();
  await fs.writeFile(TRENDING_FILE, JSON.stringify(playlists, null, 2));
}

// Generate dynamic playlist name using OpenAI
async function generateDynamicName(prompt) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'text',
        messages: [
          {
            role: 'system',
            content: `Genera un nombre de playlist profesional y atractivo basado en el prompt del usuario. 
            El nombre debe ser:
            - Breve (máximo 30 caracteres)
            - Estilizado y profesional
            - Atractivo visualmente
            - Mantener el tema/genre del prompt
            - Incluir emojis apropiados si es necesario
            - NO incluir "by JeyLabbb" (se agregará después)
            
            Ejemplos:
            "trap español para activarme" → "Trap Español 🔥 (Modo Activo)"
            "techno suave 2020s" → "Chill Techno (2020–2024 mix)"
            "reggaeton como Bad Bunny" → "Reggaeton Vibes 🎵"
            
            Responde SOLO con el nombre de la playlist, sin explicaciones adicionales.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 50,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API failed: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || `Playlist IA ${new Date().getFullYear()}`;
  } catch (error) {
    console.error('Error generating dynamic name:', error);
    return `Playlist IA ${new Date().getFullYear()}`;
  }
}

// POST: Register new trending playlist
export async function POST(request) {
  try {
    const body = await request.json();
    const { prompt, playlistName, playlistId, spotifyUrl, trackCount } = body;

    if (!prompt || !playlistId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate dynamic name if not provided
    let finalPlaylistName = playlistName;
    if (!playlistName || playlistName.trim() === '') {
      finalPlaylistName = await generateDynamicName(prompt);
    }

    const playlists = await getTrendingPlaylists();
    
    // Check if playlist already exists
    const existingIndex = playlists.findIndex(p => p.playlistId === playlistId);
    
    const playlistData = {
      id: Date.now().toString(), // Simple ID
      prompt: prompt,
      playlistName: finalPlaylistName,
      playlistId: playlistId,
      spotifyUrl: spotifyUrl,
      trackCount: trackCount || 0,
      views: 0,
      clicks: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      // Update existing playlist
      playlists[existingIndex] = { 
        ...playlists[existingIndex], 
        ...playlistData,
        views: playlists[existingIndex].views,
        clicks: playlists[existingIndex].clicks 
      };
    } else {
      // Add new playlist
      playlists.unshift(playlistData);
      
      // Keep only last 100 playlists
      if (playlists.length > 100) {
        play lists.slice(0, 100);
      }
    }

    await writeTrendingPlaylists(playlists);

    return NextResponse.json({ 
      success: true, 
      playlist: playlistData 
    });

  } catch (error) {
    console.error('Error saving trending playlist:', error);
    return NextResponse.json({ error: 'Failed to save playlist' }, { status: 500 });
  }
}

// GET: Retrieve trending playlists
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 20;
    const sortBy = searchParams.get('sortBy') || 'recent'; // 'recent', 'views', 'clicks'

    const playlists = await getTrendingPlaylists();

    let sortedPlaylists = [...playlists];
    
    switch (sortBy) {
      case 'views':
        sortedPlaylists.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'clicks':
        sortedPlaylists.sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
        break;
      case 'recent':
      default:
        sortedPlaylists.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
    }

    const limitedPlaylists = sortedPlaylists.slice(0, limit);

    return NextResponse.json({
      success: true,
      playlists: limitedPlaylists,
      total: playlists.length
    });

  } catch (error) {
    console.error('Error retrieving trending playlists:', error);
    return NextResponse.json({ error: 'Failed to retrieve playlists' }, { status: 500 });
  }
}

// Increment view count (separate endpoint for tracking)
export async function PUT(request) {
  try {
    const body = await request.json();
    const { playlistId, type = 'view' } = body; // 'view' or 'click'

    if (!playlistId) {
      return NextResponse.json({ error: 'Missing playlistId' }, { status: 400 });
    }

    const playlists = await getTrendingPlaylists();
    const playlistIndex = playlists.findIndex(p => p.playlistId === playlistId);

    if (playlistIndex === -1) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    if (type === 'view') {
      playlists[playlistIndex].views = (playlists[playlistIndex].views || 0) + 1;
    } else if (type === 'click') {
      playlists[playlistIndex].clicks = (playlists[playlistIndex].clicks || 0) + 1;
    }

    playlists[playlistIndex].updatedAt = new Date().toISOString();
    
    await writeTrendingPlaylists(playlists);

    return NextResponse.json({ 
      success: true, 
      playlist: playlists[playlistIndex] 
    });

  } catch (error) {
    console.error('Error updating playlist stats:', error);
    return NextResponse.json({ error: 'Failed to update playlist' }, { status: 500 });
  }
}
