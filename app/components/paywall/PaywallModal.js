'use client';

import { useMemo } from 'react';

const DEFAULT_LIMIT = 5;

export default function PaywallModal({ isOpen, onClose, usage, onBuyFounder }) {
  if (!isOpen) return null;

  const summary = useMemo(() => {
    // 🚨 CRITICAL: Usar EXACTAMENTE la misma estructura que devuelve /api/usage/status y useUsageStatus
    // Esto asegura que los datos coincidan con lo que se muestra en el perfil
    
    // Debug: Log completo del objeto usage recibido
    if (typeof window !== 'undefined') {
      console.log('[PAYWALL-MODAL] ===== RAW USAGE RECEIVED =====');
      console.log('[PAYWALL-MODAL] usage:', usage);
      console.log('[PAYWALL-MODAL] usage?.usage:', usage?.usage);
      console.log('[PAYWALL-MODAL] usage?.used:', usage?.used);
      console.log('[PAYWALL-MODAL] usage?.remaining:', usage?.remaining);
      console.log('[PAYWALL-MODAL] usage?.plan:', usage?.plan);
    }
    
    // Estructura esperada (igual que useUsageStatus):
    // usage.usage.current - usos consumidos
    // usage.usage.limit - límite máximo
    // usage.usage.remaining - usos restantes
    // usage.used - también disponible en nivel superior
    // usage.remaining - también disponible en nivel superior
    // usage.unlimited - si es ilimitado
    // usage.plan - plan del usuario
    
    // 🚨 CRITICAL: Priorizar usage.usage (estructura interna) sobre propiedades de nivel superior
    const usageData = usage?.usage || {};
    const planValue = usage?.plan || usageData.plan || 'free';
    const planLabel = String(planValue).toUpperCase();

    // Leer unlimited (igual que useUsageStatus)
    const unlimited = 
      usage?.unlimited === true ||
      usageData.hasUnlimitedUses === true ||
      usageData.remaining === 'unlimited' ||
      planValue === 'founder' ||
      planValue === 'premium' ||
      planValue === 'monthly';

    // Leer limit (igual que useUsageStatus) - PRIORIZAR usageData.limit
    let limit = usageData.limit ?? usage?.limitPerWindow ?? usage?.limit ?? null;
    if (limit === null || !Number.isFinite(limit)) {
      limit = unlimited ? null : DEFAULT_LIMIT;
    }

    // 🚨 CRITICAL: Leer used PRIMERO, antes de calcular remaining
    // PRIORIDAD: usageData.current > usage.used > calcular desde limit - remaining
    let used = usageData.current ?? usage?.used ?? null;
    if (used === null || typeof used !== 'number' || !Number.isFinite(used)) {
      // Intentar calcular desde remaining si tenemos limit
      const remainingFromData = usageData.remaining ?? usage?.remaining ?? null;
      if (typeof limit === 'number' && typeof remainingFromData === 'number') {
        used = Math.max(0, limit - remainingFromData);
      } else {
        used = 0;
      }
    }

    // Leer remaining (igual que useUsageStatus) - PRIORIZAR usageData.remaining
    let remaining = usageData.remaining ?? usage?.remaining ?? null;
    if (remaining === 'unlimited') {
      remaining = Infinity;
    } else if (typeof remaining === 'number') {
      remaining = Math.max(0, remaining);
    } else if (unlimited) {
      remaining = Infinity;
    } else if (typeof limit === 'number' && typeof used === 'number') {
      // Calcular desde limit - used si no está disponible
      remaining = Math.max(0, limit - used);
    } else {
      remaining = limit ?? DEFAULT_LIMIT;
    }

    // 🚨 CRITICAL: Validar coherencia: used + remaining debe ser aproximadamente igual a limit
    // Si hay discrepancia, priorizar used y recalcular remaining
    if (typeof limit === 'number' && typeof used === 'number' && typeof remaining === 'number') {
      const expectedRemaining = limit - used;
      if (Math.abs(remaining - expectedRemaining) > 1) {
        console.warn(`[PAYWALL-MODAL] Inconsistency detected: used=${used}, remaining=${remaining}, limit=${limit}. Recalculating remaining from limit - used.`);
        remaining = Math.max(0, limit - used);
      }
    }

    const clampedUsed = typeof limit === 'number' ? Math.min(used, limit) : used;
    const progress =
      unlimited || !Number.isFinite(limit) || limit <= 0
        ? 0
        : Math.min(100, Math.max(0, (clampedUsed / limit) * 100));

    const remainingLabel =
      remaining === Infinity ? '∞' : Math.max(0, Math.round(remaining));

    // Leer hasAdvantage (debe venir de PaywallHost que ya lo calcula)
    const hasAdvantage =
      usage?.canAccessAdvantage === true ||
      usage?.advantage === true ||
      false;

    const result = {
      planLabel,
      unlimited,
      limit,
      remaining,
      remainingLabel,
      used: clampedUsed,
      progress,
      hasAdvantage,
    };

    // Debug: Log completo del resultado
    if (typeof window !== 'undefined') {
      console.log('[PAYWALL-MODAL] ===== CALCULATED SUMMARY =====');
      console.log('[PAYWALL-MODAL] Result:', result);
      console.log('[PAYWALL-MODAL] Used:', clampedUsed, 'Limit:', limit, 'Remaining:', remaining);
    }

    return result;
  }, [usage]);

  const {
    planLabel,
    unlimited,
    limit,
    remaining,
    remainingLabel,
    used,
    progress,
    hasAdvantage,
  } = summary;

  const headline =
    remaining <= 0 && !unlimited
      ? 'Has agotado tus playlists gratuitas'
      : 'Tu plan está a punto de agotarse';

  const handleFounderClick = () => {
    if (typeof onBuyFounder === 'function') {
      onBuyFounder();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/pricing?plan=founder';
    }
  };

  const handleAdvantageClick = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/pricing?tab=advantage';
    }
  };

  const handleClose = (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      handleClose(event);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 md:px-6">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        onClick={handleBackdropClick}
        style={{ backgroundColor: 'rgba(11, 15, 20, 0.6)' }}
      />

      <div
        className="relative w-full max-w-4xl mx-auto overflow-hidden rounded-3xl shadow-[0_40px_120px_rgba(15,20,27,0.65)]"
        onClick={(e) => e.stopPropagation()}
        style={{
          background:
            'radial-gradient(120% 140% at 0% 0%, rgba(91,140,255,0.25) 0%, rgba(15,20,27,0.92) 45%, rgba(12,17,24,0.98) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-5 right-5 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-white/20 cursor-pointer"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.14)',
            color: '#EAF2FF',
            backdropFilter: 'blur(20px)',
          }}
          aria-label="Cerrar paywall"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="relative w-full p-6 sm:p-8 md:p-10 lg:p-12 flex flex-col gap-9">
          <div className="space-y-6 text-left">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold tracking-[0.25em]"
                style={{
                  backgroundColor: 'rgba(91, 140, 255, 0.18)',
                  border: '1px solid rgba(91, 140, 255, 0.35)',
                  color: '#EAF2FF',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                PLAN {planLabel}
              </span>

              {!unlimited && Number.isFinite(limit) && (
                <span
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    backgroundColor: 'rgba(54, 226, 180, 0.16)',
                    color: '#36E2B4',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {Math.min(used, limit)} / {limit} usadas
                </span>
              )}
            </div>

            <div className="space-y-4">
              <h2
                className="text-3xl md:text-[2.5rem] font-bold leading-snug text-white"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {headline}
              </h2>
              <p
                className="text-base md:text-lg leading-relaxed"
                style={{
                  color: 'rgba(199, 208, 218, 0.85)',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                Desbloquea generación ilimitada con un único pago. Ahorra tiempo, evita bloqueos y accede antes que nadie a las funciones nuevas de PLEIA.
              </p>
            </div>

            {!unlimited && Number.isFinite(limit) && (
              <div className="space-y-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#36E2B4] via-[#5B8CFF] to-[#8C6CFF]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div
                  className="text-xs uppercase tracking-[0.25em]"
                  style={{
                    color: 'rgba(234, 242, 255, 0.6)',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {remaining <= 0 ? 'SIN PLAYLISTS GRATUITAS RESTANTES' : `TE QUEDAN ${remainingLabel} PLAYLISTS`}
                </div>
              </div>
            )}

            <ul
              className="grid gap-3 text-sm md:grid-cols-2"
              style={{ color: 'rgba(234, 242, 255, 0.78)', fontFamily: 'Inter, sans-serif' }}
            >
              <li className="flex items-start gap-2">
                <span className="text-lg leading-none">⚡</span>
                <span>Genera playlists ilimitadas al momento, sin esperar a que se renueven créditos.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg leading-none">🎯</span>
                <span>Acceso prioritario a nuevas funciones sociales y mejoras de IA.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg leading-none">🤝</span>
                <span>Apoya la evolución de PLEIA y desbloquea perks exclusivos de comunidad.</span>
              </li>
            </ul>
          </div>

          <div className={`grid gap-4 ${hasAdvantage ? 'md:grid-cols-2 items-stretch' : ''}`}>
            {hasAdvantage && (
              <div
                className="relative overflow-hidden rounded-2xl p-5 md:p-6"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,222,140,0.9), rgba(213,150,43,0.85))',
                  boxShadow: '0 24px 55px rgba(213,150,43,0.35)',
                  color: '#2B1A05',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                <div className="space-y-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#6A4705]">
                    PRIMEROS 1000 USUARIOS
                  </span>
                  <h3
                    className="text-xl font-semibold leading-snug"
                    style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#201205' }}
                  >
                    Consigue Founder Pass invitando a 3 amigos
                  </h3>
                  <p className="text-sm leading-relaxed text-[#3F2A0B]">
                    Por ser de los primeros 1000 en crear tu cuenta PLEIA puedes desbloquear generación ilimitada
                    invitando a 3 amigos que se creen su cuenta PLEIA usando tu enlace. O, si prefieres, comprar el Founder Pass por 5€.
                  </p>
                  <button
                    onClick={handleAdvantageClick}
                    className="inline-flex items-center justify-center rounded-xl bg-[#201205] px-4 py-2 text-sm font-semibold text-[#F4D891] shadow-md transition hover:brightness-110"
                  >
                    Ver cómo funciona
                  </button>
                </div>
              </div>
            )}

            <div
              className="rounded-2xl border border-[rgba(54,226,180,0.35)] bg-[rgba(16,24,34,0.85)] p-6 md:p-8 flex flex-col justify-between space-y-5"
              style={{ boxShadow: '0 30px 80px rgba(54,226,180,0.25)', fontFamily: 'Inter, sans-serif' }}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3
                    className="text-2xl font-semibold text-white"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    Founder Pass
                  </h3>
                  <span
                    className="rounded-full bg-[rgba(54,226,180,0.2)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em]"
                    style={{ color: '#36E2B4' }}
                  >
                    Pago único
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-white/75">
                  Acceso vitalicio a todas las playlists que quieras crear, soporte prioritario y novedades cerradas antes que el resto.
                </p>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <div
                    className="text-4xl font-bold leading-none text-[#36E2B4]"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    5€
                  </div>
                  <div className="text-xs uppercase tracking-[0.25em] text-white/60 mt-2">
                    pago único
                  </div>
                </div>

                <button
                  onClick={handleFounderClick}
                  className="rounded-xl bg-gradient-to-r from-[#36E2B4] to-[#2FCFA4] px-5 py-3 text-sm font-semibold text-[#061319] shadow-lg transition hover:scale-[1.02] hover:shadow-xl"
                >
                  Desbloquear Founder Pass
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

