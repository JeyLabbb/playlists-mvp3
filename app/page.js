"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useLanguage } from "./contexts/LanguageContext";
import EpicSection from "./components/EpicSection";
import PromptTips from "./components/PromptTips";
import LoadingStatus from "./components/LoadingStatus";
import FeedbackModal from "./components/FeedbackModal";
import FeedbackGate from "./components/FeedbackGate";
import AnimatedList from "./components/AnimatedList";
import { REFERRALS_ENABLED, canInvite } from "../lib/referrals";
import UsageLimitReached from "./components/UsageLimitReached";
import { useProfile } from "../lib/useProfile";
import { usePleiaSession } from "../lib/auth/usePleiaSession";
import { useAuthActions } from "../lib/auth/clientActions";
// HUB_MODE eliminado - todas las funcionalidades siempre activas
import { useUsageStatus } from "../lib/hooks/useUsageStatus";
import dynamic from 'next/dynamic';

const SpecialOfferPopup = dynamic(() => import('./components/SpecialOfferPopup'), {
  ssr: false,
});

const DEFAULT_USAGE_DATA = {
  usage: {
    current: 0,
    limit: 5,
    remaining: 5,
    hasUnlimitedUses: false,
    plan: 'free',
    windowDays: null,
  },
  used: 0,
  remaining: 5,
  unlimited: false,
  plan: 'free',
  limitPerWindow: 5,
  source: 'fallback',
  resetAt: null,
  termsAccepted: true,
};

const REMINDER_LOCAL_STORAGE_KEY = 'pleia_usage_reminder_seen';
const INITIAL_REMINDER_DELAY_MS = 6000;
const PAYWALL_REMINDER_INTERVAL_MS = 30 * 60 * 1000;


function isUnlimitedUsage(data) {
  if (!data) return false;
  if (data.unlimited) return true;
  if (data.usage?.hasUnlimitedUses) return true;
  if (typeof data.remaining === 'string' && data.remaining === 'unlimited') return true;
  return false;
}

function extractRemaining(data) {
  if (!data) return DEFAULT_USAGE_DATA.remaining;
  const remaining =
    typeof data.remaining !== 'undefined'
      ? data.remaining
      : typeof data.usage?.remaining !== 'undefined'
        ? data.usage.remaining
        : DEFAULT_USAGE_DATA.remaining;

  if (typeof remaining === 'number') {
    return Math.max(0, remaining);
  }
  if (remaining === 'unlimited' && data.plan !== 'free' && data.plan !== 'founder' && data.plan !== 'premium') {
    return DEFAULT_USAGE_DATA.remaining;
  }
  return remaining;
}

function extractUsed(data) {
  if (!data) return DEFAULT_USAGE_DATA.used;
  if (typeof data.used !== 'undefined') return data.used;
  if (typeof data.usage?.current !== 'undefined') return data.usage.current;
  return DEFAULT_USAGE_DATA.used;
}

export default function Home() {
  const { data: sessionData, status } = usePleiaSession();
  const sessionUser = sessionData?.user || null;
  const { login, logout } = useAuthActions();
  const router = useRouter();
  const { t, isLoading: translationsLoading } = useLanguage();
  const {
    isFounder,
    mutate: mutateProfile,
    loading: profileLoading,
    data: profileData,
    ready: profileReadyFlag,
  } = useProfile();

  const usageDisabled = status !== "authenticated";
  const {
    data: usageStatusData,
    isLoading: usageStatusLoading,
    isValidating: usageValidating,
    refresh: refreshUsage,
  } = useUsageStatus({
    disabled: usageDisabled,
    refreshInterval: usageDisabled ? 0 : 30000,
  });

  // Refresh profile when returning from checkout success
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('checkout') === 'success') {
      console.log('[HOME] Detected checkout success, refreshing profile...');
      mutateProfile();
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [mutateProfile]);

  // Process referral after login
  useEffect(() => {
    const processReferral = async () => {
      if (status === 'authenticated' && sessionUser?.email) {
        // Check URL params first
        const urlParams = new URLSearchParams(window.location.search);
        const refFromUrl = urlParams.get('ref');
        
        // Check localStorage as fallback
        const refFromStorage = localStorage.getItem('pleia-referral');
        
        const refEmail = refFromUrl || refFromStorage;
        
        if (refEmail && refEmail !== 'success') {
          console.log('[HOME] Processing referral after login:', refEmail);
          try {
            const response = await fetch('/api/referrals/track', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ refEmail: refEmail })
            });

            if (response.ok) {
              const result = await response.json();
              console.log('[HOME] Referral tracked successfully:', result);
              
              // 🚨 CRITICAL: Si el usuario actual alcanzó 3/3 y fue actualizado a founder, mostrar mensaje
              // Verificar si el usuario actual es el referrer que alcanzó el límite
              // result.referredBy es el email del referrer, y si coincide con el usuario actual, es él quien alcanzó 3/3
              const isCurrentUserReferrer = result.referredBy && 
                                            sessionUser?.email && 
                                            result.referredBy.toLowerCase() === sessionUser.email.toLowerCase();
              
              if (result.upgradedToFounder && result.reachedLimit && isCurrentUserReferrer) {
                console.log('[HOME] 🎉 Current user reached 1/1 referido (OFERTA ESPECIAL) and was upgraded to founder!');
                // Mostrar mensaje de felicidades después de un pequeño delay
                setTimeout(() => {
                  alert('🎉 ¡Felicidades! Ya tienes acceso de Founder de por vida.');
                  // Refrescar el perfil para que se actualice el plan
                  mutateProfile();
                  refreshUsage();
                }, 1000);
              }
              
              // Clean up
              localStorage.removeItem('pleia-referral');
              // Clean URL
              window.history.replaceState({}, document.title, window.location.pathname);
            } else {
              console.error('[HOME] Failed to track referral:', await response.text());
            }
          } catch (error) {
            console.error('[HOME] Error tracking referral:', error);
          }
        }
      }
    };

    processReferral();
  }, [status, sessionUser?.email]);

  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(50);
  const [customPlaylistName, setCustomPlaylistName] = useState("");
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showTips, setShowTips] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile for placeholder
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Progress and status
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const progTimer = useRef(null);
  const paywallTimerRef = useRef(null);
  
  // Agent thinking (pensamientos del agente que se van acumulando)
  const [agentThoughts, setAgentThoughts] = useState([]);
  const [isAgentMode, setIsAgentMode] = useState(true); // Nuevo sistema de agente habilitado por defecto
  const agentThoughtsScrollRef = useRef(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Auto-scroll al final cuando cambian los mensajes (si el usuario no ha hecho scroll manual)
  useEffect(() => {
    if (shouldAutoScroll && agentThoughtsScrollRef.current && agentThoughts.length > 0) {
      const scrollElement = agentThoughtsScrollRef.current;
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [agentThoughts, shouldAutoScroll]);

  // Playlist creation options
  const [playlistName] = useState(""); // Keep for compatibility but use customPlaylistName
  const [isCreating, setIsCreating] = useState(false);
  const [isCreated, setIsCreated] = useState(false);
  const [spotifyUrl, setSpotifyUrl] = useState(null);
  const [createError, setCreateError] = useState(null);
  const [playlistMeta, setPlaylistMeta] = useState(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [copyStatus, setCopyStatus] = useState(null);
  const [copySpotifyStatus, setCopySpotifyStatus] = useState(null);
  const [isGenerationComplete, setIsGenerationComplete] = useState(false);
  
  // FIXPACK: Definir isPublic para evitar ReferenceError
  const isPublic = true; // Por defecto siempre público

  // UI Controls
  const [refining, setRefining] = useState(false);
  const [addingMore, setAddingMore] = useState(false);
  
  // User playlists state
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [editingPlaylistName, setEditingPlaylistName] = useState(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [removing, setRemoving] = useState(false);
  
  // Playlist preview modal state
  const [previewPlaylist, setPreviewPlaylist] = useState(null);
  const [previewTracks, setPreviewTracks] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [copyLinkStatus, setCopyLinkStatus] = useState(null);

  // Feedback Modal
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackData, setFeedbackData] = useState({});
  const [feedbackShownForId, setFeedbackShownForId] = useState({});
  
  // Paywall Modal
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [usageData, setUsageData] = useState(DEFAULT_USAGE_DATA);
  useEffect(() => {
    const onUsageRefresh = () => {
      refreshUsage();
    };
    window.addEventListener('usage-paywall-refresh', onUsageRefresh);
    return () => window.removeEventListener('usage-paywall-refresh', onUsageRefresh);
  }, [refreshUsage]);
  const [showUsageLimit, setShowUsageLimit] = useState(false);
  const [hasDismissedPaywall, setHasDismissedPaywall] = useState(false);
  const lastUsageSnapshotRef = useRef({ remaining: extractRemaining(DEFAULT_USAGE_DATA), used: extractUsed(DEFAULT_USAGE_DATA) });
  const lastUsageStateRef = useRef(DEFAULT_USAGE_DATA);
  const [usageLoading, setUsageLoading] = useState(true);

  const clearPaywallTimer = useCallback(() => {
    if (paywallTimerRef.current) {
      clearTimeout(paywallTimerRef.current);
      paywallTimerRef.current = null;
    }
  }, []);

  const effectiveUsage = useMemo(() => usageData ?? DEFAULT_USAGE_DATA, [usageData]);

  const canAccessAdvantage = useMemo(() => {
    if (!REFERRALS_ENABLED) return false;
    // 🚨 CRITICAL: Si isEarlyFounderCandidate es true, advantage SIEMPRE debe ser true
    const isEarlyCandidate = !!profileData?.isEarlyFounderCandidate;
    if (isEarlyCandidate) {
      console.log('[PAYWALL] ✅ isEarlyFounderCandidate is true in useMemo, returning true');
      return true;
    }
    
    // Solo calcular usando canInvite si NO es early candidate
    const email = sessionUser?.email;
    if (!email || !REFERRALS_ENABLED) return false;

    try {
      return canInvite(email, { isEarlyCandidate: false });
    } catch (error) {
      console.warn('[PAYWALL] Failed to evaluate referral advantage:', error);
      return false;
    }
  }, [sessionUser?.email, profileData?.isEarlyFounderCandidate]);

  const profileReady = useMemo(() => {
    if (status !== 'authenticated') return true;
    // profileReadyFlag puede ser false mientras carga, pero si profileData existe, ya tenemos datos
    // No bloquear la UI si profileData existe, incluso si profileReadyFlag es false
    return !!profileData || profileReadyFlag;
  }, [status, profileReadyFlag, profileData]);

  useEffect(() => {
    if (usageDisabled) {
      setUsageData(DEFAULT_USAGE_DATA);
      setUsageLoading(false);
      return;
    }
    if (usageStatusData) {
      setUsageData(usageStatusData);
      setUsageLoading(false);
    } else if (!usageStatusLoading) {
      setUsageLoading(false);
    }
  }, [usageDisabled, usageStatusData, usageStatusLoading]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (status !== 'authenticated') return;
    if (usageDisabled) return;
    if (!usageStatusData) return;

    const redirectTarget = `${window.location.pathname}${window.location.search || ''}`;

    if (usageStatusData.needsAccount) {
      router.replace(`/onboarding/create?redirect=${encodeURIComponent(redirectTarget)}`);
      return;
    }

    if (usageStatusData.termsAccepted === false) {
      router.replace(`/onboarding/create?redirect=${encodeURIComponent(redirectTarget)}`);
    }
  }, [status, usageDisabled, usageStatusData, router]);

  useEffect(() => {
    if (!usageData) return;
    lastUsageSnapshotRef.current = {
      remaining: extractRemaining(usageData),
      used: extractUsed(usageData),
    };
    lastUsageStateRef.current = usageData;
  }, [usageData]);

  useEffect(() => {
    if (usageDisabled) {
      setUsageLoading(false);
    } else {
      setUsageLoading(usageStatusLoading || usageValidating);
    }
  }, [usageDisabled, usageStatusLoading, usageValidating]);

  const isFounderAccount = profileReady && !!profileData?.isFounder;

  const showPaywall = useCallback(
    (usageState) => {
      if (!profileReady) return;
      if (status !== 'authenticated') return;

      const state = usageState ?? effectiveUsage;
      if (state && state.termsAccepted === false) return;
      if (isFounderAccount || isUnlimitedUsage(state) || state?.isFounder) return;
      if (hasDismissedPaywall) return;

      // 🚨 CRITICAL: Si isEarlyFounderCandidate es true, advantage SIEMPRE debe ser true
      // Esto es la regla más importante: los primeros 1000 usuarios SIEMPRE tienen ventaja
      const isEarlyCandidate = !!profileData?.isEarlyFounderCandidate;
      let calculatedAdvantage = false;
      
      if (isEarlyCandidate) {
        // 🚨 CRITICAL: Si es early candidate, SIEMPRE tiene ventaja
        calculatedAdvantage = true;
        console.log('[PAYWALL] ✅ isEarlyFounderCandidate is true, forcing advantage = true');
      } else if (REFERRALS_ENABLED && sessionUser?.email) {
        // Solo calcular usando canInvite si NO es early candidate
        try {
          calculatedAdvantage = canInvite(sessionUser.email, { isEarlyCandidate: false });
        } catch (error) {
          console.warn('[PAYWALL] Failed to recalculate advantage before showing:', error);
          calculatedAdvantage = canAccessAdvantage; // Fallback al valor del useMemo
        }
      } else {
        calculatedAdvantage = canAccessAdvantage; // Fallback al valor del useMemo
      }
      
      setShowPaywallModal(true);

      if (typeof window !== 'undefined') {
        // 🚨 CRITICAL: Pasar la estructura EXACTA que PaywallModal espera
        // Debe coincidir con la estructura que devuelve useUsageStatus
        const detail = {
          usage: {
            current: state?.usage?.current ?? state?.used ?? 0,
            limit: state?.usage?.limit ?? state?.limitPerWindow ?? DEFAULT_USAGE_DATA.usage.limit,
            remaining: state?.usage?.remaining ?? state?.remaining ?? (state?.usage?.limit ?? DEFAULT_USAGE_DATA.usage.limit),
            hasUnlimitedUses: state?.usage?.hasUnlimitedUses ?? state?.unlimited ?? false,
            plan: state?.usage?.plan ?? state?.plan ?? 'free',
            maxUses: state?.usage?.maxUses ?? state?.usage?.limit ?? state?.limitPerWindow ?? DEFAULT_USAGE_DATA.usage.limit,
            lastPromptAt: state?.usage?.lastPromptAt ?? state?.counters?.last_prompt_at ?? null,
          },
          used: state?.usage?.current ?? state?.used ?? 0,
          remaining: state?.usage?.remaining ?? state?.remaining ?? (state?.usage?.limit ?? DEFAULT_USAGE_DATA.usage.limit),
          unlimited: state?.unlimited ?? state?.usage?.hasUnlimitedUses ?? false,
          plan: state?.plan || state?.usage?.plan || 'free',
          limitPerWindow: state?.usage?.limit ?? state?.limitPerWindow ?? DEFAULT_USAGE_DATA.usage.limit,
          isFounder: isFounderAccount || state?.isFounder === true || state?.usage?.isFounder === true,
          canAccessAdvantage: calculatedAdvantage, // 🚨 CRITICAL: Pasar canAccessAdvantage calculado aquí (SIEMPRE)
          advantage: calculatedAdvantage, // También como 'advantage' para compatibilidad (SIEMPRE)
          isEarlyFounderCandidate: profileData?.isEarlyFounderCandidate ?? false, // 🚨 CRITICAL: Pasar flag directamente
          profilePending: false,
        };

        const showFn = window.__showPaywall;
        if (typeof showFn === 'function') {
          showFn(detail);
        }
        window.dispatchEvent(new CustomEvent('paywall:show', { detail }));
      }
    },
    [status, effectiveUsage, isFounderAccount, canAccessAdvantage, hasDismissedPaywall, profileReady, profileData?.isEarlyFounderCandidate, sessionUser?.email],
  );

  const hidePaywall = useCallback(
    (options = {}) => {
      setShowPaywallModal(false);
      if (typeof window !== 'undefined') {
        const hideFn = window.__hidePaywall;
        if (typeof hideFn === 'function') {
          hideFn(options);
        }
        window.dispatchEvent(new CustomEvent('paywall:hide', { detail: options }));
      }
    },
    [],
  );

  const shouldShowPaywallReminder = useCallback(() => {
    // 🚨 DESACTIVADO TEMPORALMENTE: Popup automático de "plan a punto de agotarse"
    // Se puede reactivar en el futuro cuando sea necesario
    return false;
    
    // Código original comentado para referencia futura:
    // if (status !== 'authenticated') return false;
    // if (!profileReady) return false;
    // if (isFounderAccount) return false;
    // if (isUnlimitedUsage(effectiveUsage)) return false;
    // if (effectiveUsage?.termsAccepted === false) return false;
    // return true;
  }, [status, profileReady, isFounderAccount, effectiveUsage]);

  const schedulePaywallReminder = useCallback(
    function schedulePaywallReminder(delay = PAYWALL_REMINDER_INTERVAL_MS) {
      if (typeof window === 'undefined') return;
      if (!shouldShowPaywallReminder()) return;

      clearPaywallTimer();
      paywallTimerRef.current = window.setTimeout(() => {
        paywallTimerRef.current = null;
        if (!shouldShowPaywallReminder()) {
          return;
        }
        setHasDismissedPaywall(false);
        showPaywall();
        schedulePaywallReminder(PAYWALL_REMINDER_INTERVAL_MS);
      }, delay);
    },
    [clearPaywallTimer, shouldShowPaywallReminder, showPaywall],
  );

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (profileReady) return;
    hidePaywall({ reason: 'profile-pending' });
    setShowPaywallModal(false);
  }, [status, profileReady, hidePaywall]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      setHasDismissedPaywall(false);
      setUsageData(DEFAULT_USAGE_DATA);
      hidePaywall({ reason: 'signed-out' });
      clearPaywallTimer();
    }
  }, [status, hidePaywall, clearPaywallTimer]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handlePaywallDismiss = () => {
      setHasDismissedPaywall(true);
      setShowPaywallModal(false);
      clearPaywallTimer();
      schedulePaywallReminder(PAYWALL_REMINDER_INTERVAL_MS);
    };

    window.addEventListener('paywall:dismissed', handlePaywallDismiss);
    return () => {
      window.removeEventListener('paywall:dismissed', handlePaywallDismiss);
    };
  }, [clearPaywallTimer, schedulePaywallReminder]);

  useEffect(() => {
    return () => {
      if (paywallTimerRef.current) {
        clearTimeout(paywallTimerRef.current);
        paywallTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!shouldShowPaywallReminder()) {
      clearPaywallTimer();
      return;
    }

    if (paywallTimerRef.current) {
      return;
    }

    let delay = PAYWALL_REMINDER_INTERVAL_MS;
    if (typeof window !== 'undefined') {
      const reminderKey = `${REMINDER_LOCAL_STORAGE_KEY}:${sessionUser?.email || 'anonymous'}`;
      const hasSeenReminder = window.localStorage.getItem(reminderKey);
      if (!hasSeenReminder) {
        delay = INITIAL_REMINDER_DELAY_MS;
        window.localStorage.setItem(reminderKey, 'true');
      }
    }

    schedulePaywallReminder(delay);
  }, [
    shouldShowPaywallReminder,
    schedulePaywallReminder,
    clearPaywallTimer,
    sessionUser?.email,
  ]);

  useEffect(() => {
    if (!profileReady) return;

    const handler = () => {
      setUsageLoading(true);
      refreshUsage()
        .catch((error) => {
          console.error('[PAGE] Error refreshing usage data (event):', error);
        })
        .finally(() => {
          setUsageLoading(false);
        });
    };

    window.addEventListener('usage-paywall-refresh', handler);
    return () => window.removeEventListener('usage-paywall-refresh', handler);
  }, [profileReady, refreshUsage]);

  // Example prompts
  const examplePrompts = [
    t('prompt.example1'),
    t('prompt.example2'),
    t('prompt.example3'),
    t('prompt.example4'),
    t('prompt.example5')
  ];
  const limitedExamples = examplePrompts.slice(0, 3);

  // Progress helpers
  function startProgress(label = 'Analizando tu intención musical...') {
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
      
      try {
        const parsed = JSON.parse(cooldownData);
        if (!parsed || !parsed.expiresAt) return false;
        return new Date() < new Date(parsed.expiresAt);
      } catch (parseError) {
        console.error('[FEEDBACK] Error parsing cooldown data:', parseError);
        return false;
      }
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

  function handleViewPlans() {
    window.location.href = '/pricing';
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
    // heurística sencilla: si el prompt contiene "sin X" exclúyelo
    const neg = [];
    const m = p.match(/sin\s+([^\.,;]+)/i);
    if (m && m[1]) neg.push(m[1].trim());
    intent.constraints.exclude_artists = neg;
    return intent;
  }

  // ═══════════════════════════════════════════════════════════════
  // NUEVO: Generar playlist usando el Agente PLEIA
  // ═══════════════════════════════════════════════════════════════
  async function generatePlaylistWithAgent(prompt, wanted, customPlaylistName) {
    return new Promise((resolve, reject) => {
      let allTracks = [];
      let eventSource;
      let usageConsumed = false;
      let completed = false;

      // Limpiar pensamientos anteriores
      setAgentThoughts([]);

      const finalizeGeneration = (payload = {}) => {
        if (completed) return;
        completed = true;

        const target = payload.totalTracks ?? wanted;
        if (Array.isArray(payload.tracks) && payload.tracks.length > 0) {
          allTracks = payload.tracks.slice(0, target);
        }

        setTracks([...allTracks]);
        setPlaylistMeta(payload.playlist || null);

        finishProgress();
        setIsGenerationComplete(true);
        setStatusText(`✅ ¡Listo! ${allTracks.length} canciones encontradas`);

        if (eventSource) {
          eventSource.close();
        }

        resolve({
          tracks: allTracks,
          totalSoFar: allTracks.length,
          playlist: payload.playlist || null
        });
      };

      try {
        // Crear EventSource para el agente
        const params = new URLSearchParams({
          prompt,
          target_tracks: wanted.toString(),
          playlist_name: customPlaylistName || safeDefaultName(prompt)
        });
        
        const streamUrl = new URL('/api/agent/stream', window.location.origin);
        streamUrl.search = params.toString();
        eventSource = new EventSource(streamUrl.toString());

        // Evento: Agente inicia
        eventSource.addEventListener('AGENT_START', (event) => {
          try {
            if (!event.data || event.data.trim() === '') return;
            const data = JSON.parse(event.data);
            bumpPhase(data.message || 'Iniciando agente...', 10);
            setStatusText(`🤖 ${data.message || 'Iniciando agente...'}`);
          } catch (e) {
            console.error('[AGENT] Error parsing AGENT_START:', e, 'Raw data:', event.data);
          }
        });

        // Evento: Pensamiento del agente (se acumulan, máximo 10 para permitir scroll)
        eventSource.addEventListener('AGENT_THINKING', (event) => {
          try {
            if (!event.data || event.data.trim() === '') return;
            const data = JSON.parse(event.data);
            if (data.thought) {
              setAgentThoughts(prev => {
                // Evitar duplicados consecutivos
                if (prev.length > 0 && prev[prev.length - 1] === data.thought) {
                  return prev;
                }
                // Mantener máximo 10 pensamientos para permitir scroll
                const newThoughts = [...prev, data.thought].slice(-10);
                return newThoughts;
              });
            }
          } catch (e) {
            console.error('[AGENT] Error parsing AGENT_THINKING:', e);
          }
        });

        // Evento: Plan generado
        eventSource.addEventListener('AGENT_PLAN', (event) => {
          try {
            if (!event.data || event.data.trim() === '') return;
            const data = JSON.parse(event.data);
            bumpPhase(`Ejecutando ${data.steps} pasos...`, 20);
          } catch (e) {
            console.error('[AGENT] Error parsing AGENT_PLAN:', e, 'Raw data:', event.data);
          }
        });

        // Evento: Herramienta inicia (solo log, progreso silencioso)
        eventSource.addEventListener('TOOL_START', (event) => {
          try {
            if (!event.data || event.data.trim() === '') return;
            const data = JSON.parse(event.data);
            const progress = 20 + (data.stepIndex / data.totalSteps) * 60;
            bumpPhase('', progress); // Progreso silencioso, sin mensaje
          } catch (e) {
            console.error('[AGENT] Error parsing TOOL_START:', e, 'Raw data:', event.data);
          }
        });

        // Evento: Herramienta completada (solo progreso, sin mensaje visible)
        eventSource.addEventListener('TOOL_COMPLETE', (event) => {
          try {
            if (!event.data || event.data.trim() === '') return;
            const data = JSON.parse(event.data);
            // Actualizar progreso silenciosamente
            const progress = Math.min(data.totalSoFar / data.target, 1);
            bumpPhase('', 20 + progress * 60);
          } catch (e) {
            console.error('[AGENT] Error parsing TOOL_COMPLETE:', e);
          }
        });

        // Evento: Fallback activado
        eventSource.addEventListener('FALLBACK_ACTIVATED', (event) => {
          try {
            if (!event.data || event.data.trim() === '') return;
            const data = JSON.parse(event.data);
            console.log('[AGENT] Fallback activated:', data);
            setAgentThoughts(prev => [...prev, data.message || 'Usando sistema de respaldo...']);
            bumpPhase('Sistema de respaldo activado...', 30);
          } catch (e) {
            console.error('[AGENT] Error parsing FALLBACK_ACTIVATED:', e);
          }
        });

        // Evento: Tracks (usado por el fallback)
        eventSource.addEventListener('TRACKS', async (event) => {
          try {
            if (!event.data || event.data.trim() === '') return;
            const data = JSON.parse(event.data);
            
            if (data.tracks && Array.isArray(data.tracks)) {
              // Consumir uso en el primer chunk
              if (!usageConsumed && data.tracks.length > 0) {
                usageConsumed = true;
                setUsageLoading(true);
                try {
                  const latestUsage = await refreshUsage();
                  if (latestUsage) {
                    setUsageData(latestUsage);
                  }
                } catch (error) {
                  console.error('[AGENT] Error refreshing usage:', error);
                } finally {
                  setUsageLoading(false);
                }
              }

              // Actualizar tracks parciales
              allTracks = [...allTracks, ...data.tracks];
              setTracks([...allTracks]);
              
              // Actualizar progreso
              const progress = data.progress || Math.min((allTracks.length / data.total) * 100, 100);
              bumpPhase('', 20 + (progress / 100) * 60);
            }
          } catch (e) {
            console.error('[AGENT] Error parsing TRACKS:', e);
          }
        });

        // Evento: Chunk de tracks (consumir uso, pero sin mostrar mensaje)
        eventSource.addEventListener('TRACKS_CHUNK', async (event) => {
          try {
            if (!event.data || event.data.trim() === '') return;
            const data = JSON.parse(event.data);
            
            // Consumir uso en el primer chunk
            if (!usageConsumed && data.tracks && data.tracks.length > 0) {
              usageConsumed = true;
              setUsageLoading(true);
              try {
                const latestUsage = await refreshUsage();
                if (latestUsage) {
                  setUsageData(latestUsage);
                }
              } catch (error) {
                console.error('[AGENT] Error refreshing usage:', error);
              } finally {
                setUsageLoading(false);
              }
            }

            // Actualizar tracks parciales
            allTracks = [...allTracks, ...data.tracks];
            setTracks([...allTracks]);
            
            // Solo actualizar progreso, sin mensaje que se quede bugeado
            const progress = Math.min(data.totalSoFar / data.target, 1);
            bumpPhase('', 20 + progress * 60);
          } catch (e) {
            console.error('[AGENT] Error parsing TRACKS_CHUNK:', e);
          }
        });

        // Evento: Completado
        eventSource.addEventListener('DONE', (event) => {
          try {
            if (!event.data || event.data.trim() === '') return;
            const data = JSON.parse(event.data);
            
            // Limpiar TODOS los pensamientos y status inmediatamente al completar
            setAgentThoughts([]);
            setStatusText(''); // Limpiar cualquier mensaje residual
            
            // Si fue fallback, mostrar mensaje especial
            if (data.fallback) {
              setStatusText(`✅ ${data.message || 'Playlist generada con sistema de respaldo'}`);
            }
            
            bumpPhase('', 100); // Sin mensaje, solo progreso
            finalizeGeneration(data);
          } catch (e) {
            console.error('[AGENT] Error parsing DONE:', e);
          }
        });

        // Evento: Error
        eventSource.addEventListener('ERROR', (event) => {
          try {
            if (!event.data || event.data.trim() === '') {
              // Si ya tenemos tracks del fallback, no mostrar error
              if (allTracks.length > 0) {
                console.log('[AGENT] Error received but we have tracks from fallback, ignoring error');
                return;
              }
              setError('Error desconocido');
              return;
            }
            const data = JSON.parse(event.data);
            console.error('[AGENT] ERROR event:', data);
            
            // Si el fallback falló pero ya tenemos tracks, no mostrar error
            if (data.fallbackFailed && allTracks.length > 0) {
              console.log('[AGENT] Fallback failed but we have tracks, finalizing with existing tracks');
              finalizeGeneration({ tracks: allTracks, totalTracks: allTracks.length });
              return;
            }
            
            // Si no hay tracks, mostrar error
            if (allTracks.length === 0) {
              setError(data.error || 'Error generando playlist');
              setAgentThoughts([]); // Limpiar pensamientos en error
              if (eventSource) {
                eventSource.close();
              }
              finishProgress();
              reject(new Error('Agent error'));
            } else {
              // Si tenemos tracks, finalizar con éxito aunque haya error
              console.log('[AGENT] Error but we have tracks, finalizing with success');
              finalizeGeneration({ tracks: allTracks, totalTracks: allTracks.length });
            }
          } catch (e) {
            console.error('[AGENT] Error parsing ERROR event:', e, 'Raw data:', event.data);
            // Si tenemos tracks, finalizar con éxito
            if (allTracks.length > 0) {
              finalizeGeneration({ tracks: allTracks, totalTracks: allTracks.length });
            } else {
              setError('Error desconocido');
              setAgentThoughts([]);
              if (eventSource) {
                eventSource.close();
              }
              finishProgress();
              reject(new Error('Agent error'));
            }
          }
        });

        // Error de conexión
        eventSource.onerror = (error) => {
          console.error('[AGENT] EventSource error:', error);
          if (!completed) {
            if (allTracks.length > 0) {
              finalizeGeneration({ tracks: allTracks, totalTracks: allTracks.length });
            } else {
              setError('Error de conexión con el agente');
              finishProgress();
              reject(new Error('Connection error'));
            }
          }
          if (eventSource) {
            eventSource.close();
          }
        };

      } catch (error) {
        console.error('[AGENT] Error:', error);
        setError(error.message);
        finishProgress();
        reject(error);
      }
    });
  }

  // Generate playlist using streaming SSE (sistema clásico)
  async function generatePlaylistWithStreaming(prompt, wanted, customPlaylistName) {
    return new Promise((resolve, reject) => {
      let allTracks = [];
      let eventSource;
      let usageConsumed = false; // Track if we've consumed a usage
      let completed = false;
      let nearCompletionTimer = null;
      const NEAR_THRESHOLD = 5;
      const NEAR_TIMEOUT_MS = 5000;

      const finalizeGeneration = (payload = {}) => {
        if (completed) return;
        completed = true;

        if (nearCompletionTimer) {
          clearTimeout(nearCompletionTimer);
          nearCompletionTimer = null;
        }

        const target = payload.target ?? wanted;
        if (Array.isArray(payload.tracks) && payload.tracks.length > 0) {
          allTracks = payload.tracks.slice(0, target ?? payload.tracks.length);
        } else if (target && allTracks.length > target) {
          allTracks = allTracks.slice(0, target);
        }

        setTracks([...allTracks]);
        setPlaylistMeta(payload.playlist || null);

        finishProgress();
        setIsGenerationComplete(true);

        const computedTotal = Math.min(
          payload.totalSoFar ?? allTracks.length,
          target ?? allTracks.length
        );
        const targetDisplay = target ?? allTracks.length;

        if (payload.partial) {
          setStatusText(`✅ Playlist generated (${computedTotal}/${targetDisplay} tracks) - ${payload.reason || 'partial completion'}`);
        } else {
          setStatusText(`✅ ${t('progress.completed')} - ${computedTotal}/${targetDisplay} tracks generated successfully!`);
        }

        if (eventSource) {
          eventSource.close();
        }

        resolve({
          tracks: allTracks,
          totalSoFar: computedTotal,
          partial: !!payload.partial,
          reason: payload.reason || 'completed',
          playlist: payload.playlist || null
        });
      };
      
      try {
        // Create EventSource with query parameters (EventSource doesn't support POST)
        const params = new URLSearchParams({
          prompt,
          target_tracks: wanted.toString(),
          playlist_name: playlistName || safeDefaultName(prompt)
        });
        
        const streamUrl = new URL('/api/playlist/stream', window.location.origin);
        streamUrl.search = params.toString();
        eventSource = new EventSource(streamUrl.toString());
        
        // Handle different event types
        eventSource.addEventListener('LLM_START', (event) => {
          try {
            if (!event.data || event.data.trim() === '') return;
            const data = JSON.parse(event.data);
            bumpPhase(data.message || 'Processing LLM tracks...', 30);
            setStatusText(`🎵 ${data.message || 'Processing LLM tracks...'}`);
          } catch (parseError) {
            console.error('[SSE] Failed to parse LLM_START data:', parseError, 'Raw data:', event.data);
          }
        });
        
        eventSource.addEventListener('LLM_CHUNK', async (event) => {
          let data;
          try {
            if (!event.data || event.data.trim() === '') return;
            data = JSON.parse(event.data);
          } catch (parseError) {
            console.error('[SSE] Failed to parse LLM_CHUNK data:', parseError, 'Raw data:', event.data);
            return;
          }
          
          if (data.trimmed) {
            // Handle trim message
            setStatusText(`🎵 ${data.message || 'Trimmed LLM tracks to 75%'}`);
            return;
          }
          
          // Consume usage when first track appears (before rendering)
          if (!usageConsumed && data.tracks && data.tracks.length > 0) {
            console.log('[USAGE] First track appeared, refreshing usage counters');
            usageConsumed = true;
            setUsageLoading(true);
            try {
              const latestUsage = await refreshUsage();
              if (latestUsage) {
                setUsageData(latestUsage);
              }
            } catch (error) {
              console.error('[USAGE] Error refreshing usage after first track:', error);
            } finally {
              setUsageLoading(false);
            }
          }
          
          allTracks = [...allTracks, ...data.tracks];

          const target = data.target ?? wanted;
          if (target && allTracks.length >= target) {
            allTracks = allTracks.slice(0, target);
            finalizeGeneration({
              ...data,
              tracks: [...allTracks],
              totalSoFar: Math.min(data.totalSoFar ?? allTracks.length, target),
              target,
              partial: false,
            });
            return;
          }

          setTracks([...allTracks]);
          
          const progress = data.progress || Math.round((data.totalSoFar / data.target) * 100);
          const phaseProgress = Math.min(30 + (progress * 0.3), 60); // 30-60% for LLM phase
          bumpPhase(data.message || `🎵 Found ${data.totalSoFar}/${data.target} tracks`, phaseProgress);
          setStatusText(`🎵 ${data.message || `Found ${data.totalSoFar}/${data.target} tracks (${progress}%)`}`);

          if (target && allTracks.length >= Math.max(1, target - NEAR_THRESHOLD) && allTracks.length < target) {
            if (nearCompletionTimer) clearTimeout(nearCompletionTimer);
            nearCompletionTimer = setTimeout(() => {
              finalizeGeneration({
                ...data,
                tracks: [...allTracks],
                totalSoFar: allTracks.length,
                target,
                partial: true,
                reason: 'near-target',
              });
            }, NEAR_TIMEOUT_MS);
          } else if (nearCompletionTimer) {
            clearTimeout(nearCompletionTimer);
            nearCompletionTimer = null;
          }
        });
        
        eventSource.addEventListener('LLM_DONE', (event) => {
          try {
            if (!event.data || event.data.trim() === '') return;
            const data = JSON.parse(event.data);
            bumpPhase('🎵 LLM phase complete', 60);
            setStatusText(`🎵 LLM phase complete: ${data.totalSoFar}/${data.target} tracks`);
          } catch (parseError) {
            console.error('[SSE] Failed to parse LLM_DONE data:', parseError, 'Raw data:', event.data);
          }
        });
        
        eventSource.addEventListener('SPOTIFY_START', (event) => {
          try {
            if (!event.data || event.data.trim() === '') return;
            const data = JSON.parse(event.data);
            const attempt = data.attempt ? ` (Attempt ${data.attempt})` : '';
            bumpPhase(`🎧 ${data.message || 'Getting Spotify recommendations...'}${attempt}`, 70);
            setStatusText(`🎧 ${data.message || 'Getting Spotify recommendations...'}${attempt}`);
          } catch (parseError) {
            console.error('[SSE] Failed to parse SPOTIFY_START data:', parseError, 'Raw data:', event.data);
          }
        });
        
        eventSource.addEventListener('SPOTIFY_CHUNK', (event) => {
          let data;
          try {
            if (!event.data || event.data.trim() === '') return;
            data = JSON.parse(event.data);
          } catch (parseError) {
            console.error('[SSE] Failed to parse SPOTIFY_CHUNK data:', parseError, 'Raw data:', event.data);
            return;
          }
          allTracks = [...allTracks, ...data.tracks];

          const target = data.target ?? wanted;
          if (target && allTracks.length >= target) {
            allTracks = allTracks.slice(0, target);
            finalizeGeneration({
              ...data,
              tracks: [...allTracks],
              totalSoFar: Math.min(data.totalSoFar ?? allTracks.length, target),
              target,
              partial: false,
            });
            return;
          }

          setTracks([...allTracks]);
          
          const progress = data.progress || Math.round((data.totalSoFar / data.target) * 100);
          const phaseProgress = Math.min(60 + (progress * 0.3), 90); // 60-90% for Spotify phase
          const attempt = data.attempt ? ` (Attempt ${data.attempt})` : '';
          const final = data.final ? ' - Final attempt' : '';
          
          bumpPhase(`🎧 ${data.message || `Found ${data.totalSoFar}/${data.target} tracks`}${attempt}`, phaseProgress);
          setStatusText(`🎧 ${data.message || `Found ${data.totalSoFar}/${data.target} tracks (${progress}%)`}${attempt}${final}`);

          if (target && allTracks.length >= Math.max(1, target - NEAR_THRESHOLD) && allTracks.length < target) {
            if (nearCompletionTimer) clearTimeout(nearCompletionTimer);
            nearCompletionTimer = setTimeout(() => {
              finalizeGeneration({
                ...data,
                tracks: [...allTracks],
                totalSoFar: allTracks.length,
                target,
                partial: true,
                reason: 'near-target',
              });
            }, NEAR_TIMEOUT_MS);
          } else if (nearCompletionTimer) {
            clearTimeout(nearCompletionTimer);
            nearCompletionTimer = null;
          }
        });
        
        eventSource.addEventListener('SPOTIFY_DONE', (event) => {
          try {
            if (!event.data || event.data.trim() === '') return;
            const data = JSON.parse(event.data);
            const attempt = data.attempt ? ` (Attempt ${data.attempt})` : '';
            bumpPhase('🎧 Spotify phase complete', 90);
            setStatusText(`🎧 Spotify phase complete${attempt}: ${data.totalSoFar}/${data.target} tracks`);
          } catch (parseError) {
            console.error('[SSE] Failed to parse SPOTIFY_DONE data:', parseError, 'Raw data:', event.data);
          }
        });
        
        eventSource.addEventListener('DONE', (event) => {
          let data;
          try {
            if (!event.data || event.data.trim() === '') return;
            data = JSON.parse(event.data);
          } catch (parseError) {
            console.error('[SSE] Failed to parse DONE data:', parseError, 'Raw data:', event.data);
            return;
          }
          
          console.log('[FRONTEND] DONE event received:', data);
          console.log('[FRONTEND] Current allTracks length:', allTracks.length);
          console.log('[FRONTEND] Data tracks length:', data.tracks?.length || 0);
          
          finalizeGeneration(data);
        });
        
        eventSource.addEventListener('ERROR', async (event) => {
          let data;
          try {
            if (!event.data || event.data.trim() === '') {
              setError('Error processing playlist generation');
              resetProgress();
              reject(new Error('Empty error response'));
              return;
            }
            data = JSON.parse(event.data);
          } catch (parseError) {
            console.error('[SSE] Failed to parse ERROR data:', parseError, 'Raw data:', event.data);
            setError('Error processing playlist generation');
            resetProgress();
            reject(new Error('Failed to parse error response'));
            return;
          }
          if (data.code === 'TERMS_NOT_ACCEPTED') {
            eventSource.close();
            const redirectTarget = `${window.location.pathname}${window.location.search || ''}`;
            router.push(`/onboarding/create?redirect=${encodeURIComponent(redirectTarget)}`);
            setError('Debes aceptar los términos y condiciones para continuar.');
            resetProgress();
            reject(new Error('TERMS_NOT_ACCEPTED'));
            return;
          }
          if (data.code === 'LIMIT_REACHED') {
            eventSource.close();
            if (nearCompletionTimer) {
              clearTimeout(nearCompletionTimer);
            }
            completed = true;
            setTracks([]);
            setStatusText('🚫 Has llegado al límite gratuito');
            setError(null);
            setIsGenerationComplete(false);
            setShowUsageLimit(true);
            resetProgress();

            let latestUsage = null;
            try {
              setUsageLoading(true);
              latestUsage = await refreshUsage();
              if (latestUsage) {
                setUsageData(latestUsage);
              }
            } catch (refreshError) {
              console.error('[USAGE] Failed to refresh after limit reached:', refreshError);
            } finally {
              setUsageLoading(false);
            }

            setHasDismissedPaywall(false);
            showPaywall(latestUsage || usageData || DEFAULT_USAGE_DATA);
            resolve({ code: 'LIMIT_REACHED' });
            return;
          }
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
        let errorHandled = false;
        eventSource.onerror = (error) => {
          // Solo mostrar error una vez para evitar spam
          if (errorHandled) {
            console.warn('[SSE] Connection error (already handled, ignoring duplicate)');
            return;
          }
          errorHandled = true;
          
          console.error('[SSE] Connection error:', error);
          
          // Solo hacer fallback si realmente hay un error de conexión
          // No hacer fallback si el EventSource está en estado CONNECTING (puede ser normal)
          if (eventSource.readyState === EventSource.CLOSED) {
            console.log('[SSE] Connection closed, falling back to regular generation...');
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
                playlist_name: customPlaylistName || safeDefaultName(prompt)
              }),
            })
            .then(res => res.json())
            .then(async data => {
              if (data?.code === 'TERMS_NOT_ACCEPTED') {
                const redirectTarget = `${window.location.pathname}${window.location.search || ''}`;
                router.push(`/onboarding/create?redirect=${encodeURIComponent(redirectTarget)}`);
                setError('Debes aceptar los términos y condiciones para continuar.');
                resetProgress();
                reject(new Error('TERMS_NOT_ACCEPTED'));
                return;
              }
              if (data?.code === 'LIMIT_REACHED') {
                setTracks([]);
                setStatusText('🚫 Has llegado al límite gratuito');
                setError(null);
                setShowUsageLimit(true);
                resetProgress();
                let latestUsage = null;
                try {
                  setUsageLoading(true);
                  latestUsage = await refreshUsage();
                  if (latestUsage) setUsageData(latestUsage);
                } catch (refreshError) {
                  console.error('[USAGE] Failed to refresh after limit reached (fallback):', refreshError);
                } finally {
                  setUsageLoading(false);
                }
                setHasDismissedPaywall(false);
                showPaywall(latestUsage || usageData || DEFAULT_USAGE_DATA);
                resolve({ code: 'LIMIT_REACHED' });
                return;
              }
              if (data.tracks) {
                setTracks(data.tracks);
                finishProgress();
                setStatusText(`${t('progress.completed')} (${data.count || data.tracks.length}/${wanted})`);
                setIsGenerationComplete(true);
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
            playlist_name: customPlaylistName || safeDefaultName(prompt)
          }),
        })
        .then(res => res.json())
        .then(async data => {
          if (data?.code === 'TERMS_NOT_ACCEPTED') {
            const redirectTarget = `${window.location.pathname}${window.location.search || ''}`;
            router.push(`/onboarding/terms?redirect=${encodeURIComponent(redirectTarget)}`);
            setError('Debes aceptar los términos y condiciones para continuar.');
            resetProgress();
            reject(new Error('TERMS_NOT_ACCEPTED'));
            return;
          }
          if (data?.code === 'LIMIT_REACHED') {
            setTracks([]);
            setStatusText('🚫 Has llegado al límite gratuito');
            setError(null);
            setShowUsageLimit(true);
            resetProgress();
            let latestUsage = null;
            try {
              setUsageLoading(true);
              latestUsage = await refreshUsage();
              if (latestUsage) setUsageData(latestUsage);
            } catch (refreshError) {
              console.error('[USAGE] Failed to refresh after limit reached (fallback setup):', refreshError);
            } finally {
              setUsageLoading(false);
            }
            setHasDismissedPaywall(false);
            showPaywall(latestUsage || usageData || DEFAULT_USAGE_DATA);
            resolve({ code: 'LIMIT_REACHED' });
            return;
          }
          if (data.tracks) {
            setTracks(data.tracks);
            finishProgress();
            setStatusText(`${t('progress.completed')} (${data.count || data.tracks.length}/${wanted})`);
              setIsGenerationComplete(true);
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
    
    // Si no hay sesión, mostrar modal de login con show_dialog=true
    if (!sessionUser) {
      // Función para leer cookie ea_snooze
      const getEaSnoozeCookie = () => {
        if (typeof window === 'undefined') return false;
        const cookies = document.cookie.split(';');
        const eaSnoozeCookie = cookies.find(cookie => 
          cookie.trim().startsWith('ea_snooze=')
        );
        return eaSnoozeCookie?.trim().split('=')[1] === '1';
      };

      const redirectTarget = `${window.location.pathname}${window.location.search || ''}`;
      login(redirectTarget);
      return;
    }

    setIsGenerationComplete(false);
    setPlaylistMeta(null);
    setCopyStatus(null);
    setPageLoading(false);

    // Check usage limit before generating (but don't consume yet)
    try {
      console.log('[USAGE] Checking usage before generation');
      setUsageLoading(true);
      const refreshed = await refreshUsage();
      const snapshot = refreshed || usageStatusData || usageData || DEFAULT_USAGE_DATA;
      setUsageData(snapshot);

      const unlimited = isUnlimitedUsage(snapshot) || isFounderAccount;
      let remainingCount = Infinity;
      if (!unlimited) {
        const rawRemaining = snapshot?.usage?.remaining ?? snapshot?.remaining ?? 0;
        if (typeof rawRemaining === 'number') {
          remainingCount = rawRemaining;
        } else if (typeof rawRemaining === 'string') {
          const normalized = rawRemaining.toLowerCase();
          remainingCount = normalized === 'unlimited' || normalized === '∞' ? Infinity : parseInt(rawRemaining, 10);
        } else {
          remainingCount = 0;
        }
      }

      const termsAccepted = snapshot?.termsAccepted ?? true;
      if (!termsAccepted) {
        const redirectTarget = `${window.location.pathname}${window.location.search || ''}`;
        router.push(`/onboarding/create?redirect=${encodeURIComponent(redirectTarget)}`);
        setError('Debes aceptar los términos y condiciones para continuar.');
        return;
      }

      if (!unlimited && (Number.isNaN(remainingCount) || remainingCount <= 0)) {
        console.log('[USAGE] No remaining uses, showing paywall');
        showPaywall(snapshot);
        setError('Se agotaron tus playlists gratuitas. Consigue acceso ilimitado con el Founder Pass.');
        return;
      }

      if (unlimited) {
        console.log('[USAGE] User has unlimited access, proceeding with generation');
      } else {
        console.log('[USAGE] Remaining uses:', remainingCount, '- proceeding with generation');
      }
    } catch (error) {
      console.error('[USAGE] Error checking usage:', error);
      // Continue anyway if check fails
    } finally {
      setUsageLoading(false);
    }

    // Asegurar número y límites 1–200
    const wanted = Math.max(1, Math.min(200, Number(count) || 50));

    setLoading(true);
    setTracks([]);
    setError(null);
    setShowUsageLimit(false);
    // Reset playlist creation state for new preview
    setIsCreated(false);
    setSpotifyUrl(null);
    setCreateError(null);
    startProgress('Analizando tu intención musical...');

    try {
      bumpPhase('Analizando tu intención musical...', 20);
      
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
      
      bumpPhase('Explorando catálogos y conexiones...', 40);

      // Step 2: Generate playlist
      // Use streaming in production, fallback to regular endpoint
      const isProduction = process.env.NODE_ENV === 'production';
      const endpoint = sessionUser ? "/api/playlist/llm" : "/api/playlist/demo";
      
      // Use streaming SSE for both mobile and desktop - SAME LOGIC
      if (sessionUser) {
        // Usar el sistema de agente si está habilitado, sino el clásico
        if (isAgentMode) {
          await generatePlaylistWithAgent(prompt, wanted, customPlaylistName);
        } else {
          await generatePlaylistWithStreaming(prompt, wanted, customPlaylistName);
        }
      } else {
        // Use regular fetch for demo or development
        const playlistRes = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ 
            prompt, 
            target_tracks: wanted,
            playlist_name: customPlaylistName || safeDefaultName(prompt)
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
          } else if (playlistData?.code === 'TERMS_NOT_ACCEPTED' || playlistRes.status === 403) {
            const redirectTarget = `${window.location.pathname}${window.location.search || ''}`;
            router.push(`/onboarding/create?redirect=${encodeURIComponent(redirectTarget)}`);
            setError('Debes aceptar los términos y condiciones para continuar.');
          } else if (playlistData?.code === 'LIMIT_REACHED') {
            setShowUsageLimit(true);
            setTracks([]);
            setError(null);
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
        setIsGenerationComplete(true);
        
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
    console.log('[CLIENT] ===== handleCreate CALLED =====');
    console.log('[CLIENT] Tracks count:', tracks?.length || 0);
    console.log('[CLIENT] Session:', sessionUser?.email || 'NO SESSION');
    
    if (!tracks.length) return;
    if (!sessionUser) {
      const redirectTarget = `${window.location.pathname}${window.location.search || ''}`;
      login(redirectTarget);
      return;
    }

    try {
      setIsCreating(true);
      setIsCreated(false);
      setCreateError(null);
      
      const baseName = (customPlaylistName && customPlaylistName.trim().length > 0)
        ? customPlaylistName.trim()
        : safeDefaultName(prompt);
      const nameWithBrand = baseName.toLowerCase().endsWith(' by pleia')
        ? baseName
        : `${baseName} by PLEIA`;
      
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
        uris,
        prompt: prompt // Pass prompt for title generation
      };
      
      console.log('[CLIENT] create: uris_count=', Array.isArray(tracks) ? tracks.filter(t=>t?.uri || t?.id).length : 0);
      
      const res = await fetch('/api/spotify/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      console.log('[CLIENT] create: res.ok=', res.ok, 'payload_ok=', !!data?.ok);
      console.log('[CLIENT] create: data received:', data);
      
      // PROMPT 9: Handle errors (no longer need Spotify session since we use hub token)
      if (res.status === 401 || data?.code === 'NO_SESSION') {
        throw new Error(data?.message || "Error al crear la playlist. Por favor, inténtalo de nuevo.");
      }
      
      if (!res.ok || !data?.ok) throw new Error(data?.error || data?.message || 'Failed to create playlist');
      
      // FIXPACK: SOLO ahora marcamos creada y mostramos botones
      const playlistUrl = data?.playlistUrl || data?.url || `https://open.spotify.com/playlist/${data?.playlistId}`;
      setSpotifyUrl(playlistUrl);
      setIsCreated(true);
      setCustomPlaylistName(''); // Keep input empty after creation
      
      // NO abrir Spotify automáticamente - el usuario puede hacerlo con el botón
      
      const addedText = data.trackCount ? ` (${data.trackCount} canciones añadidas)` : '';
      setStatusText(`Playlist creada 🎉 en PLEIAHUB${addedText}`);
      
      console.log('[CLIENT] ===== ABOUT TO SAVE PLAYLIST =====');
      console.log('[CLIENT] playlistId:', data.playlistId);
      console.log('[CLIENT] playlistUrl:', playlistUrl);
      console.log('[CLIENT] sessionUser.email:', sessionUser?.email);
      
      // Save playlist to user's collection (async, don't block)
      const savePlaylistPromise = (async () => {
        try {
          console.log('[CLIENT] Saving playlist to user collection...');
          const userPlaylistData = {
            playlistId: data.playlistId,
            name: data?.name || nameWithBrand,
            url: playlistUrl,
            tracks: uris.length,
            prompt: prompt,
            public: true, // Default public
          };

          console.log('[CLIENT] Playlist data to save:', JSON.stringify(userPlaylistData, null, 2));

          const userPlaylistResponse = await fetch('/api/userplaylists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userPlaylistData)
          });

          const userPlaylistResult = await userPlaylistResponse.json();
          console.log('[CLIENT] User playlist save result:', userPlaylistResult);
          
          if (userPlaylistResult.success) {
            console.log('✅ Saved playlist to user collection:', userPlaylistData.name);
            // Refresh playlists list
            if (fetchUserPlaylists) {
              fetchUserPlaylists();
            }
          } else {
            console.error('❌ Failed to save playlist:', userPlaylistResult);
            // Fallback to localStorage if server save failed
            try {
              const localKey = `jey_user_playlists:${sessionUser?.email || ''}`;
              const existingPlaylists = JSON.parse(localStorage.getItem(localKey) || '[]');
              const updatedPlaylists = [userPlaylistData, ...existingPlaylists].slice(0, 200);
              localStorage.setItem(localKey, JSON.stringify(updatedPlaylists));
              console.log('✅ Saved playlist to localStorage as fallback:', userPlaylistData.name);
              // Refresh playlists list
              if (fetchUserPlaylists) {
                fetchUserPlaylists();
              }
            } catch (localStorageError) {
              console.error('❌ Failed to save to localStorage:', localStorageError);
            }
          }
        } catch (userPlaylistError) {
          console.error('Error saving user playlist:', userPlaylistError);
        }
      })();
      
      // Register playlist in trending (async, don't block)
      const registerTrendingPromise = (async () => {
        try {
          console.log('[CLIENT] Registering playlist in trending...');
          const trendingResponse = await fetch('/api/trending', {
            method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: prompt,
            playlistName: customPlaylistName || data?.name || 'Mi playlist', 
            playlistId: data.playlistId,
            spotifyUrl: playlistUrl,
            trackCount: uris.length
          })
        });
        console.log('[CLIENT] Trending registration:', trendingResponse.ok ? 'success' : 'failed');
      } catch (trendingError) {
        console.error('Error registering playlist in trending:', trendingError);
        // Don't fail the main flow if trending registration fails
      }
      })();
      
      // Both operations run in background, don't block UI
      
      // Dispatch event for FeedbackGate
      window.dispatchEvent(new CustomEvent('playlist:created', { detail: { id: data.playlistId, url: data.playlistUrl } }));
      
      // Qualify referral if user has a referrer
      try {
        console.log('[REF] Qualifying referral for playlist creation...');
        const qualifyResponse = await fetch('/api/referrals/qualify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (qualifyResponse.ok) {
          const qualifyResult = await qualifyResponse.json();
          console.log('[REF] Referral qualification result:', qualifyResult);
          
          if (qualifyResult.qualified && qualifyResult.referrerUpgraded) {
            console.log('[REF] Referrer upgraded to founder!', qualifyResult.referrerEmail);
            // Show success toast or notification
            alert(`🎉 ¡Felicidades! Has ayudado a ${qualifyResult.referrerEmail} a conseguir Founder de por vida.`);
          }
        }
      } catch (qualifyError) {
        console.error('[REF] Error qualifying referral:', qualifyError);
        // Don't fail the main flow if referral qualification fails
      }
      
    } catch (e) {
      console.error('[UI-CREATE] error:', e);
      setCreateError(e?.message || 'Error al crear playlist');
      alert(e?.message || 'Error al crear playlist');
    } finally {
      setIsCreating(false);
    }
  }

  const handleCopyPlaylistUrl = async () => {
    if (!playlistMeta?.url) {
      toast.error('Publica la playlist antes de copiar el enlace');
      return;
    }
    try {
      await navigator.clipboard.writeText(playlistMeta.url);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus(null), 2000);
      toast.success('Enlace copiado. Recuerda que la playlist está en la cuenta PLEIAHub.');
    } catch (error) {
      console.error('[CLIENT] Error copying playlist URL:', error);
      setCopyStatus('error');
      toast.error('No se pudo copiar el enlace.');
    }
  };

  const handleCopySpotifyUrl = async () => {
    if (!spotifyUrl) {
      toast.error('Crea primero la playlist en tu cuenta.');
      return;
    }
    try {
      await navigator.clipboard.writeText(spotifyUrl);
      setCopySpotifyStatus('copied');
      setTimeout(() => setCopySpotifyStatus(null), 2000);
      toast.success('Enlace copiado al portapapeles');
    } catch (error) {
      console.error('[CLIENT] Error copying Spotify URL:', error);
      setCopySpotifyStatus('error');
      toast.error('No se pudo copiar el enlace.');
    }
  };

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

  // Fetch user playlists
  const fetchUserPlaylists = useCallback(async () => {
    if (!sessionUser?.email) {
      setUserPlaylists([]);
      return;
    }
    
    try {
      setPlaylistsLoading(true);
      const response = await fetch('/api/userplaylists', { credentials: 'include' });
      const data = await response.json();
      
      if (response.status === 401) {
        setUserPlaylists([]);
        return;
      }
      
      if (data.success) {
        if (data.fallback) {
          const localKey = `jey_user_playlists:${sessionUser.email}`;
          const localPlaylists = JSON.parse(localStorage.getItem(localKey) || '[]');
          setUserPlaylists(Array.isArray(localPlaylists) ? localPlaylists : []);
        } else {
          setUserPlaylists(Array.isArray(data.playlists) ? data.playlists : []);
        }
      } else {
        setUserPlaylists([]);
      }
    } catch (error) {
      console.error('Error fetching playlists:', error);
      setUserPlaylists([]);
    } finally {
      setPlaylistsLoading(false);
    }
  }, [sessionUser?.email]);

  // Load playlists when user is authenticated
  useEffect(() => {
    if (sessionUser?.email) {
      fetchUserPlaylists();
    }
  }, [sessionUser?.email, fetchUserPlaylists]);

  // Refresh playlists after creating a new one
  useEffect(() => {
    if (isCreated && sessionUser?.email) {
      fetchUserPlaylists();
    }
  }, [isCreated, sessionUser?.email, fetchUserPlaylists]);

  // Handle edit playlist name
  const handleEditPlaylistName = async (playlistId, newName) => {
    if (!newName.trim()) {
      setEditingPlaylistName(null);
      setEditingNameValue('');
      return;
    }
    
    try {
      const response = await fetch('/api/userplaylists', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistId, name: newName.trim() }),
        credentials: 'include',
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Update local state
        setUserPlaylists(prev => prev.map(p => 
          p.playlistId === playlistId ? { ...p, name: newName.trim() } : p
        ));
        
        // Also update localStorage as fallback
        if (sessionUser?.email) {
          try {
            const localKey = `jey_user_playlists:${sessionUser.email}`;
            const localPlaylists = JSON.parse(localStorage.getItem(localKey) || '[]');
            const updatedPlaylists = localPlaylists.map(playlist =>
              playlist.playlistId === playlistId 
                ? { ...playlist, name: newName.trim(), updatedAt: new Date().toISOString() }
                : playlist
            );
            localStorage.setItem(localKey, JSON.stringify(updatedPlaylists));
          } catch (localError) {
            console.warn('Error updating localStorage:', localError);
          }
        }
        
        setEditingPlaylistName(null);
        setEditingNameValue('');
        toast.success('Nombre actualizado');
      } else {
        console.error('Error response:', result);
        toast.error(result.error || 'Error al editar el nombre');
      }
    } catch (error) {
      console.error('Error editing playlist name:', error);
      toast.error('Error al editar el nombre. Inténtalo de nuevo.');
    }
  };

  // Handle delete playlist
  const handleDeletePlaylist = async (playlistId, playlistName) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${playlistName}"?`)) {
      return;
    }
    
    try {
      const response = await fetch('/api/userplaylists', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistId }),
        credentials: 'include',
      });
      
      const result = await response.json();
      if (result.success) {
        setUserPlaylists(prev => prev.filter(p => p.playlistId !== playlistId));
      } else {
        alert('Error al eliminar la playlist');
      }
    } catch (error) {
      console.error('Error deleting playlist:', error);
      alert('Error al eliminar la playlist');
    }
  };

  // Load playlist preview
  const loadPlaylistPreview = async (playlist) => {
    try {
      setLoadingPreview(true);
      setPreviewPlaylist(playlist);
      setPreviewTracks([]);
      
      // Extract playlist ID from URL
      const playlistIdMatch = playlist.url?.match(/playlist\/([a-zA-Z0-9]+)/);
      if (!playlistIdMatch) {
        console.error('Could not extract playlist ID from URL:', playlist.url);
        toast.error('No se pudo cargar la playlist');
        return;
      }
      
      const playlistId = playlistIdMatch[1];
      
      // Fetch playlist tracks
      const ownerEmail = sessionUser?.email || null;
      const tracksUrl = ownerEmail 
        ? `/api/spotify/playlist-tracks?id=${playlistId}&ownerEmail=${encodeURIComponent(ownerEmail)}`
        : `/api/spotify/playlist-tracks?id=${playlistId}`;
      
      const response = await fetch(tracksUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setPreviewTracks(data.tracks || []);
      } else {
        console.error('Failed to load playlist tracks:', response.status);
        toast.error('No se pudieron cargar las canciones');
        setPreviewTracks([]);
      }
    } catch (error) {
      console.error('Error loading playlist preview:', error);
      toast.error('Error al cargar la playlist');
      setPreviewTracks([]);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Copy playlist link
  const handleCopyPlaylistLink = async () => {
    if (!previewPlaylist?.url) {
      toast.error('No hay enlace para copiar');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(previewPlaylist.url);
      setCopyLinkStatus('copied');
      toast.success('Enlace copiado al portapapeles');
      setTimeout(() => setCopyLinkStatus(null), 2000);
    } catch (error) {
      console.error('Error copying link:', error);
      setCopyLinkStatus('error');
      toast.error('No se pudo copiar el enlace');
      setTimeout(() => setCopyLinkStatus(null), 2000);
    }
  };

  // Temporarily disable loading state to debug the issue
  // if (translationsLoading) {
  //   return (
  //     <div className="min-h-screen" style={{ background: 'var(--color-night)' }}>
  //       <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
  //         <div className="space-y-4 sm:space-y-8">
  //           <div className="card" style={{ background: 'var(--color-slate)', padding: '2rem', textAlign: 'center' }}>
  //             <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center animate-pulse" style={{ background: 'linear-gradient(135deg, var(--color-aurora), var(--color-electric))', borderRadius: 'var(--radius-lg)' }}>
  //               <div className="w-8 h-8 bg-white rounded-lg"></div>
  //             </div>
  //             <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--color-cloud)', fontFamily: 'var(--font-family-primary)' }}>PLEIA</h2>
  //             <p style={{ color: 'var(--color-mist)' }}>Cargando traducciones...</p>
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  if (status === 'authenticated' && !profileReady) {
    return (
      <div className="min-h-screen bg-[#070A10] text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 mx-auto border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
          <p className="text-sm text-white/60">Preparando tu plan Founder…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-night)' }}>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: '{"@context":"https://schema.org","@type":"SoftwareApplication","name":"PLEIA","description":"IA musical que crea playlists personalizadas a partir de prompts en lenguaje natural.","applicationCategory":"MultimediaApplication","operatingSystem":"Web","url":"https://pleia.app","offers":{"@type":"Offer","price":"0","priceCurrency":"EUR"}}'
        }}
      />
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="space-y-4 sm:space-y-8">
          
          {/* Prompt Card */}
          <div className="p-6 rounded-2xl shadow-lg" style={{ background: 'var(--color-slate)' }}>
            <h2 className="text-xl md:text-3xl font-bold mb-4 md:mb-6" style={{ 
              color: 'var(--color-cloud)', 
              fontFamily: 'var(--font-primary)',
              letterSpacing: '-0.02em',
              lineHeight: '1.2'
            }}>
              {t('prompt.title') || '¿Qué tipo de playlist quieres?'}
            </h2>
            
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => {
                const value = e.target.value;
                // Basic validation to prevent issues
                if (value.length <= 1000) { // Reasonable limit
                  setPrompt(value);
                }
              }}
              placeholder={isMobile ? 'Describe tu playlist perfecta...' : t('prompt.placeholder')}
              className="w-full p-3 md:p-4 mb-4 md:mb-6 rounded-xl border-2 resize-none transition-all duration-200 text-sm md:text-base"
              style={{
                background: 'var(--color-slate)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--color-cloud)',
                borderRadius: '12px',
                fontFamily: 'var(--font-body)',
                lineHeight: '1.5'
              }}
            />
            
            {/* Example prompts (hidden on mobile) */}
            <div className="mb-6 hidden md:block">
              <p className="text-sm mb-3 font-medium" style={{ 
                color: 'var(--color-mist)', 
                fontFamily: 'var(--font-primary)',
                letterSpacing: '0.01em'
              }}>
                {t('prompt.examples')}
              </p>
              <div className="flex gap-2 flex-wrap md:flex-nowrap">
                {limitedExamples.map((example, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-full text-sm border cursor-pointer transition-all duration-200 hover-accent"
                    style={{ 
                      background: 'var(--color-slate)', 
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'var(--color-mist)',
                      fontFamily: 'var(--font-body)',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}
                    onClick={() => setPrompt(example)}
                    onMouseEnter={(e) => {
                      e.target.style.color = 'var(--color-accent-mixed)';
                      e.target.style.borderColor = 'var(--color-accent-mixed)';
                      e.target.style.transform = 'translateY(-1px)';
                      e.target.style.boxShadow = '0 4px 12px rgba(71, 200, 209, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = 'var(--color-mist)';
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'none';
                    }}
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
                  onChange={(e) => {
                    const value = e.target.value;
                    // Validate input to prevent "pattern mismatch" errors
                    if (value === '' || (Number(value) >= 1 && Number(value) <= 200)) {
                      setCount(Number(value) || 50);
                    }
                  }}
                  className="spotify-input w-20 md:w-20"
                />
              </div>
              
              <PromptTips />
              
              <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                className="primary w-full md:min-w-[160px] px-6 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                          style={{
                            background: 'var(--gradient-primary)',
                            color: 'var(--color-night)',
                            fontFamily: 'var(--font-primary)',
                            fontSize: '16px',
                            letterSpacing: '0.01em',
                            fontWeight: '600',
                            borderRadius: '16px'
                          }}
              >
                {/* Spotify Logo */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                {loading ? t('prompt.generating') : t('prompt.generateButton')}
              </button>
            </div>
          </div>

          {/* Spotify Branding - Before generation */}
          {!loading && !tracks?.length && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-green-500">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              <span 
                className="text-sm opacity-60"
                style={{ 
                  color: 'var(--color-mist)',
                  fontFamily: 'var(--font-family-body)',
                  fontSize: '13px',
                  fontWeight: '400'
                }}
              >
                Funciona con Spotify
              </span>
            </div>
          )}

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
                  
                  {/* Pensamientos del Agente PLEIA - se van acumulando sutilmente */}
                  {isAgentMode && agentThoughts.length > 0 && (
                    <div 
                      ref={agentThoughtsScrollRef}
                      className="mt-4 space-y-1 text-center max-h-32 overflow-y-auto agent-thoughts-scroll px-2"
                      style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent'
                      }}
                      onScroll={(e) => {
                        // Detectar si el usuario hace scroll manual
                        const element = e.target;
                        const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 10;
                        setShouldAutoScroll(isAtBottom);
                      }}
                    >
                      {agentThoughts.map((thought, idx) => {
                        const isLast = idx === agentThoughts.length - 1;
                        // Limpiar el texto de cualquier emoji (más agresivo)
                        const cleanThought = thought
                          .replace(/💭\s*/g, '')
                          .replace(/🤔\s*/g, '')
                          .replace(/💬\s*/g, '')
                          .replace(/[\u{1F4AD}\u{1F914}\u{1F4AC}\u{1F4A4}]/gu, '') // Unicode ranges para emojis de pensamiento
                          .replace(/[\u2600-\u27BF]/g, '') // Rango general de emojis
                          .replace(/\s+/g, ' ') // Normalizar espacios
                          .trim();
                        return (
                          <div 
                            key={`${idx}-${cleanThought.slice(0, 20)}`}
                            className={`text-sm text-white/40 italic ${isLast ? 'thinking-wave' : ''}`}
                            style={isLast ? {
                              opacity: 0.3 + (idx / agentThoughts.length) * 0.5
                            } : {
                              animation: 'fade-in 0.5s ease-out',
                              opacity: 0.3 + (idx / agentThoughts.length) * 0.5
                            }}
                            data-is-last={isLast}
                          >
                            {isLast ? '' : '· '}{cleanThought}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Playlist Creation Card */}
          {tracks.length > 0 && isGenerationComplete && (
            <div className="spotify-card">
              <h3 className="text-xl font-semibold text-white mb-6">
                Tu playlist está lista • {tracks.length} pistas
              </h3>

              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-4">
                    <p className="text-sm font-medium text-white mb-2">
                      ✏️ 1. Ponle nombre a tu playlist
                  </p>
                  <input
                    type="text"
                    value={customPlaylistName}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= 100) {
                        setCustomPlaylistName(value);
                      }
                    }}
                    placeholder="Ej. Playlist PLEIA de estudio"
                    className="w-full p-4 rounded-xl border-2 transition-all duration-200"
                    style={{
                      background: 'var(--color-slate)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: 'var(--color-cloud)',
                      borderRadius: '12px',
                      fontFamily: 'var(--font-body)',
                      fontSize: '16px',
                      lineHeight: '1.5',
                      '--placeholder-color': 'rgba(199, 208, 218, 0.6)'
                    }}
                  />
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-4 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🎧</span>
                      <p className="text-sm font-semibold text-white">2. Guardar en PLEIA HUB</p>
                    </div>
                    <div className="pl-8 text-xs text-gray-text-secondary space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wide">Paso 1</span>
                        <span>Se crea en la cuenta oficial de PLEIA HUB.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-sky-300 uppercase tracking-wide">Paso 2</span>
                        <span>En <strong className="text-white">“Copia enlace”</strong> lo duplicas; en <strong className="text-white">“TuneMyMusic”</strong> lo pegas y lo llevas a tu Spotify.</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={isCreated && spotifyUrl ? () => window.open(spotifyUrl, '_blank') : handleCreate}
                    disabled={isCreating}
                    className="primary w-full md:w-auto px-6 py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{
                      background: isCreated ? 'var(--color-accent-mixed)' : 'var(--color-accent-mixed)',
                      color: isCreated ? 'var(--color-night)' : 'var(--color-night)',
                      fontFamily: 'var(--font-family-body)'
                    }}
                  >
                    {isCreated ? (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                        </svg>
                        Abrir en Spotify
                      </>
                    ) : (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                        </svg>
                        {isCreating ? t('playlist.creating') : t('playlist.createButton')}
                      </>
                    )}
                  </button>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">🔗 3. Copia el enlace</p>
                    <p className="text-xs text-gray-text-secondary mt-1">
                      Pégalo en el paso 4 y ya tienes la playlist en tu Spotify (o compártelo con quien quieras).
                    </p>
                  </div>
                  <div className="flex flex-col items-start md:items-end gap-2 w-full md:w-auto">
                    <button
                      onClick={handleCopySpotifyUrl}
                      className="secondary w-full md:w-auto px-6 py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!spotifyUrl}
                      style={{
                        background: 'transparent',
                        color: 'rgba(199, 208, 218, 0.85)',
                        border: '1px solid rgba(199, 208, 218, 0.3)',
                        fontFamily: 'var(--font-body)'
                      }}
                    >
                      📋 Copiar enlace
                    </button>
                    {copySpotifyStatus === 'copied' && (
                      <span className="text-xs text-emerald-300">Enlace copiado al portapapeles</span>
                    )}
                    {copySpotifyStatus === 'error' && (
                      <span className="text-xs text-red-300">No se pudo copiar. Inténtalo de nuevo.</span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">🚀 4. TuneMyMusic</p>
                    <p className="text-xs text-gray-text-secondary mt-1">
                      Abre TuneMyMusic, pega el enlace y transfórmala en tu playlist personal en menos de 30 segundos.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (!spotifyUrl) return;
                      const tuneUrl = `https://www.tunemymusic.com/transfer?source=spotify&target=spotify&url=${encodeURIComponent(spotifyUrl)}`;
                      window.open(tuneUrl, '_blank');
                    }}
                    className="secondary w-full md:w-auto px-6 py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!spotifyUrl}
                    style={{
                      background: 'linear-gradient(135deg, #47C8D1, #5B8CFF)',
                      color: '#0B0F12',
                      border: 'none',
                      fontFamily: 'var(--font-body)',
                      fontWeight: '600',
                      boxShadow: '0 4px 12px rgba(71, 200, 209, 0.3)'
                    }}
                  >
                    🚀 Abrir TuneMyMusic
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Hub mode removed - this section is no longer needed */}
          {false && (
            <div className="spotify-card">
              {playlistMeta?.error && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {playlistMeta.error}
                </div>
              )}

              <h3 className="text-xl font-semibold text-white mb-2">
                Ya tienes tu playlist ✨
              </h3>
              <p className="text-sm text-gray-text-secondary mb-4">
                Generada por PLEIA Hub. Sigue estos pasos para llevarla a tu Spotify en segundos.
              </p>
              <div className="space-y-3 md:space-y-4">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">✏️ 1. Ponle nombre a tu playlist</p>
                    <p className="text-xs text-gray-text-secondary mt-1">
                      Déjalo vacío para usar tu prompt como nombre.
                    </p>
                  </div>
                  <input
                    type="text"
                    value={customPlaylistName}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= 100) {
                        setCustomPlaylistName(value);
                      }
                    }}
                    placeholder="Usaremos tu prompt si lo dejas en blanco"
                    className="w-full md:max-w-xs p-3 rounded-xl border border-white/10 bg-white/[0.04] text-sm"
                    style={{
                      color: 'var(--color-cloud)',
                      fontFamily: 'var(--font-body)',
                      lineHeight: '1.4'
                    }}
                  />
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">🎧 2. Pulsa &quot;Publicar y abrir en Spotify&quot;</p>
                    <p className="text-xs text-gray-text-secondary mt-1">
                      Se abrirá en la cuenta PLEIAHub con tu título + &quot;by PLEIA&quot;. Revisa que todo esté ok.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      if (pageLoading) return;
                      try {
                        setPageLoading(true);
                        const baseName = (customPlaylistName && customPlaylistName.trim().length > 0)
                          ? customPlaylistName.trim()
                          : (playlistMeta?.name || prompt || 'Playlist PLEIA').trim();
                        const formattedName = baseName.toLowerCase().endsWith(' by pleia')
                          ? baseName
                          : `${baseName} by PLEIA`;
                        const publishResponse = await fetch('/api/hub/publish', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            name: formattedName,
                            description: prompt || '',
                            tracks: tracks,
                          }),
                        });

                        if (!publishResponse.ok) {
                          const data = await publishResponse.json();
                          toast.error(data.error || 'No se pudo publicar la playlist');
                          return;
                        }

                        const data = await publishResponse.json();
                        setPlaylistMeta(data.playlist);
                        toast.success('Playlist publicada en la cuenta PLEIAHub.');
                        window.open(data.playlist.url, '_blank');
                      } catch (error) {
                        console.error('[HUB] Publish error:', error);
                        toast.error('No se pudo publicar la playlist');
                      } finally {
                        setPageLoading(false);
                      }
                    }}
                    className="primary w-full md:w-auto px-6 py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={pageLoading}
                    style={{
                      background: 'var(--color-accent-mixed)',
                      color: 'var(--color-night)',
                      fontFamily: 'var(--font-family-body)'
                    }}
                  >
                    {pageLoading ? 'Publicando...' : '🎧 Publicar y abrir en Spotify'}
                  </button>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">🔗 3. Copia el enlace desde aquí</p>
                    <p className="text-xs text-gray-text-secondary mt-1">
                      Vuelve a esta ventana y copia la playlist publicada para usarla en TuneMyMusic.
                    </p>
                  </div>
                  <div className="flex flex-col items-start md:items-end gap-2 w-full md:w-auto">
                    <button
                      onClick={handleCopyPlaylistUrl}
                      className="secondary w-full md:w-auto px-6 py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!playlistMeta?.url}
                      style={{
                        background: 'transparent',
                        color: 'rgba(199, 208, 218, 0.85)',
                        border: '1px solid rgba(199, 208, 218, 0.3)',
                        fontFamily: 'var(--font-body)'
                      }}
                    >
                      📋 Copiar enlace
                    </button>
                    {copyStatus === 'copied' && (
                      <span className="text-xs text-emerald-300">Enlace copiado al portapapeles</span>
                    )}
                    {copyStatus === 'error' && (
                      <span className="text-xs text-red-300">No se pudo copiar. Inténtalo de nuevo.</span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">🚀 4. Llévala a tu Spotify con TuneMyMusic</p>
                    <p className="text-xs text-gray-text-secondary mt-1">
                      Inicia sesión con tu cuenta de Spotify y confirma la transferencia para editarla desde tu perfil.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (!playlistMeta?.url) return;
                      const tuneUrl = `https://www.tunemymusic.com/transfer?source=spotify&target=spotify&url=${encodeURIComponent(playlistMeta.url)}`;
                      window.open(tuneUrl, '_blank');
                    }}
                    className="secondary w-full md:w-auto px-6 py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!playlistMeta?.url}
                    style={{
                      background: 'linear-gradient(135deg, #47C8D1, #5B8CFF)',
                      color: '#0B0F12',
                      border: 'none',
                      fontFamily: 'var(--font-body)',
                      fontWeight: '600',
                      boxShadow: '0 4px 12px rgba(71, 200, 209, 0.3)'
                    }}
                  >
                    🚀 Llevar a mi Spotify (TuneMyMusic)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Results Card */}
          {showUsageLimit ? (
            <UsageLimitReached onViewPlans={handleViewPlans} />
          ) : tracks.length > 0 && (
            <div className="spotify-card">
              <h3 className="text-xl font-semibold text-white mb-6">
                {t('playlist.tracksTitle')} ({tracks.length} tracks)
              </h3>
              
              
              <AnimatedList
                items={tracks.map((track) => {
                  // Extract artist names
                  let artists = [];
                  if (typeof track.artistNames === 'string') {
                    artists = track.artistNames.split(',').map(a => a.trim()).filter(Boolean);
                  } else if (Array.isArray(track.artistNames)) {
                    artists = track.artistNames.map(a => typeof a === 'string' ? a : a?.name).filter(Boolean);
                  } else if (Array.isArray(track.artists)) {
                    artists = track.artists.map(a => typeof a === 'string' ? a : a?.name).filter(Boolean);
                  }
                  
                  const artistStr = artists.length > 0 ? artists.join(', ') : 'Artista desconocido';
                  const title = track.title || track.name || 'Título desconocido';
                  
                  return {
                    title: title,
                    artist: artistStr,
                    trackId: track.id,
                    openUrl: track.open_url || (track.id ? `https://open.spotify.com/track/${track.id}` : undefined)
                  };
                })}
                onItemSelect={(item, idx) => {
                  // Open track in Spotify
                  if (item.openUrl) {
                    window.open(item.openUrl, '_blank');
                  }
                }}
                onItemRemove={(item, idx) => {
                  // Remove track from list
                  handleRemoveTrack(item.trackId);
                }}
                displayScrollbar={true}
                className=""
                itemClassName=""
              />
            </div>
          )}

          {/* Spotify Branding - After tracks generation */}
          {tracks?.length > 0 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-green-500">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              <span 
                className="text-sm opacity-60"
                style={{ 
                  color: 'var(--color-mist)',
                  fontFamily: 'var(--font-family-body)',
                  fontSize: '13px',
                  fontWeight: '400'
                }}
              >
                Funciona con Spotify
              </span>
            </div>
          )}

          {/* User Playlists Section - Always show below generation process and tracks */}
          {sessionUser && (
            <div className="spotify-card mt-6">
              <h3 className="text-xl font-semibold text-white mb-4">
                Mis Playlists {userPlaylists.length > 0 && `(${userPlaylists.length})`}
              </h3>
              
              {playlistsLoading ? (
                <div className="text-center py-8 text-gray-400">Cargando playlists...</div>
              ) : userPlaylists.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">Aún no has creado ninguna playlist.</p>
                  <p className="text-xs mt-2 opacity-70">Genera una playlist arriba para comenzar.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {userPlaylists.map((playlist, index) => {
                    // Colores PLEIA con variaciones metálicas
                    const pleiaGradients = [
                      { 
                        from: 'rgba(54, 226, 180, 0.2)', 
                        to: 'rgba(71, 200, 209, 0.15)',
                        border: 'rgba(54, 226, 180, 0.4)',
                        glow: 'rgba(54, 226, 180, 0.3)',
                        text: '#36E2B4'
                      },
                      { 
                        from: 'rgba(71, 200, 209, 0.2)', 
                        to: 'rgba(91, 140, 255, 0.15)',
                        border: 'rgba(71, 200, 209, 0.4)',
                        glow: 'rgba(71, 200, 209, 0.3)',
                        text: '#47C8D1'
                      },
                      { 
                        from: 'rgba(91, 140, 255, 0.2)', 
                        to: 'rgba(54, 226, 180, 0.15)',
                        border: 'rgba(91, 140, 255, 0.4)',
                        glow: 'rgba(91, 140, 255, 0.3)',
                        text: '#5B8CFF'
                      },
                    ];
                    const colors = pleiaGradients[index % pleiaGradients.length];
                    
                    return (
                      <div
                        key={playlist.playlistId}
                        className="group relative rounded-2xl border p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                        style={{
                          background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 50%, rgba(255,255,255,0.02) 100%)`,
                          borderColor: 'rgba(255,255,255,0.1)',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.2)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = colors.border;
                          e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.5), 0 0 40px ${colors.glow}, inset 0 1px 0 rgba(255,255,255,0.12)`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.2)';
                        }}
                      >
                        {/* Metallic top shine */}
                        <div 
                          className="absolute top-0 left-0 right-0 h-px opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                          style={{
                            background: `linear-gradient(90deg, transparent 0%, ${colors.text} 50%, transparent 100%)`,
                            boxShadow: `0 0 8px ${colors.glow}`,
                          }}
                        />
                        
                        {/* Metallic reflection effect */}
                        <div 
                          className="absolute top-0 left-0 right-0 h-20 opacity-0 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none"
                          style={{
                            background: `linear-gradient(180deg, ${colors.text} 0%, transparent 100%)`,
                            filter: 'blur(20px)',
                          }}
                        />
                        
                        {/* Bottom metallic accent */}
                        <div 
                          className="absolute bottom-0 left-0 right-0 h-px opacity-40 group-hover:opacity-80 transition-opacity duration-300"
                          style={{
                            background: `linear-gradient(90deg, transparent 0%, ${colors.text} 30%, ${colors.text} 70%, transparent 100%)`,
                          }}
                        />

                        <div className="relative">
                          <div className="flex items-start justify-between mb-5">
                            <div className="flex-1 min-w-0 pr-3">
                              {editingPlaylistName === playlist.playlistId ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={editingNameValue}
                                    onChange={(e) => setEditingNameValue(e.target.value)}
                                    onBlur={() => {
                                      if (editingNameValue.trim()) {
                                        handleEditPlaylistName(playlist.playlistId, editingNameValue);
                                      } else {
                                        setEditingPlaylistName(null);
                                        setEditingNameValue('');
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        if (editingNameValue.trim()) {
                                          handleEditPlaylistName(playlist.playlistId, editingNameValue);
                                        }
                                      } else if (e.key === 'Escape') {
                                        setEditingPlaylistName(null);
                                        setEditingNameValue('');
                                      }
                                    }}
                                    autoFocus
                                    className="flex-1 px-3 py-2 rounded-xl border border-white/20 bg-white/[0.08] text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all"
                                    style={{ fontFamily: 'var(--font-body)' }}
                                  />
                                </div>
                              ) : (
                                <>
                                  <h4 
                                    className="text-white font-bold text-lg mb-2 truncate leading-tight"
                                    style={{ 
                                      fontFamily: 'var(--font-body)',
                                      textShadow: '0 2px 8px rgba(0,0,0,0.3)'
                                    }}
                                    title={playlist.name}
                                  >
                                    {playlist.name}
                                  </h4>
                                  <div className="flex items-center gap-2">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                                      <path d="M9 18V5l12-2v13"></path>
                                      <circle cx="6" cy="18" r="3"></circle>
                                      <circle cx="18" cy="16" r="3"></circle>
                                    </svg>
                                    <p className="text-xs text-gray-400 font-medium">
                                      {playlist.tracks || 0} {playlist.tracks === 1 ? 'canción' : 'canciones'}
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingPlaylistName(playlist.playlistId);
                                  setEditingNameValue(playlist.name);
                                }}
                                className="p-2 hover:bg-white/10 rounded-xl transition-all duration-200 hover:scale-110"
                                title="Editar nombre"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeletePlaylist(playlist.playlistId, playlist.name)}
                                className="p-2 hover:bg-red-500/20 rounded-xl transition-all duration-200 hover:scale-110"
                                title="Eliminar"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
                                  <path d="M3 6h18"></path>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2.5 mt-5">
                            <button
                              onClick={() => playlist.url && window.open(playlist.url, '_blank')}
                              disabled={!playlist.url}
                              className="w-full px-4 py-3 rounded-xl border text-sm font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 hover:scale-[1.02] relative overflow-hidden group/btn"
                              style={{
                                background: 'linear-gradient(135deg, rgba(29, 185, 84, 0.15) 0%, rgba(30, 215, 96, 0.12) 100%)',
                                borderColor: 'rgba(29, 185, 84, 0.3)',
                                color: '#1DB954',
                                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 8px rgba(0,0,0,0.2)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(29, 185, 84, 0.5)';
                                e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 16px rgba(29, 185, 84, 0.3), 0 0 20px rgba(29, 185, 84, 0.2)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(29, 185, 84, 0.3)';
                                e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 8px rgba(0,0,0,0.2)';
                              }}
                            >
                              <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-20 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, rgba(29, 185, 84, 0.3) 0%, transparent 100%)' }} />
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="relative z-10">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                              </svg>
                              <span className="relative z-10">Abrir en Spotify</span>
                            </button>
                            <button
                              onClick={() => loadPlaylistPreview(playlist)}
                              disabled={!playlist.url}
                              className="w-full px-4 py-3 rounded-xl border text-sm font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 hover:scale-[1.02] relative overflow-hidden group/btn"
                              style={{
                                background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`,
                                borderColor: colors.border,
                                color: colors.text,
                                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 8px rgba(0,0,0,0.2), 0 0 12px ${colors.glow}`,
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = colors.text;
                                e.currentTarget.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 16px ${colors.glow}, 0 0 24px ${colors.glow}`;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = colors.border;
                                e.currentTarget.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 8px rgba(0,0,0,0.2), 0 0 12px ${colors.glow}`;
                              }}
                            >
                              <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-30 transition-opacity duration-300" style={{ background: `linear-gradient(135deg, ${colors.text} 0%, transparent 100%)` }} />
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="relative z-10">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                              <span className="relative z-10">Ver canciones</span>
                            </button>
                          </div>
                          
                          <button
                            onClick={() => {
                              toast.info('Función "Rehacer con IA" próximamente');
                            }}
                            className="w-full mt-3 px-4 py-2.5 rounded-xl border text-xs font-medium transition-all duration-200 flex items-center justify-center gap-2 relative overflow-hidden group/btn"
                            style={{
                              background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                              borderColor: 'rgba(255,255,255,0.1)',
                              color: 'rgba(255,255,255,0.6)',
                              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)';
                              e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)';
                              e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                            }}
                          >
                            <span className="text-[10px] px-2.5 py-1 rounded-full border font-semibold relative z-10" style={{ 
                              background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.2) 0%, rgba(219, 39, 119, 0.15) 100%)',
                              borderColor: 'rgba(147, 51, 234, 0.3)',
                              color: 'rgba(196, 181, 253, 0.9)',
                              boxShadow: '0 0 8px rgba(147, 51, 234, 0.2)',
                            }}>Próximamente</span>
                            <span className="relative z-10">Rehacer con IA</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!loading && tracks.length === 0 && !error && (
            <div className="spotify-card text-center py-16">
              <div className="w-16 h-16 bg-gradient-to-br from-spotify-green to-accent-cyan rounded-2xl mx-auto mb-6 flex items-center justify-center">
                <div className="w-8 h-8 bg-white rounded-lg"></div>
              </div>
              <h3 className="text-2xl font-bold mb-3" style={{ 
                color: 'var(--color-cloud)', 
                fontFamily: 'var(--font-primary)',
                letterSpacing: '-0.01em'
              }}>
                {t('empty.title')}
              </h3>
              <p className="max-w-md mx-auto" style={{ 
                color: 'var(--color-mist)', 
                fontFamily: 'var(--font-body)',
                lineHeight: '1.6'
              }}>
                {t('empty.description')}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Epic Section */}
      <EpicSection />

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 mobile-footer" style={{ background: 'var(--color-night)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-mist">
              © PLEIA by MTRYX {new Date().getFullYear()}
              <br />
              <span className="text-xs opacity-70">From prompt to playlist.</span>
            </div>
            <div className="flex items-center gap-6 mobile-flex-wrap">
              {/* Legal Links */}
              <a 
                href="/privacy" 
                className="text-sm text-mist hover:text-aurora transition-colors duration-200"
                style={{ color: 'var(--color-mist)' }}
              >
                Privacidad
              </a>
              <a 
                href="/terms" 
                className="text-sm text-mist hover:text-aurora transition-colors duration-200"
                style={{ color: 'var(--color-mist)' }}
              >
                Términos
              </a>
              <a 
                href="/support" 
                className="text-sm text-mist hover:text-aurora transition-colors duration-200"
                style={{ color: 'var(--color-mist)' }}
              >
                Soporte
              </a>
              <a 
                href="/delete-data" 
                className="text-sm text-mist hover:text-aurora transition-colors duration-200"
                style={{ color: 'var(--color-mist)' }}
              >
                Eliminar datos
              </a>
              
              {/* Social Links */}
              <a 
                href="https://www.instagram.com/pleiamusic/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-mist hover:text-aurora transition-colors duration-200"
                style={{ color: 'var(--color-mist)' }}
              >
                Instagram
              </a>
              <a 
                href="https://www.tiktok.com/@pleiamusic_" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-mist hover:text-aurora transition-colors duration-200"
                style={{ color: 'var(--color-mist)' }}
              >
                TikTok
              </a>
              <a 
                href="https://mtryx.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-mist hover:text-aurora transition-colors duration-200"
                style={{ color: 'var(--color-mist)' }}
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
      
      {/* Special Offer Popup */}
      <SpecialOfferPopup />

      {/* Playlist Preview Modal */}
      {previewPlaylist && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewPlaylist(null)}
        >
          <div 
            className="spotify-card max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <div className="flex-1 min-w-0">
                <h3 className="text-2xl font-bold text-white mb-1 truncate" style={{ fontFamily: 'var(--font-body)' }}>
                  {previewPlaylist.name}
                </h3>
                <p className="text-sm text-gray-400">
                  {previewTracks.length > 0 ? `${previewTracks.length} canciones` : `${previewPlaylist.tracks || 0} canciones`}
                </p>
              </div>
              <button
                onClick={() => setPreviewPlaylist(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors ml-4"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                  <path d="M18 6L6 18M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={handleCopyPlaylistLink}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30 text-purple-300 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1M8 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M8 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m0 0h2a2 2 0 0 1 2 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
                </svg>
                {copyLinkStatus === 'copied' ? 'Copiado' : 'Copiar enlace'}
              </button>
              <button
                onClick={() => {
                  if (previewPlaylist.url) {
                    const tuneUrl = `https://www.tunemymusic.com/transfer?source=spotify&target=spotify&url=${encodeURIComponent(previewPlaylist.url)}`;
                    window.open(tuneUrl, '_blank');
                  }
                }}
                disabled={!previewPlaylist.url}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/30 text-cyan-300 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 13l3 3 7-7M8 13l-3-3"></path>
                  <path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z"></path>
                </svg>
                Llevar a mi Spotify
              </button>
              <button
                onClick={() => previewPlaylist.url && window.open(previewPlaylist.url, '_blank')}
                disabled={!previewPlaylist.url}
                className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-green-500/20 to-green-600/20 hover:from-green-500/30 hover:to-green-600/30 border border-green-500/30 text-green-400 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                Abrir en Spotify
              </button>
            </div>

            {/* Tracks List */}
            <div className="flex-1 overflow-y-auto">
              {loadingPreview ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 mx-auto border-2 border-white/20 border-t-white/70 rounded-full animate-spin mb-4"></div>
                  <p className="text-sm text-gray-400">Cargando canciones...</p>
                </div>
              ) : previewTracks.length > 0 ? (
                <AnimatedList
                  items={previewTracks.map((track) => ({
                    title: track.name || track.title || 'Título desconocido',
                    artist: track.artistNames || track.artists?.join(', ') || 'Artista desconocido',
                    trackId: track.id,
                    openUrl: track.open_url || (track.id ? `https://open.spotify.com/track/${track.id}` : undefined)
                  }))}
                  onItemSelect={(item) => {
                    if (item.openUrl) {
                      window.open(item.openUrl, '_blank');
                    }
                  }}
                  displayScrollbar={true}
                  className=""
                  itemClassName=""
                />
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-400">No se pudieron cargar las canciones</p>
                  <button
                    onClick={() => loadPlaylistPreview(previewPlaylist)}
                    className="mt-4 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
                  >
                    Reintentar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}