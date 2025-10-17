import { NextResponse } from 'next/server';

// Example tracks for demo playlists (no Spotify API required)
const EXAMPLE_TRACKS = {
  '37i9dQZF1DX8Uebhn9wzrS': [ // Reggaeton Underground
    { name: 'Dakiti', artists: ['Bad Bunny', 'Jhayco'], id: '1' },
    { name: 'Tití Me Preguntó', artists: ['Bad Bunny'], id: '2' },
    { name: 'Me Porto Bonito', artists: ['Bad Bunny', 'Chencho Corleone'], id: '3' },
    { name: 'Un Coco', artists: ['Bad Bunny'], id: '4' },
    { name: 'Efecto', artists: ['Bad Bunny'], id: '5' },
    { name: 'Neverita', artists: ['Bad Bunny'], id: '6' },
    { name: 'La Jumpa', artists: ['Arcángel', 'Bad Bunny'], id: '7' },
    { name: 'Ojitos Lindos', artists: ['Bad Bunny', 'Bomba Estéreo'], id: '8' },
    { name: 'Yo No Soy Celoso', artists: ['Bad Bunny'], id: '9' },
    { name: 'Party', artists: ['Bad Bunny', 'Rauw Alejandro'], id: '10' },
    { name: 'Un Ratito', artists: ['Bad Bunny'], id: '11' },
    { name: 'Tarot', artists: ['Bad Bunny', 'Jhayco'], id: '12' },
    { name: 'Moscow Mule', artists: ['Bad Bunny'], id: '13' },
    { name: 'Después de la Playa', artists: ['Bad Bunny'], id: '14' },
    { name: 'Aguacero', artists: ['Bad Bunny'], id: '15' }
  ],
  '37i9dQZF1DX8jpyvTAre41': [ // Focus Music
    { name: 'Weightless', artists: ['Marconi Union'], id: '16' },
    { name: 'Rain Sounds', artists: ['Nature Sounds'], id: '17' },
    { name: 'Ocean Waves', artists: ['Ambient Sounds'], id: '18' },
    { name: 'Forest Birds', artists: ['Nature Sounds'], id: '19' },
    { name: 'Piano Meditation', artists: ['Ambient Piano'], id: '20' },
    { name: 'White Noise', artists: ['Focus Sounds'], id: '21' },
    { name: 'Brown Noise', artists: ['Focus Sounds'], id: '22' },
    { name: 'Rain on Leaves', artists: ['Nature Sounds'], id: '23' },
    { name: 'Thunderstorm', artists: ['Nature Sounds'], id: '24' },
    { name: 'Wind Through Trees', artists: ['Nature Sounds'], id: '25' }
  ],
  '37i9dQZF1DX8h3q2QqJj2N': [ // Latin Hits
    { name: 'Dakiti', artists: ['Bad Bunny', 'Jhayco'], id: '26' },
    { name: 'Tití Me Preguntó', artists: ['Bad Bunny'], id: '27' },
    { name: 'Me Porto Bonito', artists: ['Bad Bunny', 'Chencho Corleone'], id: '28' },
    { name: 'Un Coco', artists: ['Bad Bunny'], id: '29' },
    { name: 'Efecto', artists: ['Bad Bunny'], id: '30' },
    { name: 'Neverita', artists: ['Bad Bunny'], id: '31' },
    { name: 'La Jumpa', artists: ['Arcángel', 'Bad Bunny'], id: '32' },
    { name: 'Ojitos Lindos', artists: ['Bad Bunny', 'Bomba Estéreo'], id: '33' },
    { name: 'Yo No Soy Celoso', artists: ['Bad Bunny'], id: '34' },
    { name: 'Party', artists: ['Bad Bunny', 'Rauw Alejandro'], id: '35' }
  ],
  '37i9dQZF1DXcBWIGoYBM5M': [ // Chill Beats
    { name: 'Lofi Hip Hop', artists: ['Chill Beats'], id: '36' },
    { name: 'Ambient Study', artists: ['Focus Music'], id: '37' },
    { name: 'Jazz Chill', artists: ['Smooth Jazz'], id: '38' },
    { name: 'Synthwave', artists: ['Retro Wave'], id: '39' },
    { name: 'Downtempo', artists: ['Chill Electronic'], id: '40' },
    { name: 'Acoustic Vibes', artists: ['Acoustic'], id: '41' },
    { name: 'Piano Chill', artists: ['Piano'], id: '42' },
    { name: 'Guitar Loops', artists: ['Guitar'], id: '43' },
    { name: 'Ambient Drone', artists: ['Ambient'], id: '44' },
    { name: 'Chill House', artists: ['House'], id: '45' }
  ],
  '37i9dQZF1DX9QY2w5G5W9m': [ // Spanish Rock
    { name: 'La Flaca', artists: ['Jarabe de Palo'], id: '46' },
    { name: 'Camino Soria', artists: ['Extremoduro'], id: '47' },
    { name: 'Malamente', artists: ['Rosalía'], id: '48' },
    { name: 'El Universo Sobre Mí', artists: ['Amaral'], id: '49' },
    { name: 'Pienso en Ti', artists: ['Jarabe de Palo'], id: '50' },
    { name: 'Malas Compañías', artists: ['Extremoduro'], id: '51' },
    { name: 'Sin Ti No Soy Nada', artists: ['Amaral'], id: '52' },
    { name: 'Agua', artists: ['Jarabe de Palo'], id: '53' },
    { name: 'La Verdad', artists: ['Extremoduro'], id: '54' },
    { name: 'Te Necesito', artists: ['Amaral'], id: '55' }
  ]
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const playlistId = searchParams.get('id');

    if (!playlistId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Playlist ID is required' 
      }, { status: 400 });
    }

    const tracks = EXAMPLE_TRACKS[playlistId];
    
    if (!tracks) {
      return NextResponse.json({ 
        success: false, 
        error: 'Playlist not found' 
      }, { status: 404 });
    }

    // Convert to the format expected by the frontend
    const formattedTracks = tracks.map(track => ({
      name: track.name,
      artists: track.artists,
      artistNames: track.artists,
      id: track.id,
      open_url: `https://open.spotify.com/track/${track.id}`
    }));

    return NextResponse.json({
      success: true,
      tracks: formattedTracks,
      total: formattedTracks.length,
      source: 'example'
    });

  } catch (error) {
    console.error('Error getting example tracks:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to get tracks' 
    }, { status: 500 });
  }
}
