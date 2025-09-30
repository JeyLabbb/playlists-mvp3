import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { 
  dedupeByTrackId, 
  applyArtistCaps, 
  roundRobinByArtist, 
  applyNegatives, 
  retryWithBackoff,
  dedupeByTitleArtist,
  normalizeTitle,
  normalizeArtist
} from "../../../lib/helpers.js";
import {
  calculateFeatureScore,
  applyEnergyCurve,
  filterByLanguage,
  filterByInstrumental,
  filterLiveRemix,
  minimizeBPMJumps,
  getCanonicalSeeds,
  expandSeeds
} from "../../../lib/music/index.js";
import { mockSpotify, shouldUseMock } from "../../../lib/mock-spotify.js";

/**
 * Spotify API wrapper with retry logic
 */
async function spotifyRequest(url, token, options = {}) {
  return retryWithBackoff(async () => {
    const response = await fetch(url, {
      ...options,
    headers: {
      Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers
      },
      cache: "no-store"
    });

    const text = await response.text();
    let data = null;
    try { 
      data = text ? JSON.parse(text) : null; 
    } catch { 
      data = text; 
    }

    if (!response.ok) {
      return { ok: false, status: response.status, data, headers: response.headers };
    }
    return { ok: true, status: response.status, data, headers: response.headers };
  }, { retries: 2, baseMs: 500 });
}

/**
 * Validate Spotify track data
 */
function validateSpotifyTrack(track) {
  if (!track || !track.id || !track.uri) {
    return false;
  }
  
  // Spotify ID must be 22 characters
  if (track.id.length !== 22) {
    return false;
  }
  
  // URI must start with spotify:track:
  if (!track.uri.startsWith('spotify:track:')) {
    return false;
  }
  
  return true;
}

/**
 * Normalize track data from Spotify
 */
function normalizeSpotifyTrack(track) {
  if (!validateSpotifyTrack(track)) {
    return null;
  }
  
  return {
    id: track.id,
    uri: track.uri,
    name: track.name,
    artists: track.artists?.map(a => a.name) || [],
    artist_ids: track.artists?.map(a => a.id).filter(Boolean) || [],
    open_url: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
    explicit: !!track.explicit,
    popularity: track.popularity ?? 0,
    album: {
      name: track.album?.name || '',
      images: track.album?.images || []
    },
    source: track.source || "unknown"
  };
}

/**
 * Generate expanded search queries for relaxation
 */
function generateExpandedQueries(intent, aggressive = false) {
  const queries = [];
  const { actividad, generos, vibes, epoca } = intent;
  
  // Base activity queries
  const activityQueries = {
    estudiar: ["study music", "focus music", "concentration", "academic music", "study beats"],
    correr: ["running music", "workout music", "cardio", "exercise music", "fitness"],
    fiesta: ["party music", "dance music", "club music", "festival music", "celebration"],
    cena: ["dinner music", "ambient music", "chill music", "background music", "soft music"]
  };
  
  // Add base activity queries
  if (activityQueries[actividad]) {
    queries.push(...activityQueries[actividad]);
  }
  
  // Add genre-based queries
  if (generos && generos.length > 0) {
    generos.forEach(genero => {
      queries.push(`${genero} music`);
      queries.push(`${genero} ${actividad}`);
      if (aggressive) {
        queries.push(`${genero} playlist`);
        queries.push(`best ${genero}`);
      }
    });
  }
  
  // Add vibe-based queries
  if (vibes && vibes.length > 0) {
    vibes.forEach(vibe => {
      queries.push(`${vibe} music`);
      queries.push(`${vibe} ${actividad}`);
      if (aggressive) {
        queries.push(`${vibe} playlist`);
      }
    });
  }
  
  // Add decade-based queries
  if (epoca && epoca.from && epoca.to) {
    const decade = Math.floor(epoca.from / 10) * 10;
    queries.push(`${decade}s music`);
    queries.push(`${decade}s ${actividad}`);
    if (aggressive) {
      queries.push(`classic ${decade}s`);
    }
  }
  
  // Remove duplicates and limit
  return [...new Set(queries)].slice(0, aggressive ? 20 : 10);
}

/**
 * Apply basic filters to tracks
 */
function applyBasicFilters(tracks, intent) {
  let filtered = [...tracks];
  
  // Apply negatives
  filtered = applyNegatives(filtered, {
    exclude_artists: intent.artistas_out || [],
    only_female_groups: intent.only_female_groups || false,
    allow_live_remix: intent.allow_live_remix !== false
  });
  
  // Apply artist caps
  filtered = applyArtistCaps(filtered, intent.tamano_playlist || 50, {
    hardCap: Math.max(2, Math.ceil((intent.tamano_playlist || 50) / 15)),
    softPct: 12
  });
  
  // Filter live/remix if not allowed
  if (intent.allow_live_remix === false) {
    filtered = filterLiveRemix(filtered);
  }
  
  return filtered;
}

/**
 * Get audio features for tracks in batch
 */
async function getAudioFeatures(trackIds, token) {
  if (!trackIds.length) return [];
  
  // Use mock when no valid Spotify session to ensure we get audio features
  if (shouldUseMock(token)) {
    return await mockSpotify.getAudioFeatures(trackIds);
  }
  
  const features = [];
  const batchSize = 100;
  
  for (let i = 0; i < trackIds.length; i += batchSize) {
    const batch = trackIds.slice(i, i + batchSize);
    const url = new URL("https://api.spotify.com/v1/audio-features");
    url.searchParams.set("ids", batch.join(","));
    
    const result = await spotifyRequest(url.toString(), token);
    if (result.ok && result.data?.audio_features) {
      features.push(...result.data.audio_features.filter(Boolean));
    }
  }
  
  return features;
}

/**
 * Resolve artist names to IDs
 */
async function resolveArtistIds(names, token) {
  if (shouldUseMock(token)) {
    return names?.slice(0, 5).map((name, i) => `artist${i + 1}`) || [];
  }
  
  const ids = [];
  for (const name of names || []) {
    if (!name) continue;
    
    const url = new URL("https://api.spotify.com/v1/search");
    url.searchParams.set("q", name);
    url.searchParams.set("type", "artist");
    url.searchParams.set("limit", "1");
    
    const result = await spotifyRequest(url.toString(), token);
    if (result.ok && result.data?.artists?.items?.[0]?.id) {
      ids.push(result.data.artists.items[0].id);
    }
  }
  return ids.slice(0, 5);
}

/**
 * Resolve track names to IDs
 */
async function resolveTrackIds(titles, token) {
  if (shouldUseMock(token)) {
    return titles?.slice(0, 5).map((title, i) => `${i + 1}`) || [];
  }
  
  const ids = [];
  for (const title of titles || []) {
    if (!title) continue;
    
    const url = new URL("https://api.spotify.com/v1/search");
    url.searchParams.set("q", title);
    url.searchParams.set("type", "track");
    url.searchParams.set("limit", "1");
    
    const result = await spotifyRequest(url.toString(), token);
    if (result.ok && result.data?.tracks?.items?.[0]?.id) {
      ids.push(result.data.tracks.items[0].id);
    }
  }
  return ids.slice(0, 5);
}

/**
 * Resolve concrete LLM songs (title+artist) to Spotify tracks via search
 */
async function resolveLLMTracks(tracksLLM, token) {
  const resolved = [];
  if (!Array.isArray(tracksLLM) || tracksLLM.length === 0) return resolved;

  if (shouldUseMock(token)) {
    // Use mock search combining title and artist; take first reasonable match
    for (const pick of tracksLLM) {
      const q = `${pick.title} ${pick.artist}`.trim();
      const found = await mockSpotify.searchTracks(q, 5);
      if (found && found.length) {
        const tr = { ...found[0], source: "llm" };
        resolved.push(tr);
      }
    }
    return resolved;
  }

  for (const pick of tracksLLM) {
    const query = `${pick.title} ${pick.artist}`.trim();
    const url = new URL("https://api.spotify.com/v1/search");
    url.searchParams.set("q", query);
    url.searchParams.set("type", "track");
    url.searchParams.set("limit", "5");
    const result = await spotifyRequest(url.toString(), token);
    if (result.ok && result.data?.tracks?.items?.length) {
      // Prioritize exact normalized title+artist match
      const normTitle = normalizeTitle(pick.title);
      const normArtist = normalizeArtist(pick.artist);
      const items = result.data.tracks.items
        .map(normalizeSpotifyTrack)
        .filter(Boolean)
        .map(t => ({ ...t, source: "llm" }));
      const exact = items.find(t => normalizeTitle(t.name) === normTitle && normalizeArtist(t.artists?.[0]) === normArtist);
      resolved.push(exact || items[0]);
      
      // Also get track recommendations for each LLM track
      const trackId = (exact || items[0])?.id;
      if (trackId) {
        const recsUrl = new URL("https://api.spotify.com/v1/recommendations");
        recsUrl.searchParams.set("seed_tracks", trackId);
        recsUrl.searchParams.set("limit", "5");
        const recs = await spotifyRequest(recsUrl.toString(), token);
        if (recs.ok && recs.data?.tracks) {
          resolved.push(...(recs.data.tracks || [])
            .map(normalizeSpotifyTrack)
            .filter(Boolean)
            .map(t => ({ ...t, source: "track_radio" })));
        }
      }
    }
  }
  return resolved;
}

/**
 * Resolve LLM artists to IDs and basic top tracks
 */
async function expandLLMArtists(artistsLLM, token, perArtist = 10) {
  const collected = [];
  if (!Array.isArray(artistsLLM) || artistsLLM.length === 0) return collected;

  if (shouldUseMock(token)) {
    for (const name of artistsLLM) {
      const tops = await mockSpotify.getArtistTopTracks(name);
      collected.push(...(tops || []).map(t => ({ ...t, source: "artist_top" })));
    }
    return collected;
  }

  // Real Spotify: search artist then fetch top-tracks + albums + related artists
  for (const name of artistsLLM) {
    const searchUrl = new URL("https://api.spotify.com/v1/search");
    searchUrl.searchParams.set("q", name);
    searchUrl.searchParams.set("type", "artist");
    searchUrl.searchParams.set("limit", "1");
    const found = await spotifyRequest(searchUrl.toString(), token);
    const artistId = found.ok ? found.data?.artists?.items?.[0]?.id : null;
    if (!artistId) continue;
    
    // Get top tracks
    const topsUrl = `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=from_token`;
    const tops = await spotifyRequest(topsUrl, token);
    if (tops.ok) {
      collected.push(...(tops.data?.tracks || []).slice(0, Math.ceil(perArtist * 0.6)).map(n => ({ ...normalizeSpotifyTrack(n), source: "artist_top" })));
    }
    
    // Get albums for more variety
    const albumsUrl = `https://api.spotify.com/v1/artists/${artistId}/albums?market=from_token&limit=3&include_groups=album,single`;
    const albums = await spotifyRequest(albumsUrl, token);
    if (albums.ok) {
      for (const album of (albums.data?.items || []).slice(0, 2)) {
        const tracksUrl = `https://api.spotify.com/v1/albums/${album.id}/tracks?market=from_token&limit=5`;
        const albumTracks = await spotifyRequest(tracksUrl, token);
        if (albumTracks.ok) {
          collected.push(...(albumTracks.data?.items || []).map(n => ({ ...normalizeSpotifyTrack(n), source: "artist_album" })));
        }
      }
    }
    
    // Get related artists for more variety
    const relatedUrl = `https://api.spotify.com/v1/artists/${artistId}/related-artists`;
    const related = await spotifyRequest(relatedUrl, token);
    if (related.ok) {
      for (const relatedArtist of (related.data?.artists || []).slice(0, 2)) {
        const relatedTopsUrl = `https://api.spotify.com/v1/artists/${relatedArtist.id}/top-tracks?market=from_token`;
        const relatedTops = await spotifyRequest(relatedTopsUrl, token);
        if (relatedTops.ok) {
          collected.push(...(relatedTops.data?.tracks || []).slice(0, 3).map(n => ({ ...normalizeSpotifyTrack(n), source: "related_artist" })));
        }
      }
    }
  }
  return collected;
}

/**
 * Playlist mining by keywords/variants
 */
async function minePlaylists(keywords, token, maxPlaylists = 10, maxPerPlaylist = 100) {
  const mined = [];
  if (!Array.isArray(keywords) || keywords.length === 0) return mined;

  if (shouldUseMock(token)) {
    for (const kw of keywords) {
      const pls = await mockSpotify.searchPlaylists(kw, maxPlaylists);
      for (const pl of pls || []) {
        const tracks = await mockSpotify.getPlaylistTracks(pl.id, maxPerPlaylist);
        mined.push(...(tracks || []).map(t => ({ ...t, source: "playlist_mining" })));
      }
    }
    return mined;
  }

  for (const kw of keywords) {
    const url = new URL("https://api.spotify.com/v1/search");
    url.searchParams.set("q", kw);
    url.searchParams.set("type", "playlist");
    url.searchParams.set("limit", String(maxPlaylists));
    const pls = await spotifyRequest(url.toString(), token);
    const items = pls.ok ? pls.data?.playlists?.items || [] : [];
    for (const pl of items) {
      if (!pl?.id) continue; // Skip playlists without valid ID
      const tracksUrl = `https://api.spotify.com/v1/playlists/${pl.id}/tracks?limit=${Math.min(100, maxPerPlaylist)}`;
      const tr = await spotifyRequest(tracksUrl, token);
      const trItems = tr.ok ? (tr.data?.items || []).map(it => it.track).filter(Boolean) : [];
      mined.push(...trItems.map(n => ({ ...normalizeSpotifyTrack(n), source: "playlist_mining" })));
    }
  }
  return mined;
}

/**
 * Get Spotify recommendations with audio features
 */
async function getRecommendations(seeds, targetFeatures, token, limit = 100) {
  if (shouldUseMock(token)) {
    return await mockSpotify.getRecommendations(seeds, targetFeatures, limit);
  }
  
  const url = new URL("https://api.spotify.com/v1/recommendations");
  
  // Resolve seeds to IDs
  const artistIds = await resolveArtistIds(seeds.artistas || [], token);
  const trackIds = await resolveTrackIds(seeds.canciones || [], token);
  const genres = (seeds.generos || []).slice(0, 5);
  
  if (artistIds.length) url.searchParams.set("seed_artists", artistIds.join(","));
  if (trackIds.length) url.searchParams.set("seed_tracks", trackIds.join(","));
  if (genres.length) url.searchParams.set("seed_genres", genres.join(","));
  
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("market", "from_token");
  
  // Add target audio features
  if (targetFeatures.tempo_bpm) {
    url.searchParams.set("target_tempo", String(targetFeatures.tempo_bpm.target));
    url.searchParams.set("min_tempo", String(targetFeatures.tempo_bpm.min));
    url.searchParams.set("max_tempo", String(targetFeatures.tempo_bpm.max));
  }
  
  if (targetFeatures.energy) {
    url.searchParams.set("target_energy", String(targetFeatures.energy.target));
    url.searchParams.set("min_energy", String(targetFeatures.energy.min));
    url.searchParams.set("max_energy", String(targetFeatures.energy.max));
  }
  
  if (targetFeatures.valence) {
    url.searchParams.set("target_valence", String(targetFeatures.valence.target));
    url.searchParams.set("min_valence", String(targetFeatures.valence.min));
    url.searchParams.set("max_valence", String(targetFeatures.valence.max));
  }
  
  if (targetFeatures.acousticness) {
    url.searchParams.set("target_acousticness", String(targetFeatures.acousticness.target));
    url.searchParams.set("min_acousticness", String(targetFeatures.acousticness.min));
    url.searchParams.set("max_acousticness", String(targetFeatures.acousticness.max));
  }
  
  if (targetFeatures.danceability) {
    url.searchParams.set("target_danceability", String(targetFeatures.danceability.target));
    url.searchParams.set("min_danceability", String(targetFeatures.danceability.min));
    url.searchParams.set("max_danceability", String(targetFeatures.danceability.max));
  }
  
  const result = await spotifyRequest(url.toString(), token);
  if (!result.ok) return [];
  
  // Validate and normalize all tracks from Spotify
  return (result.data?.tracks || [])
    .map(normalizeSpotifyTrack)
    .filter(Boolean); // Remove invalid tracks
}

/**
 * Search for tracks with multiple queries
 */
async function searchTracksMultiple(queries, token, limit = 50) {
  if (shouldUseMock(token)) {
    const allTracks = [];
    for (const query of queries) {
      const tracks = await mockSpotify.searchTracks(query, limit);
      allTracks.push(...tracks);
    }
    return allTracks;
  }
  
  const allTracks = [];
  
  for (const query of queries) {
    const url = new URL("https://api.spotify.com/v1/search");
    url.searchParams.set("q", query);
    url.searchParams.set("type", "track");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("market", "from_token");
    
    const result = await spotifyRequest(url.toString(), token);
    if (result.ok && result.data?.tracks?.items) {
      // Validate and normalize all tracks from Spotify
      const tracks = result.data.tracks.items
        .map(normalizeSpotifyTrack)
        .filter(Boolean); // Remove invalid tracks
      allTracks.push(...tracks);
    }
  }
  
  return allTracks;
}

/**
 * Generate playlist using robust approach
 */
async function generatePlaylist(intent, token) {
  console.log("[PLAYLIST] generatePlaylist called with:", { intent, token: token ? "present" : "missing" });
  console.log("[PLAYLIST] shouldUseMock():", shouldUseMock(token));
  
  const { 
    actividad, 
    seeds, 
    tamano_playlist, 
    tempo_bpm, 
    energy, 
    valence, 
    acousticness, 
    danceability,
    idioma_estricto,
    instrumental_estricto,
    artistas_out,
    reglas
  } = intent;
  
  // Merge classic intent fields with LLM-first fields if present
  const llmShare = typeof intent.llmShare === 'number' ? Math.max(0.3, Math.min(0.6, intent.llmShare)) : 0.4;
  const targetSize = intent.tamano_playlist || tamano_playlist;
  const targetFeatures = intent.targetFeatures ? {
    tempo_bpm: tempo_bpm || (intent.targetFeatures.tempo ? { min: Math.max(60, (intent.targetFeatures.tempo || 0) - 40), max: Math.min(220, (intent.targetFeatures.tempo || 0) + 40), target: intent.targetFeatures.tempo } : undefined),
    energy: energy || (intent.targetFeatures.energy ? { min: Math.max(0, intent.targetFeatures.energy - 0.25), max: Math.min(1, intent.targetFeatures.energy + 0.25), target: intent.targetFeatures.energy } : undefined),
    valence: valence || (intent.targetFeatures.valence ? { min: Math.max(0, intent.targetFeatures.valence - 0.25), max: Math.min(1, intent.targetFeatures.valence + 0.25), target: intent.targetFeatures.valence } : undefined),
    danceability: danceability || (intent.targetFeatures.danceability ? { min: Math.max(0, intent.targetFeatures.danceability - 0.25), max: Math.min(1, intent.targetFeatures.danceability + 0.25), target: intent.targetFeatures.danceability } : undefined),
    acousticness: acousticness || (intent.targetFeatures.acousticness ? { min: Math.max(0, intent.targetFeatures.acousticness - 0.25), max: Math.min(1, intent.targetFeatures.acousticness + 0.25), target: intent.targetFeatures.acousticness } : undefined)
  } : { tempo_bpm, energy, valence, acousticness, danceability };
  
  // Step 1: Get canonical seeds if needed
  let finalSeeds = seeds;
  if (!seeds.artistas?.length && !seeds.canciones?.length && !seeds.generos?.length) {
    const canonical = getCanonicalSeeds(actividad);
    finalSeeds = expandSeeds(canonical);
  } else {
    finalSeeds = expandSeeds(seeds);
  }
  
  // Step 2: Collect LLM picks and expansion
  const collectionPromises = [];
  const llmTracksPromise = resolveLLMTracks(intent.tracks_llm || [], token);
  const llmArtistsExpansionPromise = expandLLMArtists(intent.artists_llm || [], token, 10);
  collectionPromises.push(llmTracksPromise);
  collectionPromises.push(llmArtistsExpansionPromise);
  
  // Strategy 1: Spotify recommendations
  collectionPromises.push(
    getRecommendations(finalSeeds, targetFeatures, token, Math.min(targetSize * 3, 150))
  );
  
  // Strategy 2: Genre-based searches
  const genreQueries = [];
  finalSeeds.generos?.forEach(genre => {
    genreQueries.push(`${genre} ${actividad}`);
    genreQueries.push(`${genre} music`);
    genreQueries.push(`${genre} playlist`);
    genreQueries.push(`${genre} hits`);
  });
  collectionPromises.push(
    searchTracksMultiple(genreQueries, token, 50)
  );
  
  // Strategy 3: Activity-specific searches
  const activityQueries = {
    estudiar: ["study music", "focus beats", "lofi hip hop", "ambient study", "coffee shop music", "concentration music", "background music"],
    correr: ["running music", "workout playlist", "gym music", "cardio beats", "fitness music", "exercise songs", "high energy music"],
    fiesta: ["party music", "dance hits", "club music", "fiesta playlist", "dance party", "celebration music", "party hits"],
    cena: ["dinner music", "cozy playlist", "acoustic dinner", "romantic dinner", "background music", "ambient dinner", "soft music"]
  };
  collectionPromises.push(
    searchTracksMultiple(activityQueries[actividad] || [], token, 50)
  );
  
  // Strategy 4: Mood/vibe searches
  const vibeQueries = [];
  if (intent.vibes && intent.vibes.length > 0) {
    intent.vibes.forEach(vibe => {
      vibeQueries.push(`${vibe} music`, `${vibe} playlist`, `${vibe} ${actividad}`);
    });
  }
  collectionPromises.push(
    searchTracksMultiple(vibeQueries, token, 30)
  );
  
  // Strategy 5: Era/decade searches
  if (intent.epoca && intent.epoca.from && intent.epoca.to) {
    const decadeQueries = [];
    for (let year = intent.epoca.from; year <= intent.epoca.to; year += 10) {
      decadeQueries.push(`${year}s music`, `${year}s hits`, `${year}s ${actividad}`);
    }
    collectionPromises.push(
      searchTracksMultiple(decadeQueries, token, 30)
    );
  }
  
  // Playlist mining by keywords/variants
  const miningKeywords = [];
  for (const item of (intent.festivals_or_keywords || [])) {
    if (!item) continue;
    if (item.exact) miningKeywords.push(item.exact);
    if (Array.isArray(item.variants)) miningKeywords.push(...item.variants);
  }
  if (miningKeywords.length) {
    collectionPromises.push(minePlaylists(miningKeywords.slice(0, 10), token, 10, 100));
  }

  // Execute all strategies in parallel
  const results = await Promise.all(collectionPromises);
  let idx = 0;
  const llmResolved = results[idx++] || [];
  const llmArtistExp = results[idx++] || [];
  const recommendations = results[idx++] || [];
  const genreResults = results[idx++] || [];
  const activityResults = results[idx++] || [];
  const vibeResults = results[idx++] || [];
  const eraResults = results[idx++] || [];
  const minedResults = miningKeywords.length ? (results[idx++] || []) : [];

  // Additional Strategy: Track radios (recommendations seeded by each resolved LLM track)
  const radioPromises = [];
  for (const t of llmResolved.slice(0, 20)) {
    radioPromises.push(
      getRecommendations({ artistas: [], canciones: [t.id], generos: [] }, targetFeatures, token, 50)
    );
  }
  // Additional Strategy: Artist radios (seeded by resolved artist IDs from artists_llm)
  const artistIdsForRadio = await resolveArtistIds(intent.artists_llm || [], token);
  for (const aId of artistIdsForRadio.slice(0, 10)) {
    radioPromises.push(
      (async () => {
        // Build a seeds object using artistId via URL params inside getRecommendations
        const recs = await getRecommendations({ artistas: [aId], canciones: [], generos: [] }, targetFeatures, token, 50);
        return recs;
      })()
    );
  }
  const radios = (await Promise.all(radioPromises)).flat();
  
  // Step 3: Combine all results
  const searchResults = [...genreResults, ...activityResults, ...vibeResults, ...eraResults, ...minedResults];
  
  // Step 5: Combine all tracks
  let allTracks = [
    ...llmResolved.map(t => ({ ...t, source: "llm" })),
    ...llmArtistExp.map(t => ({ ...t, source: t.source || "artist_top" })),
    ...recommendations.map(t => ({ ...t, source: t.source || "recommendations" })),
    ...searchResults.map(t => ({ ...t, source: t.source || "search" })),
    ...radios.map(t => ({ ...t, source: t.source || "radio" }))
  ];
  
  console.log(`[PLAYLIST] Total candidates: ${allTracks.length}`);
  console.log(`[PLAYLIST] Recommendations: ${recommendations.length}, Search results: ${searchResults.length}`);
  
  // Step 6: Get audio features for scoring
  const trackIds = allTracks.map(t => t.id).filter(Boolean);
  const audioFeatures = await getAudioFeatures(trackIds, token);
  
  console.log(`[PLAYLIST] Audio features retrieved: ${audioFeatures.length}`);
  console.log(`[PLAYLIST] Sample features:`, audioFeatures.slice(0, 2));
  
  // Create features map
  const featuresMap = new Map();
  audioFeatures.forEach(feature => {
    if (feature?.id) {
      featuresMap.set(feature.id, feature);
    }
  });
  
  // Step 7: Score and filter tracks
  const scoredTracks = allTracks
    .map(track => {
      const features = featuresMap.get(track.id);
      if (!features) {
        console.log(`[PLAYLIST] No features for track: ${track.id} - ${track.name}`);
        return null;
      }
      
      const score = calculateFeatureScore(features, targetFeatures, {
        tempo: 0.2, // Reduced weight
        energy: 0.2, // Reduced weight
        valence: 0.15, // Reduced weight
        acousticness: 0.1, // Reduced weight
        danceability: 0.1
      });
      
      console.log(`[PLAYLIST] Track ${track.name} score: ${score.toFixed(3)}`);
      
      return {
        ...track,
        audio_features: features,
        score
      };
    })
    .filter(Boolean)
    .filter(track => track.score > 0.3) // Much more permissive threshold
    .sort((a, b) => b.score - a.score);
  
  console.log(`[PLAYLIST] After scoring: ${scoredTracks.length}`);
  
  // Step 8: Apply filters
  let filteredTracks = scoredTracks;
  console.log(`[PLAYLIST] Before dedupe: ${filteredTracks.length}`);
  
  // Remove duplicates
  filteredTracks = dedupeByTrackId(filteredTracks);
  filteredTracks = dedupeByTitleArtist(filteredTracks);
  console.log(`[PLAYLIST] After dedupe: ${filteredTracks.length}`);
  
  // Apply dynamic artist caps based on target size (MUCH more permissive to reach target)
  filteredTracks = applyArtistCaps(filteredTracks, targetSize, {
    hardCap: Math.max(10, Math.ceil(targetSize / 4)), // Much more permissive
    softPct: 40 // Higher percentage allowed
  });
  console.log(`[PLAYLIST] After artist caps: ${filteredTracks.length}`);
  
  // Apply negatives
  filteredTracks = applyNegatives(filteredTracks, {
    exclude_artists: artistas_out || [],
    only_female_groups: reglas?.includes("only_female_groups") || false,
    allow_live_remix: !reglas?.includes("no_live_remix")
  });
  console.log(`[PLAYLIST] After negatives: ${filteredTracks.length}`);
  
  // Filter by language
  if (idioma_estricto) {
    filteredTracks = filterByLanguage(filteredTracks, "es");
    console.log(`[PLAYLIST] After language filter: ${filteredTracks.length}`);
  }
  
  // Filter by instrumental
  if (instrumental_estricto) {
    filteredTracks = filterByInstrumental(filteredTracks, true);
    console.log(`[PLAYLIST] After instrumental filter: ${filteredTracks.length}`);
  }
  
  // Filter live/remix
  filteredTracks = filterLiveRemix(filteredTracks, reglas?.includes("allow_live_remix"));
  console.log(`[PLAYLIST] After live/remix filter: ${filteredTracks.length}`);
  
  // Step 9: Apply energy curve and BPM optimization
  filteredTracks = applyEnergyCurve(filteredTracks, actividad);
  console.log(`[PLAYLIST] After energy curve: ${filteredTracks.length}`);
  filteredTracks = minimizeBPMJumps(filteredTracks, 12);
  console.log(`[PLAYLIST] After BPM optimization: ${filteredTracks.length}`);
  
  // Step 10: Round-robin distribution
  filteredTracks = roundRobinByArtist(filteredTracks);
  console.log(`[PLAYLIST] After round-robin: ${filteredTracks.length}`);
  
  // Step 11: Enforce llmShare first, then fill up to target
  const desiredLLM = Math.round((targetSize || 50) * llmShare);
  const llmKept = [];
  const nonLLM = [];
  for (const t of filteredTracks) {
    if (t.source === "llm" && llmKept.length < desiredLLM) llmKept.push(t);
    else nonLLM.push(t);
  }
  let finalTracks = [...llmKept, ...nonLLM].slice(0, targetSize);
  let relaxationSteps = [];
  
  // If we don't have enough tracks, apply relaxation ladder
  if (finalTracks.length < targetSize) {
    console.log(`[RELAXATION] Need ${targetSize - finalTracks.length} more tracks. Starting relaxation ladder...`);
    
    // Step 1: Expand search queries
    if (finalTracks.length < targetSize - 5) {
      console.log(`[RELAXATION] Step 1: Expanding search queries`);
      const expandedQueries = generateExpandedQueries(intent);
      const additionalTracks = await searchTracksMultiple(expandedQueries, token, 50);
      const validAdditionalTracks = additionalTracks
        .map(normalizeSpotifyTrack)
        .filter(Boolean);
      
      // Add new tracks that aren't already in our collection
      const existingIds = new Set(finalTracks.map(t => t.id));
      const newTracks = validAdditionalTracks.filter(t => !existingIds.has(t.id));
      
      if (newTracks.length > 0) {
        // Re-score and filter new tracks
        const newTracksWithFeatures = await getAudioFeatures(newTracks.map(t => t.id), token);
        const newScoredTracks = newTracks.map(track => {
          const features = newTracksWithFeatures.find(f => f.id === track.id);
          if (!features) return null;
          
          const score = calculateFeatureScore(features, targetFeatures, {
            tempo: 0.3, energy: 0.25, valence: 0.2, acousticness: 0.15, danceability: 0.1
          });
          return { ...track, audio_features: features, score };
        }).filter(Boolean);
        
        // Apply basic filters to new tracks
        const newFilteredTracks = applyBasicFilters(newScoredTracks, intent);
        
        // Add to our collection
        finalTracks = [...finalTracks, ...newFilteredTracks];
        relaxationSteps.push({
          step: "expand_queries",
          added_tracks: newFilteredTracks.length,
          total_after: finalTracks.length
        });
        
        console.log(`[RELAXATION] Added ${newFilteredTracks.length} tracks from expanded queries`);
      }
    }
    
    // Step 2: Relax audio feature constraints
    if (finalTracks.length < targetSize - 5) {
      console.log(`[RELAXATION] Step 2: Relaxing audio feature constraints`);
      const relaxedFeatures = { ...targetFeatures };
      
      // Relax valence range
      if (relaxedFeatures.valence) {
        relaxedFeatures.valence.min = Math.max(0, relaxedFeatures.valence.min - 0.1);
        relaxedFeatures.valence.max = Math.min(1, relaxedFeatures.valence.max + 0.1);
      }
      
      // Relax acousticness range
      if (relaxedFeatures.acousticness) {
        relaxedFeatures.acousticness.min = Math.max(0, relaxedFeatures.acousticness.min - 0.1);
        relaxedFeatures.acousticness.max = Math.min(1, relaxedFeatures.acousticness.max + 0.1);
      }
      
      // Relax danceability range
      if (relaxedFeatures.danceability) {
        relaxedFeatures.danceability.min = Math.max(0, relaxedFeatures.danceability.min - 0.1);
        relaxedFeatures.danceability.max = Math.min(1, relaxedFeatures.danceability.max + 0.1);
      }
      
      // Re-score existing tracks with relaxed constraints
      const rescoredTracks = finalTracks.map(track => {
        if (!track.audio_features) return track;
        const score = calculateFeatureScore(track.audio_features, relaxedFeatures, {
          tempo: 0.3, energy: 0.25, valence: 0.2, acousticness: 0.15, danceability: 0.1
        });
        return { ...track, score };
      });
      
      // Re-sort and take best tracks
      finalTracks = rescoredTracks
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, targetSize);
      
      relaxationSteps.push({
        step: "relax_audio_features",
        added_tracks: 0,
        total_after: finalTracks.length
      });
      
      console.log(`[RELAXATION] Relaxed audio features, now have ${finalTracks.length} tracks`);
    }
    
    // Step 3: Expand tempo and energy ranges
    if (finalTracks.length < targetSize - 5) {
      console.log(`[RELAXATION] Step 3: Expanding tempo and energy ranges`);
      const expandedQueries = generateExpandedQueries(intent, true); // More aggressive expansion
      const additionalTracks = await searchTracksMultiple(expandedQueries, token, 100);
      const validAdditionalTracks = additionalTracks
        .map(normalizeSpotifyTrack)
        .filter(Boolean);
      
      // Add new tracks that aren't already in our collection
      const existingIds = new Set(finalTracks.map(t => t.id));
      const newTracks = validAdditionalTracks.filter(t => !existingIds.has(t.id));
      
      if (newTracks.length > 0) {
        // Re-score and filter new tracks with relaxed constraints
        const newTracksWithFeatures = await getAudioFeatures(newTracks.map(t => t.id), token);
        const newScoredTracks = newTracks.map(track => {
          const features = newTracksWithFeatures.find(f => f.id === track.id);
          if (!features) return null;
          
          const score = calculateFeatureScore(features, targetFeatures, {
            tempo: 0.3, energy: 0.25, valence: 0.2, acousticness: 0.15, danceability: 0.1
          });
          return { ...track, audio_features: features, score };
        }).filter(Boolean);
        
        // Apply basic filters to new tracks
        const newFilteredTracks = applyBasicFilters(newScoredTracks, intent);
        
        // Add to our collection
        finalTracks = [...finalTracks, ...newFilteredTracks];
        relaxationSteps.push({
          step: "expand_tempo_energy",
          added_tracks: newFilteredTracks.length,
          total_after: finalTracks.length
        });
        
        console.log(`[RELAXATION] Added ${newFilteredTracks.length} tracks from expanded tempo/energy search`);
      }
    }
    
    // Step 4: Increase artist caps
    if (finalTracks.length < targetSize - 5) {
      console.log(`[RELAXATION] Step 4: Increasing artist caps`);
      const increasedCaps = Math.min(20, Math.ceil(targetSize / 6)); // More permissive caps
      const tracksWithIncreasedCaps = applyArtistCaps(finalTracks, targetSize, { 
        hardCap: increasedCaps, 
        softPct: 30 
      });
      
      if (tracksWithIncreasedCaps.length > finalTracks.length) {
        finalTracks = tracksWithIncreasedCaps;
        relaxationSteps.push({
          step: "increase_artist_caps",
          added_tracks: tracksWithIncreasedCaps.length - finalTracks.length,
          total_after: finalTracks.length
        });
        
        console.log(`[RELAXATION] Increased artist caps, now have ${finalTracks.length} tracks`);
      }
    }
    
    // Final cut to target size
    finalTracks = finalTracks.slice(0, targetSize);
  }
  
  console.log(`[PLAYLIST] Final tracks: ${finalTracks.length}/${targetSize}`);
  
  // Build sources counter
  const sourcesCount = finalTracks.reduce((acc, t) => {
    const s = t.source || "unknown";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  // Persist last debug run in-memory (dev only)
  try { globalThis.__LAST_PLAYLIST_DEBUG__ = { intent, result: null }; } catch {}

  return {
    tracks: finalTracks,
    metadata: {
      total_candidates: allTracks.length,
      after_scoring: scoredTracks.length,
      after_filtering: filteredTracks.length,
      final_count: finalTracks.length,
      target_size: targetSize,
      success_rate: finalTracks.length / targetSize,
      relaxation_steps: relaxationSteps,
      relaxation_applied: relaxationSteps.length > 0,
      trace: {
        runId: `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        phases: {
          intent_parsing: { duration: null, status: 'completed' },
          seed_expansion: { duration: null, status: 'completed' },
          multi_strategy_collection: { duration: null, status: 'completed' },
          audio_features_scoring: { duration: null, status: 'completed' },
          filtering_pipeline: { duration: null, status: 'completed' },
          final_assembly: { duration: null, status: 'completed' }
        },
        counters: {
          recommendations: recommendations.length,
          genre_searches: genreResults.length,
          activity_searches: activityResults.length,
          vibe_searches: vibeResults.length,
          era_searches: eraResults.length,
          total_collected: allTracks.length,
          after_dedupe: filteredTracks.length,
          after_artist_caps: filteredTracks.length,
          after_negatives: filteredTracks.length,
          after_live_remix_filter: filteredTracks.length,
          after_energy_curve: filteredTracks.length,
          after_bpm_optimization: filteredTracks.length,
          after_round_robin: filteredTracks.length,
          final_tracks: finalTracks.length
        },
        sources: sourcesCount,
        quality_metrics: {
          unique_artists: new Set(finalTracks.map(t => t.artists?.[0]?.toLowerCase())).size,
          avg_score: finalTracks.reduce((sum, t) => sum + (t.score || 0), 0) / finalTracks.length,
          score_range: {
            min: Math.min(...finalTracks.map(t => t.score || 0)),
            max: Math.max(...finalTracks.map(t => t.score || 0))
          },
          tempo_variance: finalTracks.length > 1 ? 
            Math.sqrt(finalTracks.reduce((sum, t) => sum + Math.pow((t.audio_features?.tempo || 0) - 
              (finalTracks.reduce((s, tr) => s + (tr.audio_features?.tempo || 0), 0) / finalTracks.length), 2), 0) / finalTracks.length) : 0
        }
      }
    }
  };
}

/**
 * Main playlist generation handler
 */
export async function POST(req) {
  try {
    const { intent, prompt, target_tracks } = await req.json();
    
    // If we have a prompt, use the new LLM-first system
    if (prompt && typeof prompt === 'string') {
      console.log(`[PLAYLIST] Using LLM-first system for prompt: "${prompt}"`);
      
      const llmResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/playlist/llm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, target_tracks })
      });

      if (llmResponse.ok) {
        const llmData = await llmResponse.json();
        return NextResponse.json(llmData);
      } else {
        console.warn('[PLAYLIST] LLM-first system failed, falling back to legacy system');
      }
    }
    
    let token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    // For debug purposes, create mock token if none exists
    if (!token?.accessToken && process.env.NODE_ENV === "development") {
      token = {
        accessToken: "mock-token-for-debug",
        user: { name: "Debug User", email: "debug@example.com" }
      };
    } else if (!token?.accessToken) {
      return NextResponse.json({ error: "No access token" }, { status: 401 });
    }
    
    if (!intent) {
      return NextResponse.json({ error: "No intent provided" }, { status: 422 });
    }
    
    // Normalize intent for LLM-first shape (activity/genres/targetFeatures)
    const normalized = { ...intent };
    if (!normalized.actividad && intent.activity) {
      const act = String(intent.activity || '').toLowerCase();
      normalized.actividad = act.includes('run') || act.includes('correr') ? 'correr'
        : act.includes('study') || act.includes('estudi') ? 'estudiar'
        : act.includes('fiesta') || act.includes('party') ? 'fiesta'
        : act.includes('dinner') || act.includes('cena') ? 'cena'
        : 'general';
    }
    if (!normalized.seeds) {
      normalized.seeds = {
        artistas: [],
        canciones: [],
        generos: Array.isArray(intent.genres) ? intent.genres : []
      };
    }
    if (!normalized.tamano_playlist && typeof intent.tamano_playlist === 'number') {
      normalized.tamano_playlist = intent.tamano_playlist;
    }
    
    console.log("[PLAYLIST] Generating playlist for activity:", normalized.actividad);
    console.log("[PLAYLIST] Target size:", normalized.tamano_playlist);
    
    const result = await generatePlaylist(normalized, token.accessToken);
    try { globalThis.__LAST_PLAYLIST_DEBUG__ = { intent, result }; } catch {}
    
    if (result.tracks.length === 0) {
      return NextResponse.json({
        ok: false,
        error: "No tracks found matching your criteria",
        suggestion: "Try broadening your search terms or reducing the number of tracks",
        tracks: [],
        metadata: result.metadata
      });
    }
    
    if (result.tracks.length < intent.tamano_playlist * 0.5) {
      return NextResponse.json({
        ok: false,
        error: `Only found ${result.tracks.length} tracks (target: ${intent.tamano_playlist})`,
        suggestion: "Try different keywords or reduce the target number of tracks",
        tracks: result.tracks,
        metadata: result.metadata
      });
    }
    
    console.log("[PLAYLIST] Generated", result.tracks.length, "tracks");
    
    return NextResponse.json({
      ok: true,
      tracks: result.tracks,
      count: result.tracks.length,
      target: intent.tamano_playlist,
      metadata: result.metadata
    });
    
  } catch (error) {
    console.error("Playlist generation error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

export const GET = POST;