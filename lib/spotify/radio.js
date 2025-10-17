// web/lib/spotify/radio.js
// Track radio recommendations from Spotify

import { mapSpotifyTrack } from '../tracks/mapper.js';

/**
 * Validates if an ID is a valid Spotify track ID (22 chars base62)
 * @param {string} id - ID to validate
 * @returns {boolean} - true if valid
 */
function isValidTrackId(id) {
  return typeof id === 'string' && /^[0-9A-Za-z]{22}$/.test(id);
}

/**
 * Gets track radio recommendations from Spotify
 * @param {string} accessToken - Spotify access token
 * @param {Array} seedTrackIds - Array of track IDs to use as seeds
 * @param {Object} options - Options
 * @param {number} options.limit - Number of recommendations to get
 * @param {string} options.market - Market code
 * @returns {Promise<Array>} - Array of recommended tracks
 */
export async function radioFromRelatedTop(accessToken, seedTrackIds, {
  need = 15,
  perArtistTop = 5,
  market = 'ES',
  bannedArtistIds = new Set(),
  bannedArtistNames = new Set()
} = {}) {
  const H = { Authorization: `Bearer ${accessToken}` };
  const okId = id => /^[A-Za-z0-9]{22}$/.test(String(id||'').replace('spotify:track:',''));
  const seen = new Set(); const out = [];

  async function j(url){ const r = await fetch(url,{headers:H}); if(!r.ok) throw new Error(String(r.status)); return r.json(); }

  // 1) Normaliza seeds (ids de track válidos, únicos)
  const seeds = Array.from(new Set((seedTrackIds||[])
    .map(x => String(x||'').replace('spotify:track:','').trim())
    .filter(okId))).slice(0,20);

  for (const tid of seeds) {
    if (out.length >= need) break;
    // 2) track → artista principal
    let a0=null;
    try {
      const t = await j(`https://api.spotify.com/v1/tracks/${tid}`);
      a0 = t?.artists?.[0]?.id || null;
    } catch(e){ continue; }
    if(!a0) continue;
    if (bannedArtistIds.has(a0)) continue;

    // 3) top del artista principal (con market obligatorio)
    try {
      const tops = await j(`https://api.spotify.com/v1/artists/${a0}/top-tracks?market=${market}`);
      for (const tr of (tops?.tracks||[])) {
        const aidNames = (tr.artists||[]).map(a=>a.name);
        const badName = aidNames.some(n => bannedArtistNames.has((n||'').toLowerCase()));
        const badId   = (tr.artists||[]).some(a => bannedArtistIds.has(a.id));
        if (!tr?.id || seen.has(tr.id) || badName || badId) continue;
        seen.add(tr.id); out.push({ id: tr.id, uri: tr.uri, name: tr.name, artistNames: aidNames, preview_url: tr.preview_url || null, open_url: tr.external_urls?.spotify || `https://open.spotify.com/track/${tr.id}` });
        if (out.length >= need) break;
      }
      if (out.length >= need) continue;
    } catch {}

    // 4) artistas relacionados → top-tracks
    try {
      const rel = await j(`https://api.spotify.com/v1/artists/${a0}/related-artists`);
      const relTop = (rel?.artists||[]).filter(x=>x?.id && !bannedArtistIds.has(x.id)).slice(0,6);
      for (const ra of relTop) {
        const aname = (ra.name||'').toLowerCase();
        if (bannedArtistNames.has(aname)) continue;
        try {
          const tops = await j(`https://api.spotify.com/v1/artists/${ra.id}/top-tracks?market=${market}`);
          for (const tr of (tops?.tracks||[])) {
            const aidNames = (tr.artists||[]).map(a=>a.name);
            const badName = aidNames.some(n => bannedArtistNames.has((n||'').toLowerCase()));
            const badId   = (tr.artists||[]).some(a => bannedArtistIds.has(a.id));
            if (!tr?.id || seen.has(tr.id) || badName || badId) continue;
            seen.add(tr.id); out.push({ id: tr.id, uri: tr.uri, name: tr.name, artistNames: aidNames, preview_url: tr.preview_url || null, open_url: tr.external_urls?.spotify || `https://open.spotify.com/track/${tr.id}` });
            if (out.length >= need) break;
          }
        } catch {}
        if (out.length >= need) break;
      }
    } catch {}
  }
  return out.slice(0, need);
}

export async function getFromRelatedArtists(accessToken, artistIds, { need = 15 }) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const out = []; const seen = new Set();
  const fetchJson = async (url) => {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  };
  for (const a of (artistIds||[])) {
    if (out.length >= need) break;
    try {
      const rel = await fetchJson(`https://api.spotify.com/v1/artists/${a}/related-artists`);
      const topOfRelated = (rel?.artists||[]).slice(0,5);
      for (const r of topOfRelated) {
        if (!r?.id) continue;
        try {
          const tops = await fetchJson(`https://api.spotify.com/v1/artists/${r.id}/top-tracks`);
          for (const t of (tops?.tracks||[])) {
            if (!t?.id || seen.has(t.id)) continue;
            seen.add(t.id);
            out.push({ id: t.id, uri: t.uri, name: t.name, artistNames: (t.artists||[]).map(x=>x.name) });
            if (out.length >= need) break;
          }
        } catch {}
        if (out.length >= need) break;
      }
    } catch {}
  }
  return out;
}

/**
 * Gets artist radio recommendations from Spotify
 * @param {string} accessToken - Spotify access token
 * @param {Array} seedArtistIds - Array of artist IDs to use as seeds
 * @param {Object} options - Options
 * @param {number} options.limit - Number of recommendations to get
 * @param {string} options.market - Market code
 * @returns {Promise<Array>} - Array of recommended tracks
 */
export async function getArtistRadio(accessToken, seedArtistIds, options = {}) {
  const { limit = 20, market = 'from_token' } = options;
  
  console.log(`[ARTIST-RADIO] Starting artist radio collection for ${limit} target`);
  
  if (!Array.isArray(seedArtistIds) || seedArtistIds.length === 0) {
    console.log(`[ARTIST-RADIO] No seed artist IDs provided`);
    return [];
  }
  
  // Filter valid artist IDs (same format as track IDs)
  const validSeeds = seedArtistIds.filter(isValidTrackId);
  console.log(`[ARTIST-RADIO] Valid artist seeds: ${validSeeds.length}/${seedArtistIds.length}`);
  
  if (validSeeds.length === 0) {
    console.log(`[ARTIST-RADIO] No valid seed artist IDs found`);
    return [];
  }
  
  // Process seeds in batches of 5 (Spotify limit)
  const allCandidates = [];
  
  for (let i = 0; i < validSeeds.length; i += 5) {
    const batch = validSeeds.slice(i, i + 5);
    
    try {
      const url = `https://api.spotify.com/v1/recommendations?seed_artists=${batch.join(',')}&limit=20&market=${market}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const tracks = data.tracks || [];
        
        console.log(`[ARTIST-RADIO] Got ${tracks.length} recommendations for artist batch ${Math.floor(i/5) + 1}`);
        
        for (const track of tracks) {
          if (!isValidTrackId(track.id)) continue;
          allCandidates.push(mapSpotifyTrack(track));
        }
      } else {
        console.warn(`[ARTIST-RADIO] Artist batch failed: ${response.status}`);
      }
    } catch (error) {
      console.warn(`[ARTIST-RADIO] Artist batch error:`, error.message);
    }
  }
  
  // Deduplicate by track ID
  const uniqueCandidates = [];
  const seenIds = new Set();
  
  for (const track of allCandidates) {
    if (seenIds.has(track.id)) continue;
    seenIds.add(track.id);
    uniqueCandidates.push(track);
  }
  
  const result = uniqueCandidates.slice(0, limit);
  console.log(`[ARTIST-RADIO] Returning ${result.length} unique recommendations`);
  
  return result;
}
