// FIXPACK: SpotifyClient unificado para manejar autenticación y operaciones de Spotify
// Evita errores 403 y tokens indefinidos centralizando la lógica de autenticación

export class SpotifyClient {
  constructor({ accessToken, userId }) {
    if (!accessToken || !userId) {
      throw new Error('SpotifyClient requires both accessToken and userId');
    }
    this.accessToken = accessToken;
    this.userId = userId;
    this.baseUrl = 'https://api.spotify.com/v1';
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Spotify API error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  async getMe() {
    return this.request('/me');
  }

  async createPlaylist({ name, description, public: isPublic = true }) {
    return this.request(`/users/${this.userId}/playlists`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        description,
        public: isPublic,
      }),
    });
  }

  async addTracks(playlistId, uris) {
    return this.request(`/playlists/${playlistId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ uris }),
    });
  }

  async searchPlaylists(query, limit = 20) {
    const response = await this.request(`/search?q=${encodeURIComponent(query)}&type=playlist&limit=${limit}&market=from_token`);
    return response.playlists?.items || [];
  }

  async getPlaylistTracks(playlistId, limit = 100, offset = 0) {
    const response = await this.request(`/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}&market=from_token`);
    return response.items?.map(item => item.track).filter(track => track && track.id) || [];
  }

  async getRecommendations(params) {
    const searchParams = new URLSearchParams();
    
    if (params.seed_artists?.length) searchParams.append('seed_artists', params.seed_artists.join(','));
    if (params.seed_tracks?.length) searchParams.append('seed_tracks', params.seed_tracks.join(','));
    if (params.seed_genres?.length) searchParams.append('seed_genres', params.seed_genres.join(','));
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.market) searchParams.append('market', params.market);
    
    // Add target features
    if (params.target_features) {
      Object.entries(params.target_features).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(`target_${key}`, value.toString());
      });
    }

    const response = await this.request(`/recommendations?${searchParams.toString()}`);
    return response.tracks || [];
  }

  async getArtistTopTracks(artistId) {
    const response = await this.request(`/artists/${artistId}/top-tracks?market=from_token`);
    return response.tracks || [];
  }

  async searchTracks(query, limit = 20) {
    const response = await this.request(`/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}&market=from_token`);
    return response.tracks?.items || [];
  }

  async getAudioFeatures(trackIds) {
    if (trackIds.length === 0) return [];
    const response = await this.request(`/audio-features?ids=${trackIds.join(',')}`);
    return response.audio_features || [];
  }
}

// FIXPACK: Factory function para crear cliente con validación de sesión
export function createSpotifyClient(session) {
  // FIXPACK: Usar mock en desarrollo si está habilitado
  if (process.env.USE_MOCK_SPOTIFY === 'true') {
    console.log('[SPOTIFY-CLIENT] Using mock client for development');
    const { createMockSpotifyClient } = require('./mock');
    return createMockSpotifyClient(session);
  }
  
  if (!session?.accessToken || !session?.user?.id) {
    console.log('[SPOTIFY-CLIENT] Missing accessToken or userId in session');
    return null;
  }
  
  try {
    return new SpotifyClient({
      accessToken: session.accessToken,
      userId: session.user.id
    });
  } catch (error) {
    console.error('[SPOTIFY-CLIENT] Failed to create client:', error);
    return null;
  }
}

// FIXPACK: Factory para cliente simple con solo fetch
export function createSpotifyClientSimple(accessToken) {
  return {
    fetch: (path, init = {}) => fetch(`https://api.spotify.com${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(init.headers || {})
      }
    })
  };
}
