// FIXPACK: Mock de Spotify para desarrollo sin llamadas reales
// Permite probar la lógica sin autenticación real

export class MockSpotifyClient {
  constructor({ accessToken, userId }) {
    console.log('[MOCK-SPOTIFY] Created mock client for user:', userId);
    this.baseUrl = 'https://api.spotify.com/v1';
  }

  async getMe() {
    return {
      id: 'mock_user_id',
      display_name: 'Mock User',
      email: 'mock@example.com'
    };
  }

  async createPlaylist({ name, description, public: isPublic = true }) {
    console.log(`[MOCK-SPOTIFY] Creating playlist: "${name}"`);
    return {
      id: `mock_playlist_${Date.now()}`,
      name,
      description,
      public: isPublic,
      external_urls: {
        spotify: `https://open.spotify.com/playlist/mock_${Date.now()}`
      }
    };
  }

  async addTracks(playlistId, uris) {
    console.log(`[MOCK-SPOTIFY] Adding ${uris.length} tracks to playlist ${playlistId}`);
    return {
      snapshot_id: `mock_snapshot_${Date.now()}`
    };
  }

  async searchPlaylists(query, limit = 20) {
    console.log(`[MOCK-SPOTIFY] Searching playlists: "${query}"`);
    
    // FIXPACK: Mock playlists basadas en query
    const mockPlaylists = [];
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('primavera') || queryLower.includes('coachella')) {
      mockPlaylists.push({
        id: 'mock_festival_1',
        name: `${query} Official Playlist 2024`,
        description: 'Official festival playlist',
        followers: { total: 50000 },
        external_urls: { spotify: 'https://open.spotify.com/playlist/mock_festival_1' }
      });
    }
    
    if (queryLower.includes('viral') || queryLower.includes('tiktok')) {
      mockPlaylists.push({
        id: 'mock_viral_1',
        name: 'Viral TikTok España 2024',
        description: 'Los hits más virales de TikTok España',
        followers: { total: 100000 },
        external_urls: { spotify: 'https://open.spotify.com/playlist/mock_viral_1' }
      });
    }
    
    // Agregar playlists genéricas
    for (let i = 0; i < Math.min(limit - mockPlaylists.length, 5); i++) {
      mockPlaylists.push({
        id: `mock_playlist_${i}`,
        name: `${query} Playlist ${i + 1}`,
        description: `Mock playlist for ${query}`,
        followers: { total: Math.floor(Math.random() * 10000) },
        external_urls: { spotify: `https://open.spotify.com/playlist/mock_${i}` }
      });
    }
    
    return mockPlaylists;
  }

  async getPlaylistTracks(playlistId, limit = 100, offset = 0) {
    console.log(`[MOCK-SPOTIFY] Getting tracks from playlist ${playlistId}`);
    
    // FIXPACK: Mock tracks basados en playlist ID
    const mockTracks = [];
    const trackCount = Math.min(limit, 20); // Limitar para mocks
    
    for (let i = 0; i < trackCount; i++) {
      mockTracks.push({
        id: `mock_track_${playlistId}_${i}`,
        name: `Mock Track ${i + 1}`,
        artists: [
          { id: `mock_artist_${i}`, name: `Mock Artist ${i + 1}` }
        ],
        album: {
          name: `Mock Album ${i + 1}`,
          release_date: '2024-01-01'
        },
        popularity: Math.floor(Math.random() * 100),
        external_urls: {
          spotify: `https://open.spotify.com/track/mock_track_${i}`
        },
        preview_url: null,
        uri: `spotify:track:mock_track_${playlistId}_${i}`,
        duration_ms: 180000
      });
    }
    
    return mockTracks;
  }

  async getRecommendations(params) {
    console.log(`[MOCK-SPOTIFY] Getting recommendations with params:`, params);
    
    // FIXPACK: Mock recommendations basadas en seeds
    const mockRecommendations = [];
    const trackCount = Math.min(params.limit || 20, 20);
    
    for (let i = 0; i < trackCount; i++) {
      mockRecommendations.push({
        id: `mock_rec_${i}`,
        name: `Recommended Track ${i + 1}`,
        artists: [
          { id: `mock_rec_artist_${i}`, name: `Recommended Artist ${i + 1}` }
        ],
        album: {
          name: `Recommended Album ${i + 1}`,
          release_date: '2024-01-01'
        },
        popularity: Math.floor(Math.random() * 100),
        external_urls: {
          spotify: `https://open.spotify.com/track/mock_rec_${i}`
        },
        preview_url: null,
        uri: `spotify:track:mock_rec_${i}`,
        duration_ms: 180000
      });
    }
    
    return mockRecommendations;
  }

  async getArtistTopTracks(artistId) {
    console.log(`[MOCK-SPOTIFY] Getting top tracks for artist ${artistId}`);
    
    const mockTracks = [];
    for (let i = 0; i < 10; i++) {
      mockTracks.push({
        id: `mock_artist_track_${artistId}_${i}`,
        name: `Top Track ${i + 1}`,
        artists: [
          { id: artistId, name: `Artist ${artistId}` }
        ],
        album: {
          name: `Album ${i + 1}`,
          release_date: '2024-01-01'
        },
        popularity: Math.floor(Math.random() * 100),
        external_urls: {
          spotify: `https://open.spotify.com/track/mock_artist_track_${i}`
        },
        preview_url: null,
        uri: `spotify:track:mock_artist_track_${artistId}_${i}`,
        duration_ms: 180000
      });
    }
    
    return mockTracks;
  }

  async searchTracks(query, limit = 20) {
    console.log(`[MOCK-SPOTIFY] Searching tracks: "${query}"`);
    
    const mockTracks = [];
    for (let i = 0; i < Math.min(limit, 10); i++) {
      mockTracks.push({
        id: `mock_search_track_${i}`,
        name: `Search Result ${i + 1}`,
        artists: [
          { id: `mock_search_artist_${i}`, name: `Search Artist ${i + 1}` }
        ],
        album: {
          name: `Search Album ${i + 1}`,
          release_date: '2024-01-01'
        },
        popularity: Math.floor(Math.random() * 100),
        external_urls: {
          spotify: `https://open.spotify.com/track/mock_search_track_${i}`
        },
        preview_url: null,
        uri: `spotify:track:mock_search_track_${i}`,
        duration_ms: 180000
      });
    }
    
    return mockTracks;
  }

  async getAudioFeatures(trackIds) {
    console.log(`[MOCK-SPOTIFY] Getting audio features for ${trackIds.length} tracks`);
    
    return trackIds.map(id => ({
      id,
      tempo: 120 + Math.random() * 40,
      energy: Math.random(),
      valence: Math.random(),
      acousticness: Math.random(),
      danceability: Math.random(),
      instrumentalness: Math.random() * 0.5
    }));
  }
}

// FIXPACK: Factory function para crear mock client
export function createMockSpotifyClient(session) {
  if (!session?.accessToken || !session?.user?.id) {
    console.log('[MOCK-SPOTIFY] Missing accessToken or userId in session');
    return null;
  }
  
  try {
    return new MockSpotifyClient({
      accessToken: session.accessToken,
      userId: session.user.id
    });
  } catch (error) {
    console.error('[MOCK-SPOTIFY] Failed to create mock client:', error);
    return null;
  }
}
