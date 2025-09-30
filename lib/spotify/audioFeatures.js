const SPOTIFY_API = 'https://api.spotify.com/v1';

function toTrackId(x) {
  if (!x) return null;
  // spotify:track:ID
  let m = x.match(/spotify:track:([A-Za-z0-9]{22})/);
  if (m) return m[1];
  // https://open.spotify.com/track/ID
  m = x.match(/open\.spotify\.com\/track\/([A-Za-z0-9]{22})/);
  if (m) return m[1];
  // puede que ya sea un id
  if (/^[A-Za-z0-9]{22}$/.test(x)) return x;
  return null;
}

export async function fetchAudioFeaturesSafe(accessToken, urisOrIds) {
  try {
    const ids = Array.from(
      new Set(
        urisOrIds
          .map(toTrackId)
          .filter((v) => !!v)
      )
    );

    const chunks = [];
    for (let i = 0; i < ids.length; i += 100) chunks.push(ids.slice(i, i + 100));

    const out = {};
    for (const c of chunks) {
      const url = `${SPOTIFY_API}/audio-features?ids=${encodeURIComponent(c.join(','))}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) {
        // Si hay 403/4xx/5xx, NO rompemos: seguimos sin features
        console.warn('[AUDIO] features batch failed', res.status);
        continue;
      }
      const data = await res.json().catch(() => ({}));
      const list = Array.isArray(data?.audio_features) ? data.audio_features : [];
      for (const f of list) {
        if (f && f.id) out[f.id] = f;
      }
    }
    return out; // si está vacío, tu pipeline seguirá con fallback
  } catch (e) {
    console.warn('[AUDIO] features fetch error', e);
    return {};
  }
}
