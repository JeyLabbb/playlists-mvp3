// FIXPACK: SpotifyClient unificado para manejar autenticación y operaciones de Spotify
// Evita errores 403 y tokens indefinidos centralizando la lógica de autenticación

export class SpotifyClient {
  constructor({ userId, baseUrl = 'https://api.spotify.com/v1', authHeaders = {} }) {
    if (!userId) {
      throw new Error('SpotifyClient requires userId');
    }

    this.userId = userId;
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.authHeaders = authHeaders;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeaders,
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

  const useUnofficial = process.env.USE_UNOFFICIAL_SPOTIFY_API === 'true';

  const buildUnofficialHeaders = (apiKey) => {
    const headers = {};
    const headerName = process.env.UNOFFICIAL_SPOTIFY_AUTH_HEADER || 'Authorization';
    const headerPrefix = process.env.UNOFFICIAL_SPOTIFY_AUTH_PREFIX || 'Bearer';

    if (apiKey) {
      const headerValue = headerPrefix
        ? `${headerPrefix} ${apiKey}`.trim()
        : apiKey;
      headers[headerName] = headerValue;
    }

    const extraHeaders = process.env.UNOFFICIAL_SPOTIFY_EXTRA_HEADERS;
    if (extraHeaders) {
      extraHeaders.split(';').forEach(entry => {
        const [rawKey, ...rawValue] = entry.split('=');
        const key = rawKey?.trim();
        const value = rawValue.join('=').trim();
        if (key && value) {
          headers[key] = value;
        }
      });
    }

    return headers;
  };

  if (useUnofficial) {
    const baseUrl = (process.env.UNOFFICIAL_SPOTIFY_BASE_URL || 'https://api.spotify.com/v1').trim();
    const userId = process.env.UNOFFICIAL_SPOTIFY_USER_ID || session?.user?.id;
    const apiKey = process.env.UNOFFICIAL_SPOTIFY_API_KEY;

    console.log('[SPOTIFY-CLIENT] USE_UNOFFICIAL_SPOTIFY_API=true', {
      baseUrl,
      sessionUser: session?.user?.id,
      userId,
      extraHeaders: process.env.UNOFFICIAL_SPOTIFY_EXTRA_HEADERS || '(none)',
    });

    if (!apiKey) {
      console.error('[SPOTIFY-CLIENT] Missing UNOFFICIAL_SPOTIFY_API_KEY');
      return null;
    }

    if (!userId) {
      console.error('[SPOTIFY-CLIENT] Missing UNOFFICIAL_SPOTIFY_USER_ID (or session user id)');
      return null;
    }

    try {
      return new SpotifyClient({
        userId,
        baseUrl,
        authHeaders: buildUnofficialHeaders(apiKey),
      });
    } catch (error) {
      console.error('[SPOTIFY-CLIENT] Failed to create unofficial client:', error);
      return null;
    }
  }
  
  if (!session?.accessToken || !session?.user?.id) {
    console.log('[SPOTIFY-CLIENT] Missing accessToken or userId in session');
    return null;
  }
  
  try {
    return new SpotifyClient({
      userId: session.user.id,
      baseUrl: (process.env.SPOTIFY_API_BASE_URL || 'https://api.spotify.com/v1').trim(),
      authHeaders: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });
  } catch (error) {
    console.error('[SPOTIFY-CLIENT] Failed to create client:', error);
    return null;
  }
}

// FIXPACK: Factory para cliente simple con solo fetch
export function createSpotifyClientSimple(accessToken) {
  const useUnofficial = process.env.USE_UNOFFICIAL_SPOTIFY_API === 'true';
  const baseUrl = (useUnofficial
    ? process.env.UNOFFICIAL_SPOTIFY_BASE_URL || 'https://api.spotify.com/v1'
    : process.env.SPOTIFY_API_BASE_URL || 'https://api.spotify.com').trim();

  const authHeaders = useUnofficial
    ? (() => {
        const apiKey = process.env.UNOFFICIAL_SPOTIFY_API_KEY;
        if (!apiKey) {
          console.error('[SPOTIFY-CLIENT] Missing UNOFFICIAL_SPOTIFY_API_KEY for simple client');
          return {};
        }
        const headers = {};
        const headerName = process.env.UNOFFICIAL_SPOTIFY_AUTH_HEADER || 'Authorization';
        const headerPrefix = process.env.UNOFFICIAL_SPOTIFY_AUTH_PREFIX || 'Bearer';
        const headerValue = headerPrefix
          ? `${headerPrefix} ${apiKey}`.trim()
          : apiKey;
        headers[headerName] = headerValue;

        const extraHeaders = process.env.UNOFFICIAL_SPOTIFY_EXTRA_HEADERS;
        if (extraHeaders) {
          console.log('[SPOTIFY-CLIENT] Applying extra headers for simple client:', extraHeaders);
          extraHeaders.split(';').forEach(entry => {
            const [rawKey, ...rawValue] = entry.split('=');
            const key = rawKey?.trim();
            const value = rawValue.join('=').trim();
            if (key && value) {
              headers[key] = value;
            }
          });
        }

        return headers;
      })()
    : { Authorization: `Bearer ${accessToken}` };

  return {
    fetch: (path, init = {}) => {
      const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      if (useUnofficial) {
        console.log('[SPOTIFY-CLIENT] Fetching (unofficial):', `${normalizedBase}${normalizedPath}`);
      }
      return fetch(`${normalizedBase}${normalizedPath}`, {
        ...init,
        headers: {
          ...authHeaders,
          ...(init.headers || {}),
        },
      });
    }
  };
}
