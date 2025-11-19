import { SpotifyClient } from './client';
import { getHubAccessToken } from './hubAuth';

function ensureHubUserId() {
  const userId = process.env.PLEIA_HUB_USER_ID;
  if (!userId) {
    throw new Error('PLEIA_HUB_USER_ID no está configurado');
  }
  return userId;
}

export async function hubCreatePlaylist(params: {
  name: string;
  description?: string;
  public?: boolean;
}) {
  const accessToken = await getHubAccessToken();
  const userId = ensureHubUserId();

  const client = new SpotifyClient({
    userId,
    authHeaders: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return client.createPlaylist({
    name: params.name,
    description: params.description ?? '',
    public: params.public ?? true,
  });
}

export async function hubAddTracks(playlistId: string, uris: string[]) {
  if (!uris.length) return;

  const accessToken = await getHubAccessToken();
  const userId = ensureHubUserId();

  const client = new SpotifyClient({
    userId,
    authHeaders: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const chunkSize = 100;
  for (let i = 0; i < uris.length; i += chunkSize) {
    const chunk = uris.slice(i, i + chunkSize);
    await client.addTracks(playlistId, chunk);
  }
}

