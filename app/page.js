"use client";

import { useEffect, useRef, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useLanguage } from "./contexts/LanguageContext";
import LanguageSwitcher from "./components/LanguageSwitcher";
import EpicSection from "./components/EpicSection";
import PromptTips from "./components/PromptTips";
import LoadingStatus from "./components/LoadingStatus";
import FeedbackModal from "./components/FeedbackModal";
import FeedbackGate from "./components/FeedbackGate";
import RequestAccessModal from "./components/RequestAccessModal";

export default function Home() {
  const { data: session, status } = useSession();
  const { t } = useLanguage();

  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(50);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showTips, setShowTips] = useState(false);

  // Progress and status
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const progTimer = useRef(null);

  // Playlist creation options
  const [playlistName, setPlaylistName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isCreated, setIsCreated] = useState(false);
  const [spotifyUrl, setSpotifyUrl] = useState(null);
  const [createError, setCreateError] = useState(null);
  
  // FIXPACK: Definir isPublic para evitar ReferenceError
  const isPublic = true; // Por defecto siempre público

  // UI Controls
  const [refining, setRefining] = useState(false);
  const [addingMore, setAddingMore] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Feedback Modal
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackData, setFeedbackData] = useState({});
  const [feedbackShownForId, setFeedbackShownForId] = useState({});
  
  // Request Access Modal
  const [showRequestAccessModal, setShowRequestAccessModal] = useState(false);

  // Check for OAuth callback error on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    if (error === 'OAuthCallback') {
      setShowRequestAccessModal(true);
    }
  }, []);

  // Example prompts
  const examplePrompts = [
    t('prompt.example1'),
    t('prompt.example2'),
    t('prompt.example3'),
    t('prompt.example4'),
    t('prompt.example5')
  ];

  // Progress helpers
  function startProgress(label = t('progress.parsingIntent')) {
    setStatusText(label);
    setProgress(0);
    setError(null);
    if (progTimer.current) clearInterval(progTimer.current);
    progTimer.current = setInterval(() => {
      setProgress((p) => {
        const cap = 90;
        if (p < cap) {
          const inc = p < 30 ? 2.0 : p < 60 ? 1.2 : 0.6;
          return Math.min(cap, p + inc);
        }
        return p;
      });
    }, 200);
  }

  function bumpPhase(label, floor) {
    setStatusText(label);
    setProgress((p) => Math.max(p, floor));
  }

  function finishProgress() {
    if (progTimer.current) {
      clearInterval(progTimer.current);
      progTimer.current = null;
    }
    setProgress(100);
  }

  function resetProgress() {
    if (progTimer.current) {
      clearInterval(progTimer.current);
      progTimer.current = null;
    }
    setProgress(0);
    setStatusText("");
  }

  function safeDefaultName(p) {
    const s = (p || "").replace(/\s+/g, " ").trim();
    return s.length > 60 ? s.slice(0, 57) + "…" : s || "AI Generated Playlist";
  }

  // Feedback cooldown management
  function isFeedbackCooldownActive() {
    try {
      const cooldownData = localStorage.getItem('jl_feedback_cooldown');
      if (!cooldownData) return false;
      
      const { expiresAt } = JSON.parse(cooldownData);
      return new Date() < new Date(expiresAt);
    } catch (error) {
      console.error('[FEEDBACK] Error checking cooldown:', error);
      return false;
    }
  }

  function setFeedbackCooldown() {
    try {
      const cooldownDays = parseInt(process.env.FEEDBACK_POPUP_COOLDOWN_DAYS) || 7;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + cooldownDays);
      
      localStorage.setItem('jl_feedback_cooldown', JSON.stringify({
        expiresAt: expiresAt.toISOString()
      }));
    } catch (error) {
      console.error('[FEEDBACK] Error setting cooldown:', error);
    }
  }

  function openFeedbackModal(defaultValues) {
    // Check if feedback is enabled
    const enabled = (process.env.NEXT_PUBLIC_FEEDBACK_ENABLED ?? 'true').toLowerCase() !== 'false';
    if (!enabled) return;
    
    // Check cooldown
    if (isFeedbackCooldownActive()) return;
    
    // Check if already shown for this playlist
    if (feedbackShownForId[defaultValues.playlistId]) return;
    
    // Set feedback data
    setFeedbackData(defaultValues);
    
    // Mark as shown for this playlist
    setFeedbackShownForId(prev => ({
      ...prev,
      [defaultValues.playlistId]: true
    }));
    
    // Show modal
    setShowFeedbackModal(true);
  }

  function handleFeedbackClose() {
    setShowFeedbackModal(false);
  }

  function handleFeedbackSubmitted() {
    setFeedbackCooldown();
    setShowFeedbackModal(false);
    // Show success toast
    setStatusText('¡Gracias por tu feedback! Te ayudará a mejorar las playlists.');
  }

  // ────────────────────── FALLBACK CLIENT: construir intent si el backend falla ──────────────────────
  function detectModeFromPrompt(p) {
    const txt = (p || "").toLowerCase();
    if (/\b(20\d{2})\b/.test(txt) || txt.includes("festival") || /\b(primavera|sonar|riverland|madcool|groove|coachella|glastonbury|lollapalooza|tomorrowland|download)\b/.test(txt)) {
      return "festival";
    }
    if (/\b(artist|artista|como |del estilo de|like )\b/.test(txt)) return "artist";
    if (/\b(canción|song|track)\b/.test(txt)) return "song";
    return "style";
  }
  function parseFestivalFromPrompt(p) {
    const nameYear = p.match(/(.+?)\s+(20\d{2})/i);
    if (nameYear) {
      return { name: nameYear[1].trim(), year: Number(nameYear[2]), strict_exact_name: true };
    }
    return { name: p.replace(/\b20\d{2}\b/g, "").trim(), year: null, strict_exact_name: false };
  }
  function buildHeuristicIntent(p, wanted) {
    const mode = detectModeFromPrompt(p);
    const intent = {
      mode,
      festival: { name: "", year: null, strict_exact_name: false },
      seeds: { artists: [], songs: [], genres: [] },
      constraints: { exclude_artists: [], only_female_groups: false, language: null },
      target_tracks: Math.max(1, Math.min(Number(wanted) || 50, 200)),
      cap_per_artist: { hard: 2, soft_pct: 12 },
      allow_over_cap_for_small_festivals: true,
      min_popularity: 0,
      allow_live_remix: true,
      raw_prompt: p
    };
    if (mode === "festival") intent.festival = parseFestivalFromPrompt(p);
    // heurística sencilla: si el prompt contiene “sin X” exclúyelo
    const neg = [];
    const m = p.match(/sin\s+([^\.,;]+)/i);
    if (m && m[1]) neg.push(m[1].trim());
    intent.constraints.exclude_artists = neg;
    return intent;
  }

  // Generate playlist using streaming SSE
  async function generatePlaylistWithStreaming(prompt, wanted, playlistName) {
    return new Promise((resolve, reject) => {
      let allTracks = [];
      let eventSource;
      
      try {
        // Create EventSource with query parameters (EventSource doesn't support POST)
        const params = new URLSearchParams({
          prompt,
          target_tracks: wanted.toString(),
          playlist_name: playlistName || safeDefaultName(prompt)
        });
        
        eventSource = new EventSource(`/api/playlist/stream?${params.toString()}`);
        
        // Handle different event types
        eventSource.addEventListener('LLM_START', (event) => {
          const data = JSON.parse(event.data);
          bumpPhase(data.message || 'Processing LLM tracks...', 30);
          setStatusText(`🎵 ${data.message || 'Processing LLM tracks...'} (Target: ${data.target || wanted} tracks)`);
        });
        
        eventSource.addEventListener('LLM_CHUNK', (event) => {
          const data = JSON.parse(event.data);
          
          if (data.trimmed) {
            // Handle trim message
            setStatusText(`🎵 ${data.message || 'Trimmed LLM tracks to 75%'}`);
            return;
          }
          
          allTracks = [...allTracks, ...data.tracks];
          setTracks([...allTracks]);
          
          const progress = data.progress || Math.round((data.totalSoFar / data.target) * 100);
          const phaseProgress = Math.min(30 + (progress * 0.3), 60); // 30-60% for LLM phase
          bumpPhase(`🎵 Found ${data.totalSoFar}/${data.target} tracks`, phaseProgress);
          
          setStatusText(`🎵 Found ${data.totalSoFar}/${data.target} tracks (${progress}%) - ${data.tracks.length} new tracks added`);
        });
        
        eventSource.addEventListener('LLM_DONE', (event) => {
          const data = JSON.parse(event.data);
          bumpPhase('🎵 LLM phase complete', 60);
          setStatusText(`🎵 LLM phase complete: ${data.totalSoFar}/${data.target} tracks`);
        });
        
        eventSource.addEventListener('SPOTIFY_START', (event) => {
          const data = JSON.parse(event.data);
          const attempt = data.attempt ? ` (Attempt ${data.attempt})` : '';
          bumpPhase(`🎧 Getting Spotify recommendations${attempt}...`, 70);
          setStatusText(`🎧 ${data.message || 'Getting Spotify recommendations...'}${attempt} - Need ${data.remaining} more tracks`);
        });
        
        eventSource.addEventListener('SPOTIFY_CHUNK', (event) => {
          const data = JSON.parse(event.data);
          allTracks = [...allTracks, ...data.tracks];
          setTracks([...allTracks]);
          
          const progress = data.progress || Math.round((data.totalSoFar / data.target) * 100);
          const phaseProgress = Math.min(60 + (progress * 0.3), 90); // 60-90% for Spotify phase
          const attempt = data.attempt ? ` (Attempt ${data.attempt})` : '';
          const final = data.final ? ' - Final attempt' : '';
          
          bumpPhase(`🎧 Found ${data.totalSoFar}/${data.target} tracks${attempt}`, phaseProgress);
          setStatusText(`🎧 Found ${data.totalSoFar}/${data.target} tracks (${progress}%)${attempt}${final} - ${data.tracks.length} new tracks added`);
        });
        
        eventSource.addEventListener('SPOTIFY_DONE', (event) => {
          const data = JSON.parse(event.data);
          const attempt = data.attempt ? ` (Attempt ${data.attempt})` : '';
          bumpPhase('🎧 Spotify phase complete', 90);
          setStatusText(`🎧 Spotify phase complete${attempt}: ${data.totalSoFar}/${data.target} tracks`);
        });
        
        eventSource.addEventListener('DONE', (event) => {
          const data = JSON.parse(event.data);
          
          console.log('[FRONTEND] DONE event received:', data);
          console.log('[FRONTEND] Current allTracks length:', allTracks.length);
          console.log('[FRONTEND] Data tracks length:', data.tracks?.length || 0);
          
          // Use the final tracks from the server, but keep accumulated tracks if server tracks are empty
          if (data.tracks && data.tracks.length > 0) {
            allTracks = data.tracks;
            console.log('[FRONTEND] Using server tracks:', allTracks.length);
          } else {
            console.log('[FRONTEND] Using accumulated tracks:', allTracks.length);
          }
          
          setTracks([...allTracks]); // Force React update
          
          console.log('[FRONTEND] Final allTracks length:', allTracks.length);
          console.log('[FRONTEND] Final tracks sample:', allTracks.slice(0, 3).map(t => ({ name: t.name, artists: t.artistNames })));
          
          finishProgress();
          
          if (data.partial) {
            setStatusText(`✅ Playlist generated (${data.totalSoFar}/${data.target} tracks) - ${data.reason || 'partial completion'}`);
          } else {
            setStatusText(`✅ ${t('progress.completed')} - ${data.totalSoFar}/${data.target} tracks generated successfully!`);
          }
          
          eventSource.close();
          resolve({
            tracks: allTracks,
            totalSoFar: data.totalSoFar,
            partial: data.partial || false,
            reason: data.reason || 'completed'
          });
        });
        
        eventSource.addEventListener('ERROR', (event) => {
          const data = JSON.parse(event.data);
          setError(data.error || 'Failed to generate playlist');
          setTracks(allTracks);
          resetProgress();
          eventSource.close();
          reject(new Error(data.error || 'Streaming failed'));
        });
        
        eventSource.addEventListener('HEARTBEAT', (event) => {
          // Keep connection alive
          console.log('[SSE] Heartbeat received');
        });
        
        // Handle connection errors
        eventSource.onerror = (error) => {
          console.error('[SSE] Connection error:', error);
          setError('Connection lost. Falling back to regular generation...');
          
          // Fallback to regular endpoint
          eventSource.close();
          
          // Retry with regular endpoint
          fetch('/api/playlist/llm', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({ 
              prompt, 
              target_tracks: wanted,
              playlist_name: playlistName || safeDefaultName(prompt)
            }),
          })
          .then(res => res.json())
          .then(data => {
            if (data.tracks) {
              setTracks(data.tracks);
              finishProgress();
              setStatusText(`${t('progress.completed')} (${data.count || data.tracks.length}/${wanted})`);
              resolve(data);
            } else {
              setError(data.error || 'Failed to generate playlist');
              resetProgress();
              reject(new Error(data.error || 'Fallback failed'));
            }
          })
          .catch(err => {
            setError('Failed to generate playlist');
            resetProgress();
            reject(err);
          });
        };
        
      } catch (error) {
        console.error('[SSE] Setup error:', error);
        setError('Failed to start streaming. Falling back...');
        
        // Fallback to regular endpoint
        fetch('/api/playlist/llm', {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ 
            prompt, 
            target_tracks: wanted,
            playlist_name: playlistName || safeDefaultName(prompt)
          }),
        })
        .then(res => res.json())
        .then(data => {
          if (data.tracks) {
            setTracks(data.tracks);
            finishProgress();
            setStatusText(`${t('progress.completed')} (${data.count || data.tracks.length}/${wanted})`);
            resolve(data);
          } else {
            setError(data.error || 'Failed to generate playlist');
            resetProgress();
            reject(new Error(data.error || 'Fallback failed'));
          }
        })
        .catch(err => {
          setError('Failed to generate playlist');
          resetProgress();
          reject(err);
        });
      }
    });
  }

  // Generate playlist using new API structure
  async function handleGenerate() {
    if (!prompt.trim()) {
      setError(t('errors.enterPrompt'));
      return;
    }
    
    // Si no hay sesión, pedimos login y SALIMOS
    if (!session?.user) {
      await signIn("spotify", { callbackUrl: `${window.location.origin}/?from=oauth` });
      return;
    }

    // Asegurar número y límites 1–200
    const wanted = Math.max(1, Math.min(200, Number(count) || 50));

    setLoading(true);
    setTracks([]);
    setError(null);
    // Reset playlist creation state for new preview
    setIsCreated(false);
    setSpotifyUrl(null);
    setCreateError(null);
    startProgress(t('progress.parsingIntent'));

    try {
      bumpPhase(t('progress.parsingIntent'), 20);
      
      // Step 1: Parse intent (con fallback cliente)
      let intent;
      try {
        const intentRes = await fetch("/api/intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ prompt, target_tracks: wanted }),
        });

        if (!intentRes.ok) {
          // leer texto/json y seguir con fallback (NO throw)
          try {
            const errJson = await intentRes.json();
            console.warn("[intent error]", errJson);
          } catch {
            const txt = await intentRes.text();
            console.warn("[intent error text]", txt);
          }
          intent = buildHeuristicIntent(prompt, wanted);
        } else {
          intent = await intentRes.json();
        }
      } catch (e) {
        console.warn("[intent fetch failed]", e);
        intent = buildHeuristicIntent(prompt, wanted);
      }
      
      bumpPhase(
        intent.mode === "festival" 
          ? t('progress.searchingFestival')
          : t('progress.findingTracks'),
        40
      );

      // Step 2: Generate playlist
      // Use streaming in production, fallback to regular endpoint
      const isProduction = process.env.NODE_ENV === 'production';
      const endpoint = session?.user ? "/api/playlist/llm" : "/api/playlist/demo";
      
      // Use streaming SSE for both mobile and desktop - SAME LOGIC
      if (session?.user) {
        // Both mobile and desktop use streaming - EXACTLY THE SAME
        await generatePlaylistWithStreaming(prompt, wanted, playlistName);
      } else {
        // Use regular fetch for demo or development
        const playlistRes = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ 
            prompt, 
            target_tracks: wanted,
            playlist_name: playlistName || safeDefaultName(prompt)
          }),
        });
        
        const playlistData = await playlistRes.json().catch(() => ({}));
        
        if (!playlistRes.ok || (playlistData && playlistData.ok === false)) {
          const baseMsg = playlistData?.error || t('errors.failedToGenerate');
          const sug = playlistData?.suggestion ? ` ${playlistData.suggestion}` : "";
          
          // PROMPT 9: Handle standardized NO_SESSION error
          if (playlistData?.code === 'NO_SESSION' || playlistRes.status === 401) {
            setError("Please sign in with Spotify to generate playlists. Click the 'Connect with Spotify' button above.");
          } else if (playlistData?.needsAuth) {
            setError("Please sign in with Spotify to generate playlists. Click the 'Connect with Spotify' button above.");
          } else {
            setError(baseMsg + sug);
          }
          
          setTracks(playlistData?.tracks || []);
          resetProgress();
          return;
        }

        bumpPhase(t('progress.applyingFilters'), 70);
        await new Promise((r) => setTimeout(r, 300));

        setTracks(playlistData?.tracks || []);
        finishProgress();
        setStatusText(`${t('progress.completed')} (${(playlistData?.count ?? (playlistData?.tracks?.length || 0))}/${intent.target_tracks})`);
        
        // Redirect to Spotify playlist if created
        if (playlistData?.spotify_playlist_url) {
          console.log(`[FRONTEND] Redirecting to Spotify playlist: ${playlistData.spotify_playlist_url}`);
          setSpotifyPlaylistUrl(playlistData.spotify_playlist_url);
          // Open Spotify playlist in new tab
          window.open(playlistData.spotify_playlist_url, '_blank');
        }
      }
      
    } catch (e) {
      console.error(e);
      setError(e?.message || t('errors.failedToGenerate'));
    } finally {
      setLoading(false);
      resetProgress(); // Asegurar que el progress se resetee siempre
    }
  }

  // Create playlist in Spotify
  async function handleCreate() {
    if (!tracks.length) return;
    if (!session?.user) {
      await signIn("spotify", { callbackUrl: `${window.location.origin}/?from=oauth` });
      return;
    }

    try {
      setIsCreating(true);
      setIsCreated(false);
      setCreateError(null);
      
      const baseName = playlistName.trim() || safeDefaultName(prompt);
      const nameWithBrand = baseName.endsWith(" · by JeyLabbb") ? baseName : baseName + " · by JeyLabbb";
      
      console.log(`[UI] playlistName base=${baseName} finalSent=${nameWithBrand}`);

      // Normalizador robusto de URIs
      const ID22 = /^[0-9A-Za-z]{22}$/;
      const toUri = (t) => {
        if (!t) return null;
        if (typeof t.uri === 'string' && t.uri.startsWith('spotify:track:')) return t.uri;
        if (ID22.test(t?.id || '')) return `spotify:track:${t.id}`;
        const url = (t?.external_urls?.spotify || t?.external_url || '');
        if (typeof url === 'string' && url.includes('/track/')) {
          const id = url.split('/track/')[1]?.split('?')[0];
          return ID22.test(id || '') ? `spotify:track:${id}` : null;
        }
        return null;
      };

      const uris = (tracks || []).map(toUri).filter(Boolean).slice(0, 200);
      console.log('[CLIENT] uris_count=', uris.length);
      
      if (uris.length === 0) {
        throw new Error('No hay URIs válidas para enviar a Spotify');
      }
      
      console.log('[UI] Enviando URIs:', uris.length, 'tracks');
      
      const payload = {
        name: nameWithBrand,
        description: `AI Generated Playlist · ${prompt}`.slice(0,300),
        public: true,
        uris
      };
      
      console.log('[CLIENT] create: uris_count=', Array.isArray(tracks) ? tracks.filter(t=>t?.uri || t?.id).length : 0);
      
      const res = await fetch('/api/spotify/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      console.log('[CLIENT] create: res.ok=', res.ok, 'payload_ok=', !!data?.ok);
      
      // PROMPT 9: Handle standardized NO_SESSION error
      if (res.status === 401 || data?.code === 'NO_SESSION') {
        throw new Error("Please sign in with Spotify to create playlists. Click the 'Connect with Spotify' button above.");
      }
      
      if (!res.ok || !data?.ok) throw new Error(data?.error || data?.message || 'Failed to create playlist');
      
      // FIXPACK: SOLO ahora marcamos creada y mostramos 'Open in Spotify'
      setSpotifyUrl(data?.url || `https://open.spotify.com/playlist/${data?.playlistId}`);
      setIsCreated(true);
      setPlaylistName(''); // Keep input empty after creation
      
      // Abrir Spotify automáticamente
      if (data?.url) {
        window.open(data.url, "_blank");
      }
      
      const addedText = data.trackCount ? ` (${data.trackCount} tracks added)` : '';
      setStatusText(`Playlist creada 🎉 Abriendo Spotify...${addedText}`);
      
      // Dispatch event for FeedbackGate
      window.dispatchEvent(new CustomEvent('playlist:created', { detail: { id: data.playlistId, url: data.playlistUrl } }));
      
    } catch (e) {
      console.error('[UI-CREATE] error:', e);
      setCreateError(e?.message || 'Error al crear playlist');
      alert(e?.message || 'Error al crear playlist');
    } finally {
      setIsCreating(false);
    }
  }

  // Handle refine playlist
  const handleRefine = async () => {
    if (!tracks.length) return;
    
    setRefining(true);
    try {
      // TODO: Implement refine API call
      console.log('Refining playlist...');
      // For now, just show a message
      alert('Refine functionality coming soon!');
    } catch (error) {
      console.error('Refine error:', error);
      alert('Failed to refine playlist');
    } finally {
      setRefining(false);
    }
  };

  // Handle add more tracks (+5)
  const handleAddMore = async () => {
    if (!tracks.length || tracks.length >= 200) return;
    
    setAddingMore(true);
    try {
      // TODO: Implement add more API call
      console.log('Adding more tracks...');
      // For now, just show a message
      alert('Add more tracks functionality coming soon!');
    } catch (error) {
      console.error('Add more error:', error);
      alert('Failed to add more tracks');
    } finally {
      setAddingMore(false);
    }
  };

  // Handle remove track
  const handleRemoveTrack = async (trackId) => {
    if (!tracks.length) return;
    
    setRemoving(true);
    try {
      // TODO: Implement remove track API call
      console.log('Removing track:', trackId);
      // For now, just remove from local state
      setTracks(prev => prev.filter(track => track.id !== trackId));
    } catch (error) {
      console.error('Remove track error:', error);
      alert('Failed to remove track');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black-base">
      {/* Header */}
      <header className="border-b border-gray-dark mobile-header">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center mobile-flex-col md:flex-row">
            <div className="text-center md:text-left">
              <div className="text-sm font-bold text-white mb-1">
                <Link href="/" className="hover:text-cyan-accent transition-colors">JeyLabbb</Link>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                <span className="cyan-accent">AI</span> Playlist Generator
              </h1>
              <p className="text-gray-text-secondary">
                {t('hero.subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-4 mobile-button-group md:flex-row">
              <LanguageSwitcher />
              {session?.user ? (
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="spotify-button-secondary"
                >
                  {t('auth.signOut')}
                </button>
              ) : (
                <button
                  onClick={() => setShowRequestAccessModal(true)}
                  className="spotify-button"
                >
                  {t('auth.connectSpotify')}
                </button>
              )}
            </div>
          </div>
          
          <div className="mt-4 text-sm text-gray-text-secondary text-center md:text-left">
            {status === "loading" ? t('auth.checkingSession') : 
             session?.user ? `${t('auth.connectedAs')} ${session.user.name || session.user.email}` : 
             t('auth.notConnected')}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-8">
          
          {/* Prompt Card */}
          <div className="spotify-card">
            <h2 className="text-2xl font-semibold text-white mb-6">
              {t('prompt.title')}
            </h2>
            
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t('prompt.placeholder')}
              className="spotify-textarea mb-6"
            />
            
            {/* Example prompts */}
            <div className="mb-6">
              <p className="text-sm text-gray-text-secondary mb-3">
                {t('prompt.examples')}
              </p>
              <div className="flex flex-wrap gap-2">
                {examplePrompts.map((example, i) => (
                  <span
                    key={i}
                    className="spotify-chip"
                    onClick={() => setPrompt(example)}
                  >
                    {example}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="flex gap-4 items-center flex-wrap mobile-flex-col md:flex-row">
              <div className="flex items-center gap-3 mobile-input-group md:flex-row">
                <label className="text-sm text-white font-medium">
                  {t('prompt.tracksLabel')}
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="spotify-input w-20 md:w-20"
                />
              </div>
              
              <PromptTips />
              
              <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                className="spotify-button w-full md:min-w-[160px]"
              >
                {loading ? t('prompt.generating') : t('prompt.generateButton')}
              </button>
            </div>
          </div>

          {/* Progress Card */}
          {(loading || progress > 0 || error) && (
            <div className="spotify-card">
              <h3 className="text-xl font-semibold text-white mb-4">
                {error ? t('progress.errorTitle') : (progress === 100 ? 'Generado exitosamente' : t('progress.title'))}
              </h3>
              
              {error && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-4 text-red-400">
                  {error}
                </div>
              )}
              
              {!error && (
                <>
                  <div className="spotify-progress mb-3">
                    <div 
                      className="spotify-progress-bar" 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <LoadingStatus 
                    message={statusText} 
                    show={loading || (progress > 0 && progress < 100)} 
                  />
                </>
              )}
            </div>
          )}

          {/* Playlist Creation Card */}
          {tracks.length > 0 && (
            <div className="spotify-card">
              <h3 className="text-xl font-semibold text-white mb-6">
                {t('playlist.createTitle')} ({tracks.length} tracks)
              </h3>
              
              <div className="flex gap-4 items-center flex-wrap mb-6 mobile-flex-col md:flex-row">
                <div className="flex-1 min-w-[200px] w-full">
                  <label className="block text-sm text-white mb-2">
                    {t('playlist.nameLabel')}
                  </label>
                  <input
                    type="text"
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                    placeholder={safeDefaultName(prompt)}
                    className="spotify-input"
                  />
                </div>
                
                <div className="mobile-button-group md:flex-row">
                  {!isCreated ? (
                    <button
                      onClick={handleCreate}
                      disabled={isCreating}
                      className="spotify-button w-full md:min-w-[180px]"
                    >
                      {isCreating ? t('playlist.creating') : t('playlist.createButton')}
                    </button>
                  ) : (
                    <button
                      disabled={true}
                      className="spotify-button w-full md:min-w-[180px]"
                    >
                      Playlist creada exitosamente
                    </button>
                  )}
                  
                  {spotifyUrl && (
                    <button
                      onClick={() => window.open(spotifyUrl, '_blank')}
                      className="spotify-button-secondary w-full md:min-w-[200px]"
                    >
                      🎵 Open in Spotify
                    </button>
                  )}
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex gap-3 items-center flex-wrap mobile-button-group md:flex-row">
                <button
                  onClick={handleRefine}
                  disabled={refining}
                  className="spotify-button-secondary w-full md:min-w-[120px]"
                >
                  {refining ? 'Refining...' : '🎛️ Refine'}
                </button>
                
                <button
                  onClick={handleAddMore}
                  disabled={addingMore || tracks.length >= 200}
                  className="spotify-button-secondary w-full md:min-w-[100px]"
                >
                  {addingMore ? 'Adding...' : '+5 Tracks'}
                </button>
                
                <div className="text-sm text-gray-text-secondary text-center w-full md:w-auto">
                  {tracks.length}/200 tracks
                </div>
              </div>
            </div>
          )}

          {/* Results Card */}
          {tracks.length > 0 && (
            <div className="spotify-card">
              <h3 className="text-xl font-semibold text-white mb-6">
                {t('playlist.tracksTitle')} ({tracks.length} tracks)
              </h3>
              
              
              <div className="max-h-96 overflow-y-auto mobile-track-list">
                {tracks.map((track, i) => (
                  <div key={`${track.id}-${i}`} className="spotify-track-item">
                    <div className="spotify-track-info">
                      <div className="spotify-track-name">
                        {track.title || track.name || 'Unknown Track'}
                      </div>
                      <div className="spotify-track-artist">
                        {(() => {
                          // Handle different artistNames formats
                          let artists = [];
                          
                          if (typeof track.artistNames === 'string') {
                            artists = track.artistNames.split(',').map(a => a.trim()).filter(Boolean);
                          } else if (Array.isArray(track.artistNames)) {
                            artists = track.artistNames.map(a => typeof a === 'string' ? a : a?.name).filter(Boolean);
                          } else if (Array.isArray(track.artists)) {
                            artists = track.artists.map(a => typeof a === 'string' ? a : a?.name).filter(Boolean);
                          }
                          
                          if (artists.length === 0) return '—';
                          
                          return artists.map((artist, index) => (
                            <span key={index}>
                              {artist}
                              {index < artists.length - 1 && ', '}
                            </span>
                          ));
                        })()}
                      </div>
                    </div>
                    <div className="flex gap-2 mobile-flex-wrap">
                      <a
                        href={track.open_url || (track.id ? `https://open.spotify.com/track/${track.id}` : "#")}
                        target="_blank"
                        rel="noreferrer"
                        className="spotify-link"
                      >
                        Open
                      </a>
                      <button
                        onClick={() => handleRemoveTrack(track.id)}
                        disabled={removing}
                        className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded transition-colors"
                        title="Remove track"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && tracks.length === 0 && !error && (
            <div className="spotify-card text-center py-16">
              <div className="w-16 h-16 bg-gradient-to-br from-spotify-green to-accent-cyan rounded-2xl mx-auto mb-6 flex items-center justify-center">
                <div className="w-8 h-8 bg-white rounded-lg"></div>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                {t('empty.title')}
              </h3>
              <p className="text-gray-text-secondary max-w-md mx-auto">
                {t('empty.description')}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Epic Section */}
      <EpicSection />

      {/* Footer */}
      <footer className="border-t border-gray-dark py-8 mobile-footer">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-text-secondary">
              © JeyLabbb {new Date().getFullYear()}
            </div>
            <div className="flex items-center gap-6 mobile-flex-wrap">
              <a 
                href="https://www.instagram.com/jeylabbb/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-gray-text-secondary hover:text-cyan-accent transition-colors"
              >
                Instagram
              </a>
              <a 
                href="https://www.tiktok.com/@jeylabbb" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-gray-text-secondary hover:text-cyan-accent transition-colors"
              >
                TikTok
              </a>
              <a 
                href="https://jeylabbb.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-gray-text-secondary hover:text-cyan-accent transition-colors"
              >
                Ver otros proyectos
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Feedback Modal */}
      <FeedbackModal
        open={showFeedbackModal}
        onClose={handleFeedbackClose}
        onSubmitted={handleFeedbackSubmitted}
        defaultValues={feedbackData}
      />

      {/* Feedback Gate */}
      <FeedbackGate currentPrompt={prompt} />
      
      {/* Request Access Modal */}
      <RequestAccessModal
        open={showRequestAccessModal}
        onClose={() => setShowRequestAccessModal(false)}
      />
    </div>
  );
}