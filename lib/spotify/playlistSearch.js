import { mapSpotifyTrack } from '../tracks/mapper.js';

// Helper constants and functions
const ID22 = /^[0-9A-Za-z]{22}$/;

function normalizeTrack(it) {
  const track = it?.track || it || {};
  const id = track.id || (track.uri?.split(':').pop());
  const name = track.name || '';
  const artistsArr = Array.isArray(track.artists) ? track.artists : [];
  const artistNames = artistsArr.map(a => a?.name).filter(Boolean);
  const artistNamesString = artistNames.join(', ') || 'Artista desconocido';


  return {
    id,
    uri: track.uri || (id ? `spotify:track:${id}` : undefined),
    name,
    artists: artistsArr,
    artistNames: artistNamesString, // ← SIEMPRE string
    preview_url: track.preview_url || null,
    open_url: track.external_urls?.spotify || (id ? `https://open.spotify.com/track/${id}` : undefined),
    track,       // ← crudo por si hace falta
  };
}

function toUriFromAny(track) {
  if (!track) return null;
  if (typeof track.uri === 'string' && track.uri.startsWith('spotify:track:')) return track.uri;
  const ext = track.external_urls?.spotify || track.external_url;
  if (typeof ext === 'string' && ext.includes('/track/')) {
    const id = ext.split('/track/')[1]?.split('?')[0];
    return ID22.test(id || '') ? `spotify:track:${id}` : null;
  }
  if (ID22.test(track.id || '')) return `spotify:track:${track.id}`;
  return null;
}

function artistNamesOf(track) {
  const arr = Array.isArray(track?.artists) ? track.artists : [];
  return arr.map(a => a?.name).filter(Boolean);
}

/**
 * Normalize text for comparison (remove accents, punctuation, lowercase)
 */
function normalizeText(text) {
  return (text || "")
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\p{L}\p{N}\s]/gu, '') // Remove punctuation (Unicode-aware)
    .replace(/\s+/g, ' ') // Collapse spaces
    .trim();
}

/**
 * Enhanced normalization function for relaxed filtering
 */
function norm(s = '') {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita tildes
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '') // fuera emojis
    .replace(/[^a-z0-9\s]/g, ' ') // guiones, signos -> espacio
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate search query variants
 */
function generateQueryVariants(baseQuery, year) {
  const q0 = normalizeText(baseQuery);
  const queries = [q0, year ? `${q0} ${year}` : null, year ? `${year} ${q0}` : null].filter(Boolean);
  
  return queries;
}

/**
 * Search for playlists on Spotify
 */
export async function searchPlaylists(accessToken, query, limit = 12) {
  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=playlist&limit=${limit}`;
  
  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (!response.ok) {
      console.warn(`[PL-SEARCH] Failed to search playlists for "${query}": ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    return data.playlists?.items || [];
  } catch (error) {
    console.warn(`[PL-SEARCH] Error searching playlists for "${query}":`, error.message);
    return [];
  }
}

/**
 * Generate query variants for VIRAL mode fallback
 */
function viralQueryVariants(base, year) {
  const cleaned = base
    .replace(/\bk-?pop\b/gi, 'kpop')      // k-pop -> kpop
    .replace(/\bgirl\s+groups?\b/gi, 'girl group'); // normaliza plural
  const baseOnly = cleaned.trim();

  const v = new Set([
    baseOnly,
    year ? `${baseOnly} ${year}` : baseOnly,
    year ? `${year} ${baseOnly}` : baseOnly,
    baseOnly.replace(/\s+/g, ' '),                     // colapsa espacios
    baseOnly.replace(/-/g, ' '),                       // quita guiones
    baseOnly.replace(/\bgirl group\b/gi, 'girl groups kpop'),
    baseOnly.replace(/\bkpop\b/gi, 'k-pop'),
    baseOnly.replace(/\bgirl groups?\b/gi, 'gg kpop'),
  ]);
  return [...v].filter(Boolean);
}

/**
 * Raw playlist search without filtering (for rescue)
 */
async function rawPlaylistSearch(accessToken, query, { limit = 10 } = {}) {
  try {
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=playlist&limit=${limit}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.playlists?.items || [];
  } catch (e) {
    console.error('[RAW-SEARCH] error:', e);
    return [];
  }
}

/**
 * Search for festival-like playlists with relaxed filtering and robust guards
 */
export async function searchFestivalLikePlaylists({ accessToken, baseQuery, year }) {
  try {
    const MIN_FOLLOWERS = 10; // antes era alto; bájalo
    
    // Guard: validate inputs
    if (!accessToken || !baseQuery) {
      console.warn('[PL-SEARCH] Missing required params');
      return [];
    }
    
    // Always keep name+year together when year is provided; avoid base-only variant when year exists
    const qVariants = year ? [
      `${baseQuery} ${year}`.trim(),
      `${year} ${baseQuery}`.trim(),
      `${baseQuery} ${year} lineup`.trim(),
      `${baseQuery} lineup ${year}`.trim()
    ] : [
      baseQuery
    ];

    // 1) intento normal (lo que ya tienes)
    let found = await searchPlaylists(accessToken, qVariants[0]); // ya existente
    
    // Guard: ensure found is array
    let safe = Array.isArray(found) ? found.filter(p => p && p.id && p.name) : [];
    console.log(`[PL-SEARCH] found=${safe.length}`);

    // 2) si 0, variantes
    if (!safe.length) {
      console.log('[PL-SEARCH] Trying variants...');
      const vars = viralQueryVariants(baseQuery, year);
      for (const q of vars) {
        const tmp = await searchPlaylists(accessToken, q);
        const tmpSafe = Array.isArray(tmp) ? tmp.filter(p => p && p.id && p.name) : [];
        if (tmpSafe.length) { 
          safe = tmpSafe; 
          console.log(`[PL-SEARCH] Found ${tmpSafe.length} with variant: "${q}"`);
          break; 
        }
      }
    }

    // 3) rescate: búsqueda amplia si sigue 0
    if (!safe.length) {
      console.log('[PL-SEARCH] Trying raw search rescue...');
      safe = await rawPlaylistSearch(accessToken, baseQuery, { limit: 10 });
      console.log(`[PL-SEARCH] Raw rescue found=${safe.length}`);
    }

    const nq = norm(baseQuery);
    const yearStr = year ? String(year) : null;

    let filtered = safe.filter(p => {
      const title = norm(p.name || '');
      const desc  = norm(p.description || '');
      const text  = `${title} ${desc}`;

      const hasQuery = text.includes(nq);
      const hasYear  = yearStr ? text.includes(yearStr) : true;
      const okFollowers = (p.followers?.total ?? 0) >= MIN_FOLLOWERS;

      return hasQuery && hasYear && okFollowers && p.id;
    });

    // Fallback si quedó vacío: ignora año y followers, quédate con ID válido y título que contenga el query
    if (filtered.length === 0) {
      filtered = safe.filter(p => p?.id && norm(p.name||'').includes(nq));
      // si aún así 0, usa las primeras por si el nombre no coincide exactamente
      if (filtered.length === 0) filtered = safe.filter(p => p?.id).slice(0, 20);
    }

    // Únicas por ID
    const unique = [];
    const seen = new Set();
    for (const p of filtered) {
      if (p?.id && !seen.has(p.id)) { 
        seen.add(p.id); 
        unique.push(p); 
      }
    }
    console.log(`[PL-SEARCH] filtered=${unique.length}`);

    return unique;
  } catch (e) {
    console.error('[PL-SEARCH] error:', e);
    return [];
  }
}

/**
 * Filter playlists by name and year criteria
 */
function filterPlaylists(playlists, baseQuery, year) {
  const normalizedBase = normalizeText(baseQuery);
  const yearStr = year ? year.toString() : null;
  
  return playlists.filter(playlist => {
    if (!playlist?.name) return false;
    
    const normalizedName = normalizeText(playlist.name);
    
    // Must contain base query
    if (!normalizedName.includes(normalizedBase)) {
      return false;
    }
    
    // If year specified, must contain year (with some flexibility)
    if (yearStr) {
      const hasYear = normalizedName.includes(yearStr) || 
                     normalizedName.includes(yearStr.slice(-2)); // Allow "24" for "2024"
      if (!hasYear) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Get all tracks from a playlist and store in pl._items
 */
async function getPlaylistTracks(accessToken, playlistId) {
  const rawItems = [];
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;
  let totalLoaded = 0;
  const maxTracks = 200; // Cap at 200 tracks per playlist
  
  try {
    while (url && totalLoaded < maxTracks) {
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (!response.ok) {
        console.warn(`[PL-SEARCH] Failed to get tracks from playlist ${playlistId}: ${response.status}`);
        break;
      }
      
      const data = await response.json();
      const playlistTracks = data.items || [];
      
      for (const item of playlistTracks) {
        if (totalLoaded >= maxTracks) break;
        rawItems.push(item);
        totalLoaded++;
      }
      
      url = data.next;
    }
  } catch (error) {
    console.warn(`[PL-SEARCH] Error getting tracks from playlist ${playlistId}:`, error.message);
  }
  
  return rawItems;
}

// --- helpers ---
async function fetchPlaylistPage(accessToken, playlistId, offset = 0, limit = 100) {
  const url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?offset=${offset}&limit=${limit}&fields=items(track(id,uri,name,artists(name,id),album(id,name),type,is_local)),total`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`[SPOTIFY] tracks ${playlistId} ${res.status}`);
  return res.json();
}

/**
 * Carga items de varias playlists (paginado), con límite por playlist.
 * Devuelve array FLAT de tracks válidos (con id/uri).
 */
export async function loadPlaylistItemsBatch(
  accessToken,
  playlists,
  { limitPerPlaylist = 200 } = {}
) {
  if (!accessToken || !Array.isArray(playlists) || playlists.length === 0) return [];

  const results = [];
  // Concurrencia sencilla para no abusar
  const MAX_CONC = 3;
  let idx = 0;

  async function worker() {
    while (idx < playlists.length) {
      const p = playlists[idx++];
      const pid = p?.id || p;
      if (!pid) continue;

      let got = 0;
      let offset = 0;
      const perPage = 100;
      while (got < limitPerPlaylist) {
        const json = await fetchPlaylistPage(accessToken, pid, offset, perPage)
          .catch(() => null);
        if (!json || !Array.isArray(json.items)) break;

        const mapped = json.items
          .map(it => it?.track)
          .filter(t =>
            t && t.type === 'track' && !t.is_local &&
            t.id && t.uri && t.name && Array.isArray(t.artists) && t.artists.length
          )
          .map(normalizeTrack);

        results.push(...mapped);
        got += mapped.length;

        const pageCount = json.items.length;
        if (pageCount < perPage) break; // última página
        offset += perPage;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(MAX_CONC, playlists.length) }, worker));
  return results;
}

/**
 * Get artist top tracks (recent releases)
 */
async function getArtistTopRecent(accessToken, artistId, limit = 3) {
  try {
    const url = `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=ES&limit=${limit}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (!response.ok) {
      console.warn(`[PL-SEARCH] Failed to get top tracks for artist ${artistId}: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    return (data.tracks || []).map(track => mapSpotifyTrack(track));
  } catch (error) {
    console.warn(`[PL-SEARCH] Error getting top tracks for artist ${artistId}:`, error.message);
    return [];
  }
}

/**
 * Hace consenso + cap por artista.
 * - Ordena por frecuencia (cuántas playlists contienen el track)
 * - Dedupe por id
 * - Aplica cap por artista
 */
export async function collectFromPlaylistsByConsensus({
  accessToken,
  playlists,
  target = 50,
  artistCap = 3,
  rng = null, // RNG opcional para aleatoriedad
}) {
  const all = await loadPlaylistItemsBatch(accessToken, playlists, { limitPerPlaylist: 200 });
  console.log(`[PL-SEARCH] items_loaded_total=${all.length}`);

  if (!all.length) return [];

  // Frecuencia por track.id
  const freq = new Map();
  const byId = new Map();
  for (const t of all) {
    const id = t.id;
    if (!id) continue;
    byId.set(id, t);
    freq.set(id, (freq.get(id) || 0) + 1);
  }

  // Si hay RNG, usar muestreo ponderado; si no, orden determinístico
  if (rng) {
    // Muestreo ponderado con pesos basados en frecuencia
    const entries = [...freq.entries()].map(([id, freq]) => ({
      id,
      freq,
      track: byId.get(id),
      w: freq + 0.0001 // peso = frecuencia + pequeño epsilon
    }));

    /** weighted sample without replacement */
    function weightedSample(arr, k) {
      const out = [];
      const a = [...arr];
      while (out.length < k && a.length) {
        // Efraimidis–Spirakis keys
        const keys = a.map(x => ({ x, key: Math.pow(rng(), 1 / x.w) }));
        keys.sort((u, v) => v.key - u.key);
        out.push(keys[0].x);
        a.splice(a.indexOf(keys[0].x), 1);
      }
      return out;
    }

    const selected = weightedSample(entries, Math.min(target * 2, entries.length)); // Seleccionar más para aplicar límites
    const chosen = [];
    const seen = new Set();
    const artistCount = new Map();

    for (const entry of selected) {
      if (chosen.length >= target) break;
      if (seen.has(entry.id)) continue;
      const t = entry.track;
      if (!t) continue;

      const mainArtist = (t.artists?.[0]?.name || '').toLowerCase();
      const used = artistCount.get(mainArtist) || 0;
      if (used >= artistCap) continue;

      // Normalizar el campo artist para la preview
      const artistNames = Array.isArray(t.artists) ? t.artists.map(a => a?.name).filter(Boolean).join(', ') : '';
      const normalizedTrack = {
        ...t,
        artist: artistNames || t.artist || t.artistName || t.artist_names || '-',
        artistNames: artistNames || t.artistNames || t.artist || t.artistName || t.artist_names || 'Artista desconocido',
      };

      chosen.push(normalizedTrack);
      seen.add(entry.id);
      artistCount.set(mainArtist, used + 1);
    }

    console.log(`[CONSENSUS] weighted_sample=${chosen.length}/${target} cap=${artistCap}`);
    return chosen.slice(0, target);
  } else {
    // Orden determinístico (comportamiento original)
    const orderedIds = [...freq.entries()]
      .sort((a, b) => b[1] - a[1] || (byId.get(a[0]).name || '').localeCompare(byId.get(b[0]).name || ''))
      .map(([id]) => id);

    const chosen = [];
    const seen = new Set();
    const artistCount = new Map();

    for (const id of orderedIds) {
      if (chosen.length >= target) break;
      if (seen.has(id)) continue;
      const t = byId.get(id);
      if (!t) continue;

      const mainArtist = (t.artists?.[0]?.name || '').toLowerCase();
      const used = artistCount.get(mainArtist) || 0;
      if (used >= artistCap) continue;

      // Normalizar el campo artist para la preview
      const artistNames = Array.isArray(t.artists) ? t.artists.map(a => a?.name).filter(Boolean).join(', ') : '';
      const normalizedTrack = {
        ...t,
        artist: artistNames || t.artist || t.artistName || t.artist_names || '-',
        artistNames: artistNames || t.artistNames || t.artist || t.artistName || t.artist_names || 'Artista desconocido',
      };

      chosen.push(normalizedTrack);
      seen.add(id);
      artistCount.set(mainArtist, used + 1);
    }

    console.log(`[CONSENSUS] deterministic=${chosen.length}/${target} cap=${artistCap}`);
    return chosen.slice(0, target);
  }
}

