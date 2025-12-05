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
 * FEATURE_SPOTIFY_MARKET_FALLBACK: añade market configurable y fallback a seed_artists/genres si seed_tracks falla con 404
 * @param {string} accessToken - Spotify access token
 * @param {Array} seedTrackIds - Array of track IDs to use as seeds
 * @param {Object} options - Options
 * @param {number} options.need - Number of recommendations to get
 * @param {number} options.perArtistTop - Tracks per artist
 * @param {string} options.market - Market code (default from SPOTIFY_MARKET env or 'ES')
 * @param {Set} options.bannedArtistIds - Banned artist IDs
 * @param {Set} options.bannedArtistNames - Banned artist names
 * @param {Array} options.seedArtistIds - Fallback artist IDs if track seeds fail
 * @param {Array} options.seedGenres - Fallback genres if track seeds fail
 * @returns {Promise<Array>} - Array of recommended tracks
 */
export async function radioFromRelatedTop(accessToken, seedTrackIds, {
  need = 15,
  perArtistTop = 5,
  market = null,
  bannedArtistIds = new Set(),
  bannedArtistNames = new Set(),
  seedArtistIds = null,
  seedGenres = null
} = {}) {
  // Resolver market: env var > parámetro > default
  const resolvedMarket = market || process.env.SPOTIFY_MARKET || 'ES';
  
  const H = { Authorization: `Bearer ${accessToken}` };
  const okId = id => /^[A-Za-z0-9]{22}$/.test(String(id||'').replace('spotify:track:',''));
  const okArtistId = id => /^[A-Za-z0-9]{22}$/.test(String(id||''));
  const seen = new Set(); 
  const out = [];
  const radioFallbacks = [];

  async function j(url){ 
    const r = await fetch(url,{headers:H}); 
    if(!r.ok) {
      const status = r.status;
      if (status === 404) {
        radioFallbacks.push({ url, status, reason: '404' });
      }
      throw new Error(String(status)); 
    }
    return r.json(); 
  }

  // 1) Normaliza seeds (ids de track válidos, únicos)
  const seeds = Array.from(new Set((seedTrackIds||[])
    .map(x => String(x||'').replace('spotify:track:','').trim())
    .filter(okId))).slice(0,20);

  let trackSeedsFailed = false;
  const artistIdsCollected = new Set(); // Para usar como fallback si seed_tracks falla

  for (const tid of seeds) {
    if (out.length >= need) break;
    // 2) track → artista principal
    let a0=null;
    try {
      const t = await j(`https://api.spotify.com/v1/tracks/${tid}`);
      a0 = t?.artists?.[0]?.id || null;
      if (a0) artistIdsCollected.add(a0); // Guardar para fallback
    } catch(e){ 
      trackSeedsFailed = true;
      radioFallbacks.push({ trackId: tid, error: String(e), method: 'seed_track' });
      continue; 
    }
    if(!a0) continue;
    if (bannedArtistIds.has(a0)) continue;

    // 3) top del artista principal (con market obligatorio)
    try {
      const tops = await j(`https://api.spotify.com/v1/artists/${a0}/top-tracks?market=${resolvedMarket}`);
      for (const tr of (tops?.tracks||[])) {
        const aidNames = (tr.artists||[]).map(a=>a.name);
        const badName = aidNames.some(n => bannedArtistNames.has((n||'').toLowerCase()));
        const badId   = (tr.artists||[]).some(a => bannedArtistIds.has(a.id));
        if (!tr?.id || seen.has(tr.id) || badName || badId) continue;
        seen.add(tr.id); out.push({ 
          id: tr.id, 
          uri: tr.uri, 
          name: tr.name, 
          artists: tr.artists || [], // ✅ Keep full artist objects with { id, name }
          artistNames: aidNames, // For backward compatibility
          preview_url: tr.preview_url || null, 
          open_url: tr.external_urls?.spotify || `https://open.spotify.com/track/${tr.id}` 
        });
        if (out.length >= need) break;
      }
      if (out.length >= need) continue;
    } catch (err) {
      radioFallbacks.push({ artistId: a0, error: String(err), method: 'top_tracks' });
    }

    // 4) artistas relacionados → top-tracks
    // 🚨 MEJORA: Si related-artists falla, buscar artistas similares por género
    let relatedArtistsFound = false;
    try {
      const rel = await j(`https://api.spotify.com/v1/artists/${a0}/related-artists`);
      const relTop = (rel?.artists||[]).filter(x=>x?.id && !bannedArtistIds.has(x.id)).slice(0,6);
      relatedArtistsFound = relTop.length > 0;
      
      for (const ra of relTop) {
        const aname = (ra.name||'').toLowerCase();
        if (bannedArtistNames.has(aname)) continue;
        try {
          const tops = await j(`https://api.spotify.com/v1/artists/${ra.id}/top-tracks?market=${resolvedMarket}`);
          for (const tr of (tops?.tracks||[])) {
            const aidNames = (tr.artists||[]).map(a=>a.name);
            const badName = aidNames.some(n => bannedArtistNames.has((n||'').toLowerCase()));
            const badId   = (tr.artists||[]).some(a => bannedArtistIds.has(a.id));
            if (!tr?.id || seen.has(tr.id) || badName || badId) continue;
            seen.add(tr.id); out.push({ 
              id: tr.id, 
              uri: tr.uri, 
              name: tr.name, 
              artists: tr.artists || [], // ✅ Keep full artist objects with { id, name }
              artistNames: aidNames, // For backward compatibility
              preview_url: tr.preview_url || null, 
              open_url: tr.external_urls?.spotify || `https://open.spotify.com/track/${tr.id}` 
            });
            if (out.length >= need) break;
          }
        } catch (err) {
          radioFallbacks.push({ artistId: ra.id, error: String(err), method: 'related_top_tracks' });
        }
        if (out.length >= need) break;
      }
    } catch (err) {
      radioFallbacks.push({ artistId: a0, error: String(err), method: 'related_artists' });
      
      // 🚨 MEJORA: Si related-artists falla, usar directamente recommendations API con el artista como seed
      // Esto es más eficiente que buscar artistas similares manualmente
      if (out.length < need) {
        try {
          // Obtener información del artista principal (incluyendo géneros) para usarlos en recommendations
          const artistInfo = await j(`https://api.spotify.com/v1/artists/${a0}`);
          const artistGenres = artistInfo?.genres || [];
          
          // Usar recommendations API directamente con seed_artists (y opcionalmente seed_genres)
          const remaining = need - out.length;
          const params = new URLSearchParams();
          params.append('seed_artists', a0);
          
          // Añadir géneros si están disponibles (máximo 5 géneros)
          if (artistGenres.length > 0) {
            const validGenres = artistGenres
              .filter(g => g && typeof g === 'string' && g.length > 2)
              .map(g => g.toLowerCase().replace(/\s+/g, '-'))
              .slice(0, 2); // Máximo 2 géneros
            if (validGenres.length > 0) {
              params.append('seed_genres', validGenres.join(','));
            }
          }
          
          params.append('limit', String(Math.min(20, remaining)));
          params.append('market', resolvedMarket);
          
          const recUrl = `https://api.spotify.com/v1/recommendations?${params.toString()}`;
          const recResponse = await fetch(recUrl, { headers: H });
          
          if (recResponse.ok) {
            const recData = await recResponse.json();
            const recTracks = recData.tracks || [];
            
            console.log(`[RADIO-FALLBACK] Got ${recTracks.length} recommendations using artist ${a0} as seed (genres: ${artistGenres.slice(0, 2).join(', ')})`);
            
            for (const tr of recTracks) {
              if (out.length >= need) break;
              const aidNames = (tr.artists||[]).map(a=>a.name);
              const badName = aidNames.some(n => bannedArtistNames.has((n||'').toLowerCase()));
              const badId = (tr.artists||[]).some(a => bannedArtistIds.has(a.id));
              if (!tr?.id || seen.has(tr.id) || badName || badId) continue;
              seen.add(tr.id);
              out.push({ 
                id: tr.id, 
                uri: tr.uri, 
                name: tr.name, 
                artists: tr.artists || [], 
                artistNames: aidNames, 
                preview_url: tr.preview_url || null, 
                open_url: tr.external_urls?.spotify || `https://open.spotify.com/track/${tr.id}` 
              });
            }
            
            radioFallbacks.push({ 
              method: 'recommendations_direct_seed', 
              artistId: a0, 
              success: true, 
              tracksAdded: recTracks.length,
              genresUsed: artistGenres.slice(0, 2)
            });
          } else {
            console.warn(`[RADIO-FALLBACK] Direct recommendations failed for artist ${a0}: ${recResponse.status}`);
            radioFallbacks.push({ 
              method: 'recommendations_direct_seed', 
              artistId: a0, 
              error: recResponse.status 
            });
          }
        } catch (artistInfoErr) {
          console.warn(`[RADIO-FALLBACK] Failed to get recommendations for artist ${a0}:`, artistInfoErr);
          radioFallbacks.push({ 
            method: 'recommendations_direct_seed', 
            artistId: a0, 
            error: String(artistInfoErr) 
          });
        }
      }
    }
  }

  // FALLBACK: Si seed_tracks falló o no tenemos suficientes tracks, usar seed_artists/genres
  // 🚨 MEJORA: Obtener géneros del artista y hacer múltiples llamadas para más tracks
  if (trackSeedsFailed || out.length < need) {
    const fallbackArtists = seedArtistIds || Array.from(artistIdsCollected);
    let fallbackGenres = seedGenres || [];
    
    // 🚨 MEJORA: Obtener géneros de los artistas si no se proporcionaron
    if (fallbackGenres.length === 0 && fallbackArtists.length > 0) {
      const artistGenres = new Set();
      for (const artistId of fallbackArtists.slice(0, 3)) { // Obtener géneros de hasta 3 artistas
        try {
          const artistResponse = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, { headers: H });
          if (artistResponse.ok) {
            const artistData = await artistResponse.json();
            const genres = artistData.genres || [];
            // Filtrar géneros válidos (Spotify tiene géneros específicos)
            const validGenres = genres
              .filter(g => g && typeof g === 'string' && g.length > 2)
              .map(g => g.toLowerCase().replace(/\s+/g, '-')) // Normalizar formato
              .slice(0, 2); // Máximo 2 géneros por artista
            validGenres.forEach(g => artistGenres.add(g));
            console.log(`[RADIO-FALLBACK] Got genres for artist ${artistId}: ${validGenres.join(', ')}`);
          }
        } catch (err) {
          console.warn(`[RADIO-FALLBACK] Failed to get genres for artist ${artistId}:`, err);
        }
      }
      
      if (artistGenres.size > 0) {
        fallbackGenres = Array.from(artistGenres).slice(0, 5);
        console.log(`[RADIO-FALLBACK] Extracted genres from artists: ${fallbackGenres.join(', ')}`);
      } else {
        // Fallback genérico: si no hay géneros, usar géneros comunes basados en el mercado
        // Spotify API acepta géneros específicos: reggaeton, latin, trap-latino, hip-hop, rap, etc.
        if (resolvedMarket === 'ES' || resolvedMarket === 'US' || resolvedMarket === 'MX') {
          // Géneros válidos para música latina/reggaeton en Spotify
          fallbackGenres = ['reggaeton', 'latin', 'trap-latino'];
          console.log(`[RADIO-FALLBACK] Using default genres for market ${resolvedMarket}: ${fallbackGenres.join(', ')}`);
        } else {
          // Géneros genéricos para otros mercados
          fallbackGenres = ['pop', 'hip-hop'];
          console.log(`[RADIO-FALLBACK] Using default genres for market ${resolvedMarket}: ${fallbackGenres.join(', ')}`);
        }
      }
    }
    
    if (fallbackArtists.length > 0 || fallbackGenres.length > 0) {
      console.log(`[RADIO-FALLBACK] seed_tracks failed or insufficient tracks (${out.length}/${need}), using fallback: artists=${fallbackArtists.length}, genres=${fallbackGenres.length}`);
      radioFallbacks.push({ 
        reason: trackSeedsFailed ? 'seed_tracks_404' : 'insufficient_tracks',
        fallbackArtists: fallbackArtists.length,
        fallbackGenres: fallbackGenres.length
      });

      try {
        // 🚨 MEJORA: Hacer múltiples llamadas si es necesario para obtener más tracks
        const validArtistIds = fallbackArtists.filter(okArtistId).slice(0, 5);
        const validGenres = fallbackGenres.slice(0, 5);
        const remaining = need - out.length;
        
        if (validArtistIds.length > 0 || validGenres.length > 0) {
          // Hacer múltiples llamadas si necesitamos más de 20 tracks
          const callsNeeded = Math.ceil(remaining / 20);
          let totalAdded = 0;
          
          for (let call = 0; call < callsNeeded && out.length < need; call++) {
            const params = new URLSearchParams();
            if (validArtistIds.length > 0) params.append('seed_artists', validArtistIds.join(','));
            if (validGenres.length > 0) params.append('seed_genres', validGenres.join(','));
            params.append('limit', String(Math.min(20, need - out.length)));
            params.append('market', resolvedMarket);

            const recUrl = `https://api.spotify.com/v1/recommendations?${params.toString()}`;
            const recResponse = await fetch(recUrl, { headers: H });
            
            if (recResponse.ok) {
              const recData = await recResponse.json();
              const recTracks = recData.tracks || [];
              
              console.log(`[RADIO-FALLBACK] Call ${call + 1}/${callsNeeded}: Got ${recTracks.length} recommendations from fallback`);
              
              for (const tr of recTracks) {
                if (out.length >= need) break;
                const aidNames = (tr.artists||[]).map(a=>a.name);
                const badName = aidNames.some(n => bannedArtistNames.has((n||'').toLowerCase()));
                const badId = (tr.artists||[]).some(a => bannedArtistIds.has(a.id));
                if (!tr?.id || seen.has(tr.id) || badName || badId) continue;
                seen.add(tr.id);
                out.push({ 
                  id: tr.id, 
                  uri: tr.uri, 
                  name: tr.name, 
                  artists: tr.artists || [], // ✅ Keep full artist objects with { id, name }
                  artistNames: aidNames, // For backward compatibility
                  preview_url: tr.preview_url || null, 
                  open_url: tr.external_urls?.spotify || `https://open.spotify.com/track/${tr.id}` 
                });
                totalAdded++;
              }
              
              if (recTracks.length < 20) break; // Si Spotify devuelve menos de 20, no hay más
            } else {
              console.warn(`[RADIO-FALLBACK] Call ${call + 1} failed: ${recResponse.status}`);
              if (call === 0) {
                radioFallbacks.push({ method: 'recommendations_fallback', error: recResponse.status });
              }
              break; // Si falla, no intentar más llamadas
            }
          }
          
          if (totalAdded > 0) {
            radioFallbacks.push({ method: 'recommendations_fallback', success: true, tracksAdded: totalAdded, callsMade: callsNeeded });
          }
        }
      } catch (err) {
        console.warn(`[RADIO-FALLBACK] Error in fallback:`, err);
        radioFallbacks.push({ method: 'recommendations_fallback', error: String(err) });
      }
    }
  }

  // Log fallbacks si hay alguno
  if (radioFallbacks.length > 0) {
    console.log(`[RADIO-FALLBACK] Fallbacks used:`, JSON.stringify(radioFallbacks, null, 2));
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
