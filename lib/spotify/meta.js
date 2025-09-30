const API = 'https://api.spotify.com/v1';

export async function fetchTracksMeta(accessToken, ids) {
  const out = {};
  const uniq = Array.from(new Set(ids.filter(Boolean)));
  for (let i = 0; i < uniq.length; i += 50) {
    const chunk = uniq.slice(i, i + 50);
    const url = `${API}/tracks?ids=${encodeURIComponent(chunk.join(','))}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) { 
      console.warn('[META] /tracks batch failed', res.status); 
      continue; 
    }
    const data = await res.json().catch(() => ({}));
    const items = Array.isArray(data?.tracks) ? data.tracks : [];
    for (const t of items) {
      if (!t || !t.id) continue;
      const name = t.name || undefined;
      const artists = Array.isArray(t.artists) ? t.artists.map((a)=>a?.name).filter(Boolean) : undefined;
      out[t.id] = { name, artists };
    }
  }
  return out;
}
