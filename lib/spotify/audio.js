// web/lib/spotify/audio.js
export async function addAudioFeatures(accessToken, tracks = []) {
  try {
    if (!accessToken || !Array.isArray(tracks) || tracks.length === 0) return tracks;

    const ids = tracks
      .map(t => t?.id || (t?.uri?.startsWith('spotify:track:') ? t.uri.split(':')[2] : null))
      .filter(Boolean);

    if (ids.length === 0) return tracks;

    const out = [];
    const batchSize = 100;
    for (let i = 0; i < ids.length; i += batchSize) {
      const slice = ids.slice(i, i + batchSize);
      const url = `https://api.spotify.com/v1/audio-features?ids=${encodeURIComponent(slice.join(','))}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) {
        console.warn('[AUDIO] features fetch failed', await res.text());
        // Fallback: empuja sin features para este batch
        out.push(...tracks.slice(i, i + batchSize));
        continue;
      }
      const data = await res.json();
      const mapById = new Map((data?.audio_features || []).filter(Boolean).map(f => [f.id, f]));
      // Mezcla features en los tracks correspondientes del rango actual
      const ranged = tracks.slice(i, i + batchSize).map(t => {
        const id = t?.id || (t?.uri?.startsWith('spotify:track:') ? t.uri.split(':')[2] : null);
        const features = id ? mapById.get(id) : null;
        return features ? { ...t, audio_features: features } : t;
      });
      out.push(...ranged);
    }
    return out;
  } catch (err) {
    console.warn('[AUDIO] unexpected error', err);
    return tracks; // Nunca romper el flujo
  }
}
