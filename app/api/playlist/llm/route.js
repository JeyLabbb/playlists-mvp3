// web/app/api/playlist/llm/route.js
// Clean orchestration for playlist generation with streaming to avoid timeouts

import { NextResponse } from "next/server";
import { storeLastRun } from '@/lib/debug/utils';

// Clean imports from lib modules
import { mapLLMTrack, mapSpotifyTrack } from '@/lib/tracks/mapper';
import { resolveTracksBySearch } from '@/lib/spotify/resolve';
import { radioFromRelatedTop } from '@/lib/spotify/radio';
import { getArtistTopRecent } from '@/lib/spotify/artistTop';
import { fetchAudioFeaturesSafe } from '@/lib/spotify/audioFeatures';
import { createPlaylist, addTracksToPlaylist } from '@/lib/spotify/playlist';
import { collectFromPlaylistsByConsensus, searchFestivalLikePlaylists, loadPlaylistItemsBatch } from '@/lib/spotify/playlistSearch';
import { toTrackId } from '@/lib/spotify/ids';
import { fetchTracksMeta } from '@/lib/spotify/meta';
import { normalizeArtistName, MUSICAL_CONTEXTS } from '@/lib/music/contexts';
import { searchUndergroundTracks, resolveArtistsWithDeduplication, searchArtistTopTracks } from '@/lib/spotify/artistSearch';
import { searchTracksByArtists } from '../../../../search_helpers';
import { calculateMultiArtistDistribution, checkCapInTime, calculateCompensationPlan, normalizeForComparison, detectSpecialCases, calculateDynamicCaps } from '@/lib/helpers';

// Festival and scene detection (keep existing)
import { extractFestivalInfo, calculateStringSimilarity } from '@/lib/intent/festival';
import { detectMusicalScene, cleanSpotifyHint } from '@/lib/music/scenes';
import { cleanHint } from '@/lib/music/hint';
import { getUsageSummary, getUserPlan, refundUsage, getUsageLimit, getOrCreateUsageUser } from '@/lib/billing/usage';
import { UsageRun } from '@/lib/billing/usageRun';
import { getPleiaServerUser } from '@/lib/auth/serverUser';
import { getHubAccessToken } from '@/lib/spotify/hubAuth';

/**
 * Helper to pick more tracks from LLM pool without duplicates
 */
function pickMoreFromLLM(llmResolved, alreadyChosen, need, exclusions) {
  if (!need || !llmResolved.length) return [];
  
  const chosenIds = new Set(alreadyChosen.map(t => t.id).filter(Boolean));
  const available = llmResolved.filter(track => 
    track.id && 
    !chosenIds.has(track.id) && 
    notExcluded(track, exclusions)
  );
  
  return available.slice(0, need);
}

/**
 * Exclusion filter helper
 */
function notExcluded(track, exclusions){
  if(!exclusions) return true;
  const { banned_artists = [], banned_terms = [] } = exclusions || {};
  const name = (track?.name || '').toLowerCase();
  
  // Asegurar que artistNames/artists sea un array antes de hacer .map()
  let artistsArray = [];
  if (track?.artistNames) {
    artistsArray = Array.isArray(track.artistNames) ? track.artistNames : [track.artistNames];
  } else if (track?.artists) {
    artistsArray = Array.isArray(track.artists) ? track.artists : [track.artists];
  }
  
  const artistNames = artistsArray
    .map(a => typeof a === 'string' ? a : a?.name)
    .filter(Boolean)
    .map(x => x.toLowerCase());

  // artista vetado
  if (banned_artists.some(b => artistNames.includes(b.toLowerCase()))) return false;
  // término vetado en el título
  if (banned_terms.some(t => name.includes(t.toLowerCase()))) return false;

  return true;
}

/**
 * Generate a chunk of playlist tracks
 */
async function generatePlaylistChunk(accessToken, intent, chunkSize, traceId, mode, offset = 0) {
  console.log(`[TRACE:${traceId}] Generating chunk: ${chunkSize} tracks, offset: ${offset}, mode: ${mode}`);
  
  switch (mode) {
    case 'NORMAL':
      return await generateNormalPlaylist(accessToken, intent, chunkSize, traceId);
    case 'VIRAL':
      return await generateViralPlaylist(accessToken, intent, chunkSize, traceId);
    case 'FESTIVAL':
      return await generateFestivalPlaylist(accessToken, intent, chunkSize, traceId);
    case 'ARTIST_STYLE':
      return await generateArtistStylePlaylist(accessToken, intent, chunkSize, traceId);
    default:
      return await generateNormalPlaylist(accessToken, intent, chunkSize, traceId);
  }
}

/**
 * Main playlist generation handler with streaming to avoid timeouts
 */
export async function POST(request) {
  const traceId = crypto.randomUUID();
  const startTime = Date.now();
  
  try {
    const { prompt, target_tracks = 50 } = await request.json();
    
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }
    
    console.log(`[TRACE:${traceId}] Starting streaming playlist generation for: "${prompt}"`);
    
    const pleiaUser = await getPleiaServerUser();
    if (!pleiaUser?.email) {
      console.log(`[TRACE:${traceId}] No Supabase session found`);
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const userEmail = pleiaUser.email;
    const usageIdentity = { email: userEmail, userId: pleiaUser.id };

    let accessToken;
    try {
      accessToken = await getHubAccessToken();
      console.log(`[TRACE:${traceId}] Using hub access token for user: ${userEmail}`);
    } catch (error) {
      console.error(`[TRACE:${traceId}] Failed to obtain hub access token:`, error);
      return NextResponse.json({ error: "Failed to authenticate with Spotify Hub account" }, { status: 500 });
    }

    const usageUser = await getOrCreateUsageUser(usageIdentity);
    if (!usageUser) {
      console.warn(`[TRACE:${traceId}] Failed to provision usage user for ${userEmail}`);
      return NextResponse.json(
        {
          code: 'USER_NOT_PROVISIONED',
          error: 'No se pudo preparar tu cuenta. Intenta iniciar sesión nuevamente.',
        },
        { status: 500 },
      );
    }

    if (!usageUser.terms_accepted_at) {
      console.log(`[TRACE:${traceId}] TERMS_NOT_ACCEPTED for ${userEmail}`);
      return NextResponse.json(
        {
          code: 'TERMS_NOT_ACCEPTED',
          error: 'Debes aceptar los términos y condiciones antes de generar playlists.',
        },
        { status: 403 },
      );
    }

    // Check usage limit before generating playlist
    let planContext = { plan: 'free', unlimited: false };
    let usageSummary = null;

    let usageRun = null;

    if (userEmail) {
      try {
        planContext = await getUserPlan(usageIdentity);
        usageSummary = await getUsageSummary(usageIdentity);

        if (!planContext.unlimited && usageSummary.remaining <= 0) {
          console.log(`[TRACE:${traceId}] Usage limit reached for user ${userEmail}: ${usageSummary.used}/${usageSummary.limit}`);
            return NextResponse.json({
              code: "LIMIT_REACHED",
              error: "Usage limit reached",
              message: "You have reached your usage limit. Please upgrade to continue generating playlists.",
            used: usageSummary.used,
            remaining: usageSummary.remaining
            }, { status: 403 });
        } else if (planContext.unlimited) {
          console.log(`[TRACE:${traceId}] Unlimited plan - skipping usage cap`);
        }

        usageRun = new UsageRun({
          identity: usageIdentity,
          planContext,
          usageSummary,
        });

        if (!usageRun.hasAllowance()) {
          return NextResponse.json({
            code: "LIMIT_REACHED",
            error: "Usage limit reached",
            message: "You have reached your usage limit. Please upgrade to continue generating playlists.",
            used: usageSummary.used,
            remaining: usageSummary.remaining
          }, { status: 403 });
        }
      } catch (usageError) {
        console.warn(`[TRACE:${traceId}] Error checking usage status:`, usageError);
      }
    }
    
    if (!usageRun) {
      usageRun = new UsageRun({
        identity: usageIdentity,
        planContext,
        usageSummary,
      });
    }

    // Get intent from LLM
    const intent = await getIntentFromLLM(prompt, target_tracks);
    if (!intent) {
      return NextResponse.json({ error: "Failed to generate intent" }, { status: 500 });
    }
    
    console.log(`[TRACE:${traceId}] Intent generated: ${intent.tracks_llm?.length || 0} tracks, ${intent.artists_llm?.length || 0} artists`);
    
    // Log exclusions
    console.log(`[EXCLUDE] banned_artists=${intent?.exclusions?.banned_artists?.length||0} banned_terms=${intent?.exclusions?.banned_terms?.length||0}`);
    
    // Determine mode
    const mode = determineMode(intent, prompt);
    console.log(`[TRACE:${traceId}] Mode determined: ${mode}`);
    
    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial response with metadata
          const initialResponse = {
            ok: true,
            mode,
            target_tracks,
            streaming: true,
            tracks: [],
            count: 0,
            status: 'generating'
          };
          
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(initialResponse)}\n\n`));
          
          // Generate tracks in chunks
          const chunkSize = Math.min(20, Math.ceil(target_tracks / 3)); // First chunk is 20 or 1/3 of target
          console.log(`[TRACE:${traceId}] Starting with chunk size: ${chunkSize}`);
          
          let allTracks = [];
          let usageEventId = null;
          let usageRecorded = false;
          const usageController = usageRun;

          const applyUsageConsumption = async (chunkLength, phaseLabel, phasePrompt) => {
            // Solo intentar consumir si hay tracks y aún no se ha consumido
            if (chunkLength <= 0) {
              console.log(`[TRACE:${traceId}] Skipping usage consumption in ${phaseLabel} phase - no tracks (${chunkLength})`);
              return true;
            }

            // Si ya se consumió, solo loggear
            if (usageController.hasConsumed()) {
              console.log(`[TRACE:${traceId}] Usage already consumed in previous phase, skipping ${phaseLabel}`);
              return true;
            }

            console.log(`[TRACE:${traceId}] Attempting to consume usage in ${phaseLabel} phase (${chunkLength} tracks)`);
            
            const result = await usageController.consumeOnFirstTrack(chunkLength, {
              traceId,
              phase: phaseLabel,
              prompt: phasePrompt,
              targetTracks: target_tracks,
              plan: planContext.plan,
              tracksGenerated: chunkLength,
            });

            if (!result) {
              // Ya consumido o limit reached, pero debería estar ok si llegamos aquí
              if (usageController.hasConsumed()) {
                console.log(`[TRACE:${traceId}] Usage was already consumed, continuing`);
                return true;
              }
              if (usageController.wasLimitReached()) {
                console.log(`[TRACE:${traceId}] Usage limit was already reached`);
                const errorResponse = {
                  ok: false,
                  error: 'Usage limit reached',
                  streaming: false,
                  status: 'error'
                };
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(errorResponse)}\n\n`));
                controller.close();
                return false;
              }
              console.warn(`[TRACE:${traceId}] consumeOnFirstTrack returned null unexpectedly (chunkLength=${chunkLength})`);
              return true;
            }

            if (!result.ok) {
              console.log(`[TRACE:${traceId}] Usage limit exhausted during ${phaseLabel} phase for ${userEmail}: ${result.reason}`);
              const errorResponse = {
                ok: false,
                error: 'Usage limit reached',
                streaming: false,
                status: 'error',
                reason: result.reason,
                remaining: result.remaining
              };
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(errorResponse)}\n\n`));
              controller.close();
              return false;
            }

            usageEventId = usageEventId || result.usageId || null;
            usageRecorded = usageController.hasConsumed();
            
            const remaining = typeof result.remaining === 'number' ? result.remaining : '∞';
            const used = result.used || 0;
            console.log(`[TRACE:${traceId}] Usage consumed successfully in ${phaseLabel} phase: ${used}/${result.plan === 'founder' ? '∞' : (result.remaining === 'unlimited' ? '∞' : (used + remaining))} (remaining: ${remaining})`);

            if (!result.unlimited) {
              const nextUsed =
                typeof result.used === 'number'
                  ? result.used
                  : (usageSummary?.used || 0) + 1;
              const limitBaseline = usageSummary?.limit ?? (typeof usageSummary?.remaining === 'number'
                ? nextUsed + usageSummary.remaining
                : getUsageLimit());
              const nextRemaining =
                typeof result.remaining === 'number'
                  ? Math.max(0, result.remaining)
                  : Math.max(
                      0,
                      (typeof usageSummary?.remaining === 'number'
                        ? usageSummary.remaining
                        : limitBaseline - nextUsed),
                    );

              usageSummary = {
                ...(usageSummary || {
                  plan: planContext.plan,
                  source: 'users',
                  lastPromptAt: result.lastPromptAt || null,
                }),
                used: nextUsed,
                remaining: nextRemaining,
                limit: limitBaseline,
                lastPromptAt: result.lastPromptAt || usageSummary?.lastPromptAt || null,
              };
            } else {
              usageSummary = {
                ...(usageSummary || {
                  plan: planContext.plan,
                  source: 'users',
                }),
                used: result.used || usageSummary?.used || 0,
                remaining: 'unlimited',
                limit: null,
                lastPromptAt: result.lastPromptAt || usageSummary?.lastPromptAt || null,
              };
            }

            if (!planContext.unlimited && usageController.isUnlimited()) {
              planContext.unlimited = true;
            }

            return true;
          };
          
          // Generate first chunk
          const firstChunk = await generatePlaylistChunk(accessToken, intent, chunkSize, traceId, mode, 0);
          allTracks = [...firstChunk];
          
          // CRITICAL: Solo consumir uso si realmente se generaron tracks exitosamente (sin errores)
          // Validar que los tracks tienen la estructura correcta
          const validFirstChunk = firstChunk.filter(t => t && t.id && t.name);
          
          // Send first chunk
          const firstChunkResponse = {
            ok: true,
            mode,
            target_tracks,
            streaming: true,
            tracks: allTracks,
            count: allTracks.length,
            status: 'generating',
            chunk: 1,
            progress: Math.round((allTracks.length / target_tracks) * 100)
          };
          
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(firstChunkResponse)}\n\n`));
          console.log(`[TRACE:${traceId}] Sent first chunk: ${allTracks.length} tracks (${validFirstChunk.length} valid)`);

          // CRITICAL: NO consumir uso en el primer chunk - solo al final cuando realmente haya tracks válidos
          // Esto previene consumo de uso si hay errores posteriores
          console.log(`[TRACE:${traceId}] First chunk generated: ${validFirstChunk.length} valid tracks - usage will be consumed ONLY at the end if generation succeeds`);
          
          // Generate remaining chunks in parallel
          const remainingTracks = target_tracks - allTracks.length;
          if (remainingTracks > 0) {
            const remainingChunks = Math.ceil(remainingTracks / chunkSize);
            const chunkPromises = [];
            
            for (let i = 1; i <= remainingChunks; i++) {
              const chunkStart = i * chunkSize;
              const chunkTarget = Math.min(chunkSize, target_tracks - chunkStart);
              
              chunkPromises.push(
                generatePlaylistChunk(accessToken, intent, chunkTarget, traceId, mode, chunkStart)
                  .then(chunkTracks => ({ chunkIndex: i, tracks: chunkTracks }))
              );
            }
            
            // Process chunks as they complete
            const chunkResults = await Promise.allSettled(chunkPromises);
            
            for (const result of chunkResults) {
              if (result.status === 'fulfilled') {
                const { chunkIndex, tracks } = result.value;
                allTracks = [...allTracks, ...tracks];
                
                // NO consumir uso en chunks intermedios - solo al final
                // Esto previene consumo de uso si hay errores posteriores
                
                // Send chunk update
                const chunkResponse = {
                  ok: true,
                  mode,
                  target_tracks,
                  streaming: true,
                  tracks: allTracks,
                  count: allTracks.length,
                  status: 'generating',
                  chunk: chunkIndex + 1,
                  progress: Math.round((allTracks.length / target_tracks) * 100)
                };
                
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunkResponse)}\n\n`));
                console.log(`[TRACE:${traceId}] Sent chunk ${chunkIndex + 1}: ${allTracks.length} total tracks`);
              }
            }
          }
          
          // Ensure we have the target number of tracks
          if (allTracks.length < target_tracks) {
            console.warn(`[TRACE:${traceId}] Only got ${allTracks.length}/${target_tracks} tracks - this should not happen with exact count requirement`);
          } else if (allTracks.length > target_tracks) {
            allTracks = allTracks.slice(0, target_tracks);
            console.log(`[TRACE:${traceId}] Trimmed to exact target: ${target_tracks}`);
          }
          
          // Apply audio features (optional, non-blocking)
          const idsOrUris = allTracks.map((t) => t.uri || t.trackUri || t.id).filter(Boolean);
          const featuresMap = await fetchAudioFeaturesSafe(accessToken, idsOrUris);
          const tracksWithFeatures = allTracks.map(track => ({
            ...track,
            audio_features: featuresMap[track.id] || null
          }));
          
          // Apply smooth ordering if we have features
          const orderedTracks = applySmoothOrdering(tracksWithFeatures);
          
          // Final validation
          const validTracks = orderedTracks.filter(t => t.id && t.uri && t.name);
          console.log(`[TRACE:${traceId}] Final validation: ${validTracks.length}/${target_tracks} tracks`);
          
          // Enrich artists with Spotify
          const enriched = await enrichArtistsWithSpotify(validTracks, accessToken);

          // CRITICAL: Solo consumir uso al final si hay al menos 1 track válido generado exitosamente
          // Esto previene consumo de uso si hay errores o si no se generan tracks
          if (enriched.length > 0) {
            if (!usageController.hasConsumed()) {
              console.log(`[TRACE:${traceId}] ✅ Generation successful: ${enriched.length} valid tracks - consuming usage now`);
              const continueAfterFinal = await applyUsageConsumption(
                enriched.length,
                'llm-final',
                prompt,
              );
              if (!continueAfterFinal) {
                // Si el límite se alcanzó durante la generación, hacer refund si es necesario
                console.warn(`[TRACE:${traceId}] Usage limit reached during final consumption - this should not happen`);
                return;
              }
            } else {
              console.log(`[TRACE:${traceId}] Final tracks available (${enriched.length}) - usage already consumed (should not happen)`);
            }
          } else {
            console.warn(`[TRACE:${traceId}] ❌ No valid tracks generated (${enriched.length}) - usage will NOT be consumed`);
            // Si no hay tracks válidos, NO consumir uso
          }

          // Obtener usage event ID solo si se consumió
          usageEventId = usageEventId || usageController.getUsageEventId();
          usageRecorded = usageController.hasConsumed();
          
          // Store for debugging
          try {
            await storeLastRun({
              prompt,
              target_tracks,
              final_tracks: enriched.length,
              mode,
              duration: Date.now() - startTime,
              success: true
            });
          } catch (e) {
            console.warn(`[TRACE:${traceId}] Failed to store debug data:`, e.message);
          }
          
          // Send final response
          const finalResponse = {
            ok: true,
            mode,
            target_tracks,
            streaming: false,
            tracks: enriched,
            count: enriched.length,
            status: 'completed',
            progress: 100,
            duration: Date.now() - startTime
          };
          
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(finalResponse)}\n\n`));
          controller.close();
          
        } catch (error) {
          console.error(`[TRACE:${traceId}] ❌ Streaming error:`, error);

          // CRITICAL: Si hay error y se consumió uso, hacer refund
          if (usageRecorded && usageEventId && userEmail) {
            console.log(`[TRACE:${traceId}] Making refund for usage consumed before error`);
            try {
              const refundResult = await refundUsage(usageIdentity, usageEventId);
              if (refundResult) {
                console.log(`[TRACE:${traceId}] ✅ Usage refunded successfully`);
              } else {
                console.warn(`[TRACE:${traceId}] ⚠️ Refund returned false/null`);
              }
            } catch (refundError) {
              console.error(`[TRACE:${traceId}] ❌ Failed to refund usage after error:`, refundError);
            }
          } else {
            console.log(`[TRACE:${traceId}] No usage to refund (usageRecorded=${usageRecorded}, usageEventId=${usageEventId})`);
          }
          
          const errorResponse = {
            ok: false,
            error: error.message || 'Playlist generation failed',
            streaming: false,
            status: 'error',
            refunded: usageRecorded && usageEventId ? true : false
          };
          
          try {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(errorResponse)}\n\n`));
          } catch (encodeError) {
            console.error(`[TRACE:${traceId}] Failed to encode error response:`, encodeError);
          }
          controller.close();
        }
      }
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error) {
    console.error(`[TRACE:${traceId}] Fatal error:`, error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      ok: false 
    }, { status: 500 });
  }
}

/**
 * Enrich artists with Spotify metadata
 */
async function enrichArtistsWithSpotify(tracks, accessToken) {
  // IDs a pedir para los que no tengan artista claro
  const needIdx = [];
  const ids = [];

  function uriToId(uri) {
    if (!uri) return null;
    // soporta 'spotify:track:ID' o 'https://open.spotify.com/track/ID'
    const colon = uri.split(':');
    if (colon.length === 3 && colon[1] === 'track') return colon[2];
    const m = uri.match(/open\.spotify\.com\/track\/([A-Za-z0-9]+)/);
    return m ? m[1] : null;
  }

  tracks.forEach((t, i) => {
    const hasArtists =
      (t.artists && t.artists.length) ||
      (t.track?.artists && t.track.artists.length) ||
      t.artist || t.artistName || t.artistNames;
    if (!hasArtists) {
      const id = t.id || uriToId(t.uri || t.trackUri);
      if (id) {
        needIdx.push(i);
        ids.push(id);
      }
    }
  });

  // Nada que enriquecer
  if (!ids.length) return tracks;

  // Peticiones en lotes de 50
  const chunk = (arr, n = 50) =>
    Array.from({ length: Math.ceil(arr.length / n) }, (_, k) => arr.slice(k * n, k * n + n));

  for (const idBatch of chunk(ids, 50)) {
    const res = await fetch('https://api.spotify.com/v1/tracks?ids=' + idBatch.join(','), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) continue;
    const data = await res.json();
    const got = data?.tracks || [];
    got.forEach((spTrack) => {
      if (!spTrack) return;
      const id = spTrack.id;
      // encuentra los índices que correspondan a este id
      needIdx.forEach((idx) => {
        const t = tracks[idx];
        const idOfT =
          t.id ||
          uriToId(t.uri || t.trackUri);
        if (idOfT === id) {
          const names = (spTrack.artists || []).map((a) => a.name);
          t.artists = names;
          t.artistNames = names.join(', ');
          // también rellena el nombre de track si faltara
          if (!t.name && spTrack.name) t.name = spTrack.name;
        }
      });
    });
  }
  return tracks;
}

/**
 * Gets intent from LLM
 */
async function getIntentFromLLM(prompt, target_tracks) {
  try {
    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://127.0.0.1:${process.env.PORT || 3000}`);

    const response = await fetch(`${baseUrl}/api/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, target_tracks })
    });
    
    if (!response.ok) {
      throw new Error(`Intent API failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to get intent from LLM:', error);
    return null;
  }
}

/**
 * Determines the mode based on intent and prompt
 */
function determineMode(intent, prompt) {
  const promptLower = prompt.toLowerCase();

  // 1) Si el LLM nos ha dado un modo explícito, lo respetamos
  const llmMode = (intent?.mode || '').toUpperCase();
  if (['NORMAL', 'VIRAL', 'FESTIVAL', 'ARTIST_STYLE', 'SINGLE_ARTIST', 'UNDERGROUND_STRICT'].includes(llmMode)) {
    if (llmMode === 'UNDERGROUND_STRICT') {
      // En este endpoint no usamos el modo estricto separado; mapeamos a NORMAL/ARTIST_STYLE según prompt
      const hasArtistStyleHint = /estilo|como|like/i.test(promptLower);
      return hasArtistStyleHint ? 'ARTIST_STYLE' : 'NORMAL';
    }
    return llmMode;
  }

  // 2) Heurísticas por prompt (backup)
  const viralKeywords = ['tiktok', 'viral', 'virales', 'top', 'charts', 'tendencia', 'tendencias', '2024', '2025'];
  if (viralKeywords.some((keyword) => promptLower.includes(keyword))) {
    return 'VIRAL';
  }

  const festivalInfo = extractFestivalInfo(prompt);
  if (festivalInfo.name && festivalInfo.year) {
    return 'FESTIVAL';
  }

  if (promptLower.includes('como') || promptLower.includes('like') || /estilo/i.test(promptLower)) {
    return 'ARTIST_STYLE';
  }

  return 'NORMAL';
}

/**
 * Generates normal mode playlist (70% LLM, 30% Spotify)
 */
async function generateNormalPlaylist(accessToken, intent, target_tracks, traceId) {
  console.log(`[TRACE:${traceId}] Generating NORMAL playlist`);
  
  // Detectar modo UNDERGROUND_STRICT
  const isUndergroundStrict = /underground/i.test(intent.prompt || '') || (intent.filtered_artists && intent.filtered_artists.length > 0);
  
  console.log(`[UNDERGROUND_DETECTION] prompt_match=${/underground/i.test(intent.prompt || '')} filtered_artists=${intent.filtered_artists?.length || 0} isUndergroundStrict=${isUndergroundStrict}`);
  
  if (isUndergroundStrict && intent.contexts && intent.contexts.key === 'underground_es') {
    // Usar artistas filtrados por el LLM si están disponibles, sino usar la lista completa
    const allowedArtists = intent.filtered_artists && intent.filtered_artists.length > 0 
      ? intent.filtered_artists 
      : intent.contexts.compass;
    
    console.log(`[UNDERGROUND_STRICT] Using direct Spotify search for ${allowedArtists.length} artists (filtered by LLM)`);
    
    // Detectar modo inclusivo/restrictivo
    const prompt = intent.prompt || '';
    const isInclusive = /\b(con|que contenga|que tenga alguna|con alguna|con canciones|con temas|con música|con tracks)\b/i.test(prompt);
    const isRestrictive = !isInclusive && /\b(solo|tan solo|solamente|nada más que|solo de|con solo|únicamente|exclusivamente)\b/i.test(prompt);
    
    console.log(`[UNDERGROUND_STRICT] INCLUSIVE MODE: ${isInclusive}, RESTRICTIVE MODE: ${isRestrictive}`);
    
    if (isInclusive) {
      // Modo inclusivo: artistas prioritarios + otros artistas
      const priorityArtists = intent.priority_artists || [];
      console.log(`[UNDERGROUND_STRICT] INCLUSIVE MODE: Priority artists detected: ${priorityArtists.join(', ')}`);
      
      return await searchUndergroundTracks(accessToken, allowedArtists, target_tracks, 3, null, priorityArtists);
    } else if (isRestrictive) {
      // Modo restrictivo: solo artistas específicos
      console.log(`[UNDERGROUND_STRICT] RESTRICTIVE MODE: Only specific artists allowed`);
      
      return await searchUndergroundTracks(accessToken, allowedArtists, target_tracks, Math.ceil(target_tracks / allowedArtists.length), null, []);
    } else {
      // Modo normal: mezcla de artistas
      return await searchUndergroundTracks(accessToken, allowedArtists, target_tracks, 3, null, []);
    }
  }
  
  // Modo normal: usar LLM + Spotify
  const llmTracks = intent.tracks_llm || [];
  const llmArtists = intent.artists_llm || [];
  
  console.log(`[NORMAL] LLM tracks: ${llmTracks.length}, LLM artists: ${llmArtists.length}`);
  
  // Resolve LLM tracks first
  const llmResolved = await resolveTracksBySearch(accessToken, llmTracks);
  console.log(`[NORMAL] LLM resolved: ${llmResolved.length} tracks`);
  
  // Get Spotify recommendations
  const spotifyTracks = await radioFromRelatedTop(accessToken, llmArtists, target_tracks);
  console.log(`[NORMAL] Spotify tracks: ${spotifyTracks.length} tracks`);
  
  // Combine and deduplicate
  const allTracks = [...llmResolved, ...spotifyTracks];
  const deduplicated = dedupeById(allTracks);
  
  // Apply exclusions
  const filtered = deduplicated.filter(track => notExcluded(track, intent.exclusions));
  
  // Return target amount
  return filtered.slice(0, target_tracks);
}

/**
 * Generates viral mode playlist using consensus from popular playlists
 */
async function generateViralPlaylist(accessToken, intent, target_tracks, traceId) {
  console.log(`[TRACE:${traceId}] Generating VIRAL playlist`);
  
  try {
    const llmChosen = intent.tracks_llm || [];
    const spChosen = await radioFromRelatedTop(accessToken, intent.artists_llm || [], target_tracks);
    
    let finalTracks = dedupeById([...(llmChosen||[]), ...(spChosen||[])]).filter(notBanned);
    
    // Fill with more tracks if needed
    const target = target_tracks;
    if(finalTracks.length < target) {
      const moreFromLLM = pickMoreFromLLM(llmChosen, finalTracks, target - finalTracks.length, intent.exclusions);
      finalTracks = [...finalTracks, ...moreFromLLM];
    }
    
    if(finalTracks.length < target) {
      const moreFromSpotify = await radioFromRelatedTop(accessToken, intent.artists_llm || [], target - finalTracks.length);
      finalTracks = [...finalTracks, ...moreFromSpotify.filter(t => !finalTracks.find(x=>x.id===t.id))];
    }
    
    if(finalTracks.length < target){
      const extraNeed = target - finalTracks.length;
      const extraTracks = await radioFromRelatedTop(accessToken, ['pop', 'hip hop', 'electronic'], extraNeed);
      finalTracks = [...finalTracks, ...extraTracks.filter(t => !finalTracks.find(x=>x.id===t.id))];
    }
    
    if(finalTracks.length > target) finalTracks = finalTracks.slice(0, target);
    
    finalTracks = (finalTracks || []).filter(t => notExcluded(t, intent.exclusions));
    
    console.log(`[FINAL] size=${finalTracks.length} (llm=${llmChosen?.length||0} sp=${spChosen?.length||0})`);
    
    return finalTracks;
  } catch (err) {
    console.error('[VIRAL] fail-safe error:', err);
    return [];
  }
}

/**
 * Generates festival mode playlist using playlist consensus
 */
async function generateFestivalPlaylist(accessToken, intent, target_tracks, traceId) {
  console.log(`[TRACE:${traceId}] Generating FESTIVAL playlist`);
  
  // Use canonized data from intent
  const canonized = intent.canonized;
  if (!canonized) {
    console.warn(`[FESTIVAL] No canonized data found, using fallback`);
    return await generateNormalPlaylist(accessToken, intent, target_tracks, traceId);
  }
  
  console.log(`[FESTIVAL] baseQuery="${canonized.baseQuery}" year=${canonized.year}`);
  
  return await collectFromPlaylistsByConsensus(accessToken, {
    baseQuery: canonized.baseQuery,
    year: canonized.year,
    target: target_tracks,
    festival: true
  });
}

/**
 * Generates artist style playlist with multi-artist fan-out, strict resolution, and real-time caps
 */
async function generateArtistStylePlaylist(accessToken, intent, target_tracks, traceId) {
  // FEATURE flags (siempre activos por defecto, pueden desactivarse explícitamente con 'false')
  const FEATURE_MULTI_ARTIST_FANOUT = process.env.FEATURE_MULTI_ARTIST_FANOUT !== 'false';
  const FEATURE_ENFORCE_CAPS_DURING_BUILD = process.env.FEATURE_ENFORCE_CAPS_DURING_BUILD !== 'false';
  const FEATURE_SMART_COMPENSATION = process.env.FEATURE_SMART_COMPENSATION !== 'false';
  const FEATURE_ARTIST_RESOLVER_STRICT = process.env.FEATURE_ARTIST_RESOLVER_STRICT !== 'false';
  const FEATURE_SPOTIFY_MARKET_FALLBACK = process.env.FEATURE_SPOTIFY_MARKET_FALLBACK !== 'false';
  
  // Configuración de caps (con defaults)
  const PRIORITY_PER_ARTIST_CAP_DEFAULT = Number.parseInt(process.env.PRIORITY_PER_ARTIST_CAP_DEFAULT || '10', 10);
  const NON_PRIORITY_PER_ARTIST_CAP_DEFAULT = Number.parseInt(process.env.NON_PRIORITY_PER_ARTIST_CAP_DEFAULT || '5', 10);
  
  console.log(`[TRACE:${traceId}] ===== ENTERING ARTIST_STYLE MODE =====`);
  console.log(`[TRACE:${traceId}] ARTIST_STYLE details:`, {
    priorityArtists: intent.priority_artists?.length || 0,
    target_tracks: target_tracks,
    flags: {
      FEATURE_MULTI_ARTIST_FANOUT,
      FEATURE_ENFORCE_CAPS_DURING_BUILD,
      FEATURE_SMART_COMPENSATION,
      FEATURE_ARTIST_RESOLVER_STRICT,
      FEATURE_SPOTIFY_MARKET_FALLBACK
    },
    caps: {
      PRIORITY_PER_ARTIST_CAP_DEFAULT,
      NON_PRIORITY_PER_ARTIST_CAP_DEFAULT
    }
  });

  const priorityArtistsRaw = intent.priority_artists || [];
  console.log(`[TRACE:${traceId}] ARTIST_STYLE: Raw priority artists:`, priorityArtistsRaw);

  if (priorityArtistsRaw.length === 0) {
    console.log(`[TRACE:${traceId}] ARTIST_STYLE: No priority artists, falling back to NORMAL`);
    return await generateNormalPlaylist(accessToken, intent, target_tracks, traceId);
  }

  // Resolver artistas con deduplicación por ID
  // FEATURE_ARTIST_RESOLVER_STRICT: usa resolución estricta, sino fallback a nombres originales
  let priorityArtists = priorityArtistsRaw;
  let resolvedArtists = new Map(); // nombre → artista resuelto { id, name }
  let resolverDecisions = [];
  let distinctPriority = priorityArtistsRaw.length;

  if (FEATURE_ARTIST_RESOLVER_STRICT) {
    console.log(`[TRACE:${traceId}] ARTIST_STYLE: Resolving artists with strict deduplication (FEATURE_ARTIST_RESOLVER_STRICT enabled)`);
    const market = process.env.SPOTIFY_MARKET || 'ES';
    const resolution = await resolveArtistsWithDeduplication(accessToken, priorityArtistsRaw, market);
    
    resolvedArtists = resolution.distinct;
    resolverDecisions = resolution.decisions;
    distinctPriority = resolution.distinct.size; // Colapsa por ID único
  } else {
    console.log(`[TRACE:${traceId}] ARTIST_STYLE: Using raw artist names (FEATURE_ARTIST_RESOLVER_STRICT disabled)`);
    // Fallback: crear mapa de nombres → nombres (sin resolución)
    for (const name of priorityArtistsRaw) {
      resolvedArtists.set(name, { id: null, name });
    }
    distinctPriority = priorityArtistsRaw.length;
  }

  priorityArtists = Array.from(resolvedArtists.keys());

  console.log(`[TRACE:${traceId}] ARTIST_STYLE: Resolved ${priorityArtistsRaw.length} names → ${distinctPriority} distinct IDs`);
  
  // Log resolverDecisions para telemetría
  if (FEATURE_ARTIST_RESOLVER_STRICT && resolverDecisions.length > 0) {
    console.log(`[TRACE:${traceId}] ARTIST_STYLE: Resolver decisions:`, JSON.stringify(resolverDecisions, null, 2));
  }

  if (distinctPriority === 0) {
    console.log(`[TRACE:${traceId}] ARTIST_STYLE: No valid artists resolved, falling back to NORMAL`);
    return await generateNormalPlaylist(accessToken, intent, target_tracks, traceId);
  }

  // 🚨 MEJORADO: Detectar casos especiales y calcular caps dinámicos
  const specialCases = detectSpecialCases(
    intent.prompt || '',
    priorityArtistsRaw,
    intent.exclusions?.banned_artists || []
  );
  console.log(`[TRACE:${traceId}] ARTIST_STYLE: Special cases detected:`, JSON.stringify(specialCases));
  
  // Calcular caps dinámicos
  const dynamicCaps = calculateDynamicCaps(
    target_tracks,
    distinctPriority,
    specialCases,
    specialCases.onlyArtists.length > 0
  );
  console.log(`[TRACE:${traceId}] ARTIST_STYLE: Dynamic caps calculated:`, JSON.stringify(dynamicCaps));
  
  // Calcular distribución y caps dinámicos
  const distribution = calculateMultiArtistDistribution(
    target_tracks,
    distinctPriority,
    dynamicCaps,
    specialCases
  );

  const { bucketPlan, perPriorityCap, nonPriorityCap } = distribution;
  
  // 🚨 CRITICAL: Guardar artistId en bucketPlan para verificación por ID
  // Mapear bucket idx → artista (orden-invariante: procesar en orden de entrada)
  const bucketToArtist = new Map();
  const bucketToArtistId = new Map(); // bucket idx → artistId
  let bucketIdx = 0;
  for (const artistName of priorityArtists) {
    bucketToArtist.set(bucketIdx, artistName);
    const resolvedArtist = resolvedArtists.get(artistName);
    const artistId = resolvedArtist?.id || null;
    const resolvedName = resolvedArtist?.name || artistName;
    bucketToArtistId.set(bucketIdx, artistId);
    
    // Actualizar bucketPlan con artistId y resolvedName
    const bucket = bucketPlan.get(bucketIdx);
    if (bucket) {
      bucket.artistId = artistId; // ✅ Nuevo: guardar artistId
      bucket.artistName = resolvedName; // ✅ Nuevo: guardar nombre resuelto
      bucket.originalNames = [artistName]; // Para alias
    }
    
    bucketIdx++;
  }

  console.log(`[TRACE:${traceId}] ARTIST_STYLE: Bucket plan:`, JSON.stringify(
    Array.from(bucketPlan.entries()).map(([idx, bucket]) => ({
      idx,
      artistId: bucket.artistId || null,
      artistName: bucket.artistName || null,
      target: bucket.target,
      cap: bucket.cap
    })),
    null,
    2
  ));
  console.log(`[TRACE:${traceId}] ARTIST_STYLE: Caps - priority=${perPriorityCap}, non-priority=${nonPriorityCap}`);

  // Contadores y estructuras de datos
  const artistCounters = new Map();
  const bucketTracks = new Map();
  const allTracksCollected = [];
  const seenTrackIds = new Set();
  const addsByArtist = new Map();
  const skipsByCap = new Map();

  // Helper: añade track con validación de cap en tiempo real Y verificación de bucket
  // FEATURE_ARTIST_RESOLVER_STRICT: verifica por ID primero, luego nombre normalizado
  const addTrackWithCap = (track, bucketIdx, isPriority = true, expectedBucketArtistName = null) => {
    if (!track || !track.id || seenTrackIds.has(track.id)) return false;

    if (intent.exclusions && notExcluded(track, intent.exclusions) === false) {
      return false;
    }

    const mainArtistName = (track.artists?.[0]?.name || track.artistNames?.[0] || 'Unknown').toLowerCase();
    const currentArtistCount = artistCounters.get(mainArtistName) || 0;
    const cap = isPriority ? perPriorityCap : nonPriorityCap;

    // 🚨 CRITICAL: Verificar que el track pertenezca al bucket correcto
    // FEATURE_ARTIST_RESOLVER_STRICT: verifica por ID primero, luego nombre normalizado (fallback)
    if (isPriority && bucketIdx >= 0) {
      const bucket = bucketPlan.get(bucketIdx);
      if (!bucket) return false;
      
      const bucketArtistId = bucket.artistId || null;
      const bucketArtistName = bucket.artistName || expectedBucketArtistName || null;
      
      let belongsToBucket = false;
      
      // Estrategia 1: Verificar por ID (más preciso, solo si FEATURE_ARTIST_RESOLVER_STRICT)
      if (FEATURE_ARTIST_RESOLVER_STRICT && bucketArtistId) {
        const trackArtistIds = (track.artists || [])
          .map(a => (typeof a === 'object' && a?.id ? a.id : null))
          .filter(Boolean);
        
        belongsToBucket = trackArtistIds.includes(bucketArtistId);
        
        if (!belongsToBucket && bucketArtistName) {
          // Estrategia 2: Verificar por nombre normalizado (fallback para alias/variantes)
          // 🚨 MEJORA: Más tolerante con variantes de nombres (ej: "anuel" vs "anuelaa")
          const normalizedBucketName = normalizeForComparison(bucketArtistName);
          const trackArtistsNormalized = (track.artists || track.artistNames || [])
            .map(a => {
              const name = typeof a === 'string' ? a : (a?.name || '');
              return normalizeForComparison(name);
            })
            .filter(Boolean);
          
          // Verificar coincidencia exacta
          belongsToBucket = trackArtistsNormalized.includes(normalizedBucketName);
          
          // Si no hay coincidencia exacta, verificar si uno contiene al otro (más tolerante)
          if (!belongsToBucket && normalizedBucketName.length > 0) {
            for (const trackArtistNorm of trackArtistsNormalized) {
              // Si el nombre del bucket está contenido en el nombre del track, o viceversa
              // (ej: "anuel" está contenido en "anuelaa", o "anuelaa" contiene "anuel")
              if (trackArtistNorm.includes(normalizedBucketName) || normalizedBucketName.includes(trackArtistNorm)) {
                // Verificar que la coincidencia sea significativa (al menos 4 caracteres)
                const minLength = Math.min(normalizedBucketName.length, trackArtistNorm.length);
                if (minLength >= 4) {
                  belongsToBucket = true;
                  console.log(`[TRACE:${traceId}] ARTIST_STYLE: [bucket_match_fallback] Accepted track by name containment: bucket="${bucketArtistName}" (normalized: "${normalizedBucketName}") matches track artist="${trackArtistNorm}"`);
                  break;
                }
              }
            }
          }
        }
      } else {
        // Fallback legacy: verificar por nombre (sin normalización avanzada)
        if (bucketArtistName || expectedBucketArtistName) {
          const expectedArtistLower = (bucketArtistName || expectedBucketArtistName).toLowerCase();
          const trackArtistsLower = (track.artists || track.artistNames || [])
            .map(a => (typeof a === 'string' ? a : a?.name || '').toLowerCase())
            .filter(Boolean);
          
          // Verificar coincidencia exacta
          belongsToBucket = trackArtistsLower.includes(expectedArtistLower);
          
          // Si no hay coincidencia exacta, verificar si uno contiene al otro (más tolerante)
          if (!belongsToBucket && expectedArtistLower.length > 0) {
            for (const trackArtistLower of trackArtistsLower) {
              if (trackArtistLower.includes(expectedArtistLower) || expectedArtistLower.includes(trackArtistLower)) {
                const minLength = Math.min(expectedArtistLower.length, trackArtistLower.length);
                if (minLength >= 4) {
                  belongsToBucket = true;
                  console.log(`[TRACE:${traceId}] ARTIST_STYLE: [bucket_match_fallback] Accepted track by name containment (legacy): bucket="${bucketArtistName || expectedBucketArtistName}" matches track artist="${trackArtistLower}"`);
                  break;
                }
              }
            }
          }
        }
      }
      
      if (!belongsToBucket) {
        // Log de rechazo detallado para telemetría
        const bucketArtistIdStr = bucketArtistId || 'null';
        const trackArtistIds = (track.artists || [])
          .map(a => (typeof a === 'object' && a?.id ? a.id : null))
          .filter(Boolean);
        const trackArtistNames = (track.artists || track.artistNames || [])
          .map(a => (typeof a === 'string' ? a : a?.name || ''))
          .filter(Boolean);
        const trackArtistNamesNormalized = trackArtistNames.map(n => normalizeForComparison(n));
        
        console.log(`[TRACE:${traceId}] ARTIST_STYLE: [bucket_mismatch] track="${track.name}" bucketArtistId=${bucketArtistIdStr} bucketName="${bucketArtistName || expectedBucketArtistName || 'unknown'}" trackArtistIds=[${trackArtistIds.join(', ')}] trackArtistNamesNormalized=[${trackArtistNamesNormalized.join(', ')}]`);
        return false;
      }
    }

    // Check cap en tiempo real (FEATURE_ENFORCE_CAPS_DURING_BUILD)
    if (FEATURE_ENFORCE_CAPS_DURING_BUILD) {
      const capCheck = checkCapInTime(track, artistCounters, cap, isPriority, specialCases, specialCases.onlyArtists || []);
      if (!capCheck.allowed) {
        const currentSkips = skipsByCap.get(mainArtistName) || 0;
        skipsByCap.set(mainArtistName, currentSkips + 1);
        console.log(`[TRACE:${traceId}] ARTIST_STYLE: Skipping "${track.name}" by "${mainArtistName}" - ${capCheck.reason || 'cap exceeded'}`);
        return false;
      }
    }

    const bucket = bucketPlan.get(bucketIdx);
    if (bucket && bucket.current >= bucket.target) {
      return false;
    }

    seenTrackIds.add(track.id);
    artistCounters.set(mainArtistName, currentArtistCount + 1);

    if (bucket) {
      bucket.current++;
      bucket.adds++;
    }

    const currentAdds = addsByArtist.get(mainArtistName) || 0;
    addsByArtist.set(mainArtistName, currentAdds + 1);

    if (!bucketTracks.has(bucketIdx)) {
      bucketTracks.set(bucketIdx, []);
    }
    bucketTracks.get(bucketIdx).push(track);
    allTracksCollected.push(track);

    return true;
  };

  // 🚨 CRITICAL: FASE 1: Fan-out multi-artista (orden-invariante)
  // NO detenerse cuando alcanza target_tracks - procesar TODOS los priority artists hasta su cap
  console.log(`[TRACE:${traceId}] ARTIST_STYLE: Starting multi-artist fan-out for ${distinctPriority} artists (target: ${target_tracks})`);

  for (const [idx, artistName] of bucketToArtist.entries()) {
    // 🚨 CRITICAL: NO break aquí - procesar TODOS los priority artists hasta su cap
    const bucket = bucketPlan.get(idx);
    if (!bucket || bucket.current >= bucket.target) {
      console.log(`[TRACE:${traceId}] ARTIST_STYLE: Bucket ${idx} for "${artistName}" already full (${bucket?.current}/${bucket?.target}), skipping`);
      continue;
    }

    const needed = bucket.target - bucket.current;
    console.log(`[TRACE:${traceId}] ARTIST_STYLE: Processing bucket ${idx} for "${artistName}" (target: ${bucket.target}, current: ${bucket.current}, needed: ${needed})`);

    const resolvedArtist = resolvedArtists.get(artistName);
    const artistToUse = resolvedArtist?.name || artistName;
    const artistId = resolvedArtist?.id || null;
    const market = FEATURE_SPOTIFY_MARKET_FALLBACK ? (process.env.SPOTIFY_MARKET || 'ES') : 'ES';

    try {
      // Estrategia 1: Top tracks del artista
      const topTracks = await searchArtistTopTracks(accessToken, artistId || artistToUse, Math.min(needed * 3, 10), market);
      console.log(`[TRACE:${traceId}] ARTIST_STYLE: Got ${topTracks.length} top tracks for "${artistToUse}"`);

      for (const track of topTracks) {
        // 🚨 CRITICAL: Solo verificar bucket target, NO target_tracks - procesar hasta cap completo
        if (bucket.current >= bucket.target) break;
        try {
          addTrackWithCap(track, idx, true, artistName); // Pasar artistName para verificación
        } catch (err) {
          console.error(`[TRACE:${traceId}] ARTIST_STYLE: Error adding track "${track?.name || 'unknown'}" for "${artistToUse}":`, err);
          // Continuar con el siguiente track en lugar de fallar completamente
        }
      }

      // Si aún necesitamos más tracks, usar radio/related
      if (bucket.current < bucket.target && topTracks.length > 0) {
        const stillNeeded = bucket.target - bucket.current;
        const trackIds = topTracks.slice(0, 3).map(t => t.id).filter(Boolean);

        if (trackIds.length > 0) {
          const radioTracks = await radioFromRelatedTop(
            accessToken,
            trackIds,
            {
              need: stillNeeded * 2,
              market: market,
              seedArtistIds: artistId ? [artistId] : null
            }
          );
          
          // Log radioFallbacks si hay alguno (telemetría)
          // Nota: radioFromRelatedTop ya loggea fallbacks internamente

          for (const track of radioTracks) {
            // 🚨 CRITICAL: Solo verificar bucket target, NO target_tracks
            if (bucket.current >= bucket.target) break;
            try {
              addTrackWithCap(track, idx, true, artistName); // Pasar artistName para verificación
            } catch (err) {
              console.error(`[TRACE:${traceId}] ARTIST_STYLE: Error adding radio track "${track?.name || 'unknown'}" for "${artistToUse}":`, err);
              // Continuar con el siguiente track
            }
          }
        }
      }

      // Si aún falta material, usar búsqueda directa
      if (bucket.current < bucket.target) {
        const stillNeeded = bucket.target - bucket.current;
        const directTracks = await searchTracksByArtists(accessToken, [artistToUse], stillNeeded * 2);

        for (const track of directTracks) {
          // 🚨 CRITICAL: Solo verificar bucket target, NO target_tracks
          if (bucket.current >= bucket.target) break;
          try {
            addTrackWithCap(track, idx, true, artistName); // Pasar artistName para verificación
          } catch (err) {
            console.error(`[TRACE:${traceId}] ARTIST_STYLE: Error adding direct track "${track?.name || 'unknown'}" for "${artistToUse}":`, err);
            // Continuar con el siguiente track
          }
        }
      }

      console.log(`[TRACE:${traceId}] ARTIST_STYLE: Bucket ${idx} for "${artistToUse}": ${bucket.current}/${bucket.target} tracks`);

    } catch (err) {
      console.error(`[TRACE:${traceId}] ARTIST_STYLE: Error processing "${artistToUse}":`, err);
    }
  }

  console.log(`[TRACE:${traceId}] ARTIST_STYLE: Multi-artist fan-out complete: ${allTracksCollected.length} tracks collected (target: ${target_tracks})`);
  
  // Log telemetría: adds/skips por artista
  for (const [artist, adds] of addsByArtist.entries()) {
    const skips = skipsByCap.get(artist) || 0;
    console.log(`[TRACE:${traceId}] ARTIST_STYLE: ${artist} - adds=${adds}, skipsByCap=${skips}`);
  }

  // FASE 2: Compensación inteligente (FEATURE_SMART_COMPENSATION)
  let compensationPlan = null;
  if (FEATURE_SMART_COMPENSATION && allTracksCollected.length < target_tracks) {
    const missing = target_tracks - allTracksCollected.length;
    console.log(`[TRACE:${traceId}] ARTIST_STYLE: Starting smart compensation for ${missing} missing tracks`);

    compensationPlan = calculateCompensationPlan(bucketPlan, missing, nonPriorityCap);
    console.log(`[TRACE:${traceId}] ARTIST_STYLE: Compensation plan:`, JSON.stringify(compensationPlan, null, 2));

    for (const compensation of compensationPlan.compensationPlan) {
      if (allTracksCollected.length >= target_tracks) break;

      if (compensation.type === 'priority' && compensation.bucketIdx !== undefined) {
        const bucketIdx = compensation.bucketIdx;
        const bucket = bucketPlan.get(bucketIdx);
        if (!bucket) continue;

        const artistName = bucketToArtist.get(bucketIdx) || priorityArtists[bucketIdx];
        const stillNeeded = Math.min(compensation.target, bucket.target - bucket.current);

        if (stillNeeded > 0) {
          const resolvedArtist = resolvedArtists.get(artistName);
          const artistToUse = resolvedArtist?.name || artistName;

          try {
            const compTracks = await searchTracksByArtists(accessToken, [artistToUse], stillNeeded * 2);
            for (const track of compTracks) {
              if (allTracksCollected.length >= target_tracks) break;
              if (bucket.current >= bucket.target) break;
              try {
                addTrackWithCap(track, bucketIdx, true, artistName); // Pasar artistName para verificación
              } catch (err) {
                console.error(`[TRACE:${traceId}] ARTIST_STYLE: Error adding compensation track "${track?.name || 'unknown'}" for "${artistToUse}":`, err);
                // Continuar con el siguiente track
              }
            }
          } catch (err) {
            console.error(`[TRACE:${traceId}] ARTIST_STYLE: Error compensating "${artistToUse}":`, err);
          }
        }
      } else if (compensation.type === 'non_priority') {
        // 🚨 CRITICAL: Usar colaboradores REALES de los priority artists con ROTACIÓN
        const stillNeeded = compensation.target;
        console.log(`[TRACE:${traceId}] ARTIST_STYLE: Compensating with non-priority tracks from REAL collaborators with ROTATION (${stillNeeded})`);
        
        // Helper local: extraer colaboradores de tracks
        const extractCollaboratorsLocal = (tracks, mainArtistName) => {
          const collaborators = new Set();
          const mainArtistLower = mainArtistName.toLowerCase();
          
          for (const track of tracks) {
            if (track.artists && Array.isArray(track.artists)) {
              for (const artist of track.artists) {
                if (artist.name && artist.name.toLowerCase() !== mainArtistLower) {
                  const artistName = artist.name.trim();
                  if (artistName && 
                      !artistName.includes('Various Artists') &&
                      !artistName.includes('Unknown Artist') &&
                      !artistName.includes('Top Hits') &&
                      !artistName.includes('Playlist') &&
                      !artistName.includes('Mix') &&
                      artistName.length > 1) {
                    collaborators.add(artistName);
                  }
                }
              }
            }
          }
          
          return Array.from(collaborators);
        };
        
        // Extraer colaboradores REALES de todos los priority artists
        const allCollaborators = new Set();
        for (const [bucketIdx, tracks] of bucketTracks.entries()) {
          const priorityArtistName = bucketToArtist.get(bucketIdx);
          if (!priorityArtistName) continue;
          
          const collaborators = extractCollaboratorsLocal(tracks, priorityArtistName);
          collaborators.forEach(collab => allCollaborators.add(collab));
        }
        
        const collaboratorList = Array.from(allCollaborators);
        console.log(`[TRACE:${traceId}] ARTIST_STYLE: Found ${collaboratorList.length} REAL collaborators from priority artists`);
        
        // 🚨 CRITICAL: Aplicar fórmula: (N - (CAP * NUM_PRIORITY)) / NUM_PRIORITY
        const priorityTracksAllocated = perPriorityCap * distinctPriority;
        const nonPriorityTracksNeeded = target_tracks - priorityTracksAllocated;
        const tracksPerPriorityArtist = Math.max(0, Math.floor(nonPriorityTracksNeeded / Math.max(1, distinctPriority)));
        
        console.log(`[TRACE:${traceId}] ARTIST_STYLE: Compensation formula: (${target_tracks} - (${perPriorityCap} * ${distinctPriority})) / ${distinctPriority} = ${tracksPerPriorityArtist} per priority artist`);
        
        // Crear set de nombres de priority artists
        const priorityArtistNamesSet = new Set(priorityArtists.map(a => a.toLowerCase()));
        
        // Si hay colaboradores, usar ROTACIÓN para distribuir equitativamente
        if (collaboratorList.length > 0) {
          // 🚨 CRITICAL: Filtrar colaboradores que NO están al límite y limitar a ~10
          const availableCollaborators = collaboratorList.filter(collab => {
            const collabLower = collab.toLowerCase();
            const currentCount = artistCounters.get(collabLower) || 0;
            return currentCount < nonPriorityCap;
          }).slice(0, 10); // Limitar a 10 colaboradores máximo
          
          console.log(`[TRACE:${traceId}] ARTIST_STYLE: Using ${availableCollaborators.length} available collaborators for rotation`);
          
          // 🚨 CRITICAL: Implementar ROTACIÓN - tomar 1 track de cada colaborador y volver al inicio
          let collaboratorIndex = 0;
          const maxTracksToFetch = stillNeeded * 2; // Fetch más de lo necesario para tener opciones
          
          // Primera pasada: buscar tracks de todos los colaboradores (1 por cada uno)
          const collaboratorTrackMap = new Map(); // colaborador → array de tracks disponibles
          
          for (const collaborator of availableCollaborators) {
            try {
              // Buscar ~2-3 tracks por colaborador inicialmente
              const tracksToFetch = Math.min(3, Math.ceil(stillNeeded / availableCollaborators.length) + 2);
              const collabTracks = await searchTracksByArtists(accessToken, [collaborator], tracksToFetch);
              
              // Filtrar tracks que NO tengan al priority artist (solo colaboradores)
              const filteredCollabTracks = collabTracks.filter(track => {
                const trackArtists = (track.artists || track.artistNames || [])
                  .map(a => (typeof a === 'string' ? a : a?.name || '').toLowerCase())
                  .filter(Boolean);
                // El track NO debe tener ningún priority artist (solo colaboradores)
                return !trackArtists.some(artist => priorityArtistNamesSet.has(artist));
              });
              
              if (filteredCollabTracks.length > 0) {
                collaboratorTrackMap.set(collaborator, filteredCollabTracks);
              }
            } catch (err) {
              console.error(`[TRACE:${traceId}] ARTIST_STYLE: Error searching tracks for collaborator "${collaborator}":`, err);
            }
          }
          
          console.log(`[TRACE:${traceId}] ARTIST_STYLE: Fetched tracks from ${collaboratorTrackMap.size} collaborators for rotation`);
          
          // 🚨 CRITICAL: ROTACIÓN - tomar 1 track de cada colaborador y volver al inicio
          while (allTracksCollected.length < target_tracks && collaboratorTrackMap.size > 0) {
            const collaborator = availableCollaborators[collaboratorIndex % availableCollaborators.length];
            const tracksForThisCollaborator = collaboratorTrackMap.get(collaborator);
            
            if (tracksForThisCollaborator && tracksForThisCollaborator.length > 0) {
              // Tomar el primer track disponible de este colaborador
              const track = tracksForThisCollaborator.shift();
              
              // Verificar cap antes de añadir
              const mainArtistName = (track.artists?.[0]?.name || track.artistNames?.[0] || '').toLowerCase();
              const isPriority = priorityArtistNamesSet.has(mainArtistName);
              
              if (!isPriority) {
                const capCheck = checkCapInTime(track, artistCounters, nonPriorityCap, false, specialCases, specialCases.onlyArtists || []);
                if (capCheck.allowed) {
                  try {
                    addTrackWithCap(track, -1, false);
                  } catch (err) {
                    console.error(`[TRACE:${traceId}] ARTIST_STYLE: Error adding non-priority track "${track?.name || 'unknown'}":`, err);
                  }
                }
              }
              
              // Si ya no quedan tracks de este colaborador, remover del map
              if (tracksForThisCollaborator.length === 0) {
                collaboratorTrackMap.delete(collaborator);
              }
            } else {
              // Si no hay tracks para este colaborador, removerlo del map
              collaboratorTrackMap.delete(collaborator);
            }
            
            // Avanzar al siguiente colaborador (rotación)
            collaboratorIndex++;
            
            // Si ya no quedan colaboradores con tracks, salir
            if (collaboratorTrackMap.size === 0) break;
          }
          
          console.log(`[TRACE:${traceId}] ARTIST_STYLE: Rotation complete: added ${allTracksCollected.length - (target_tracks - stillNeeded)} tracks from collaborators`);
        } else {
          // Si no hay colaboradores, usar radio como fallback (pero filtrar priority artists)
          const allPriorityTracks = Array.from(bucketTracks.values()).flat().slice(0, 5);
          const seedTrackIds = allPriorityTracks.map(t => t.id).filter(Boolean);

          if (seedTrackIds.length > 0) {
            const radioTracks = await radioFromRelatedTop(
              accessToken,
              seedTrackIds,
              {
                need: stillNeeded * 2,
                market: market
              }
            );
            
            // Log radioFallbacks si hay alguno (telemetría)
            // Nota: radioFromRelatedTop ya loggea fallbacks internamente

            for (const track of radioTracks) {
              if (allTracksCollected.length >= target_tracks) break;

              const mainArtistName = (track.artists?.[0]?.name || track.artistNames?.[0] || '').toLowerCase();
              const isPriority = priorityArtistNamesSet.has(mainArtistName);

              if (!isPriority) {
                const capCheck = checkCapInTime(track, artistCounters, nonPriorityCap, false, specialCases, specialCases.onlyArtists || []);
                if (capCheck.allowed) {
                  try {
                    addTrackWithCap(track, -1, false);
                  } catch (err) {
                    console.error(`[TRACE:${traceId}] ARTIST_STYLE: Error adding non-priority track "${track?.name || 'unknown'}":`, err);
                  }
                }
              }
            }
          }
        }
      }
    }

    console.log(`[TRACE:${traceId}] ARTIST_STYLE: Smart compensation complete: ${allTracksCollected.length}/${target_tracks} tracks`);
  }

  // Aplicar exclusiones finales y deduplicar
  const deduped = dedupeById(allTracksCollected).filter((t) => notExcluded(t, intent.exclusions));
  const final = deduped.slice(0, target_tracks);

  console.log(`[TRACE:${traceId}] ARTIST_STYLE: Final result: ${final.length}/${target_tracks} tracks`);
  
  // Log final de telemetría
  console.log(`[TRACE:${traceId}] ARTIST_STYLE: BucketPlan final:`, JSON.stringify(
    Array.from(bucketPlan.entries()).map(([idx, bucket]) => ({
      idx,
      target: bucket.target,
      current: bucket.current,
      adds: bucket.adds,
      skipsByCap: bucket.skipsByCap
    })),
    null,
    2
  ));
  
  if (FEATURE_ARTIST_RESOLVER_STRICT && resolverDecisions.length > 0) {
    console.log(`[TRACE:${traceId}] ARTIST_STYLE: ResolverDecisions:`, JSON.stringify(resolverDecisions, null, 2));
  }
  
  if (compensationPlan) {
    console.log(`[TRACE:${traceId}] ARTIST_STYLE: CompensationPlan:`, JSON.stringify(compensationPlan, null, 2));
  }

  if (final.length === 0) {
    console.log(`[TRACE:${traceId}] ARTIST_STYLE: 0 tracks, falling back to NORMAL`);
    return await generateNormalPlaylist(accessToken, intent, target_tracks, traceId);
  }

  return final;
}

/**
 * Applies smooth ordering to tracks
 */
function applySmoothOrdering(tracks) {
  const tracksWithFeatures = tracks.filter(t => t.audio_features);
  
  if (tracksWithFeatures.length < tracks.length * 0.3) {
    console.log(`[SMOOTH-ORDERING] features_ok=${tracksWithFeatures.length}, fallback=true`);
    return tracks; // Return as-is if not enough features
  }
  
  // Sort by tempo for smooth progression
  const sorted = [...tracks].sort((a, b) => {
    const tempoA = a.audio_features?.tempo || 120;
    const tempoB = b.audio_features?.tempo || 120;
    return tempoA - tempoB;
  });
  
  console.log(`[SMOOTH-ORDERING] features_ok=${tracksWithFeatures.length}, fallback=false`);
  return sorted;
}

/**
 * Deduplicate tracks by ID
 */
function dedupeById(tracks) {
  const seen = new Set();
  return tracks.filter(track => {
    if (!track.id || seen.has(track.id)) return false;
    seen.add(track.id);
    return true;
  });
}

/**
 * Filter out banned tracks
 */
function notBanned(track) {
  return notExcluded(track, null); // No exclusions for this filter
}