'use client';

import { useState, useEffect } from 'react';
import { usePleiaSession } from '../../lib/auth/usePleiaSession';
import { useProfile } from '../../lib/useProfile';
import { REFERRALS_ENABLED, canInvite, generateReferralLink, REF_REQUIRED_COUNT } from '../../lib/referrals';

export default function ReferralModule({ userEmail }) {
  const { data: session, status } = usePleiaSession();
  const { isEarlyFounderCandidate } = useProfile();
  const [referralStats, setReferralStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Detectar si es móvil (donde Web Share API funciona mejor)
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                            (typeof window !== 'undefined' && window.innerWidth < 768);
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    console.log('[REFERRAL-MODULE] Effect triggered:', { 
      status, 
      userEmail, 
      isEarlyFounderCandidate,
      canInviteResult: canInvite(userEmail, { isEarlyCandidate: isEarlyFounderCandidate })
    });
    
    if (status !== 'authenticated') {
      setReferralStats(null);
      setLoading(false);
      return;
    }

    // 🚨 CRITICAL: Solo cargar stats si el usuario puede invitar
    // Esto evita el error 403 para usuarios que no son early founder candidates
    const canInviteResult = canInvite(userEmail, { isEarlyCandidate: isEarlyFounderCandidate });
    if (canInviteResult) {
      console.log('[REFERRAL-MODULE] ✅ User can invite, loading stats...');
      loadReferralStats();
      const interval = setInterval(loadReferralStats, 10000);
      return () => clearInterval(interval);
    } else {
      console.log('[REFERRAL-MODULE] ❌ User cannot invite, skipping stats load:', { 
        REFERRALS_ENABLED, 
        isEarlyFounderCandidate,
        canInviteResult
      });
      setReferralStats(null);
    }

    setLoading(false);
  }, [userEmail, status, isEarlyFounderCandidate]);

  const loadReferralStats = async () => {
    // 🚨 CRITICAL: Verificar canInvite antes de hacer la petición para evitar 403
    const canInviteResult = canInvite(userEmail, { isEarlyCandidate: isEarlyFounderCandidate });
    if (!canInviteResult) {
      console.log('[REFERRAL-MODULE] Skipping stats load - user cannot invite');
      setReferralStats(null);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/referrals/stats', { credentials: 'include' });
      if (response.status === 401 || response.status === 403) {
        console.warn('[REFERRAL] Stats response unauthorized/forbidden:', response.status);
        setReferralStats(null);
        setLoading(false);
        return;
      }

      if (response.ok) {
        const stats = await response.json();
        console.log('[REFERRAL] Stats received:', stats);
        setReferralStats(stats);
      } else {
        const errorText = await response.text();
        console.error('[REFERRAL] Stats response not ok:', response.status, errorText);
        // No mostrar error al usuario si es 403 - simplemente no mostrar stats
        if (response.status !== 403) {
          setReferralStats(null);
        }
      }
    } catch (error) {
      console.error('[REFERRAL] Error loading stats:', error);
      // No mostrar error al usuario - simplemente no mostrar stats
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = async () => {
    const link = generateReferralLink(userEmail);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('[REFERRAL] Error copying link:', error);
    }
  };

  const shareReferralLink = async () => {
    const link = generateReferralLink(userEmail);
    const shareText = 'Prueba esta IA que te hace playlists en Spotify! 🎵';
    
    try {
      // Verificar que navigator.share existe y es una función
      if (typeof navigator !== 'undefined' && navigator.share && typeof navigator.share === 'function') {
        // Usar solo text y url, sin title (más compatible)
        const shareData = {
          text: shareText,
          url: link,
        };
        
        // Intentar compartir sin usar canShare (puede causar problemas en Safari)
        await navigator.share(shareData);
        console.log('[REFERRAL] Link shared successfully');
        return;
      }
    } catch (error) {
      // Si el usuario cancela el share, no hacer nada
      if (error.name === 'AbortError') {
        return;
      }
      // Si hay otro error, continuar al fallback
      console.warn('[REFERRAL] Share failed, using fallback:', error);
    }
    
    // Fallback: copiar al portapapeles con el mensaje
    try {
      const fullText = `${shareText}\n\n${link}`;
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      console.log('[REFERRAL] Copied to clipboard with message');
    } catch (clipboardError) {
      console.error('[REFERRAL] Error copying to clipboard:', clipboardError);
    }
  };

  // 🚨 CRITICAL: Siempre intentar renderizar si REFERRALS_ENABLED es true
  // El módulo se ocultará internamente si no puede invitar
  const canInviteResult = canInvite(userEmail, { isEarlyCandidate: isEarlyFounderCandidate });
  console.log('[REFERRAL-MODULE] Render check:', { 
    REFERRALS_ENABLED, 
    isEarlyFounderCandidate,
    canInviteResult,
    userEmail,
    status,
    profileData: { isEarlyFounderCandidate }
  });
  
  // Solo ocultar si REFERRALS_ENABLED es false
  if (!REFERRALS_ENABLED) {
    return null;
  }
  
  console.log('[REFERRAL-MODULE] ✅ Rendering module');

  if (status === 'loading') {
    return (
      <div className="bg-gray-800/50 border border-gray-600/30 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-600/30 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded mb-3"></div>
          <div className="h-4 bg-gray-700 rounded mb-4"></div>
          <div className="h-10 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  const progressPercentage = referralStats 
    ? Math.min((referralStats.qualifiedReferrals / REF_REQUIRED_COUNT) * 100, 100)
    : 0;

  const GOLD = '#f6c744';
  const GOLD_DARK = '#7f5f1f';
  const GOLD_SOFT = 'rgba(246, 197, 68, 0.15)';

  return (
    <div className="rounded-lg p-6 border" style={{
      background: 'linear-gradient(135deg, rgba(61,38,0,0.35), rgba(246,197,68,0.12))',
      borderColor: 'rgba(246, 197, 68, 0.35)',
      boxShadow: '0 0 32px rgba(246,197,68,0.15)'
    }}>
      <div className="flex items-center gap-2 mb-1">
        <svg className="w-6 h-6" fill="currentColor" style={{ color: GOLD }} viewBox="0 0 20 20">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-semibold" style={{ color: GOLD }}>
          Invitar amigos
        </h3>
      </div>
      
      <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'rgba(255, 241, 207, 0.75)' }}>
        Por ser de los primeros 1000 en crear cuenta PLEIA
      </p>
      <div className="mb-2">
        <span 
          className="text-xs font-bold px-2 py-1 rounded inline-block"
          style={{ 
            backgroundColor: 'rgba(54, 226, 180, 0.2)',
            color: '#36E2B4',
            border: '1px solid #36E2B4'
          }}
        >
          🎉 OFERTA ESPECIAL
        </span>
      </div>
      <p className="text-sm mb-4" style={{ color: 'rgba(255, 241, 207, 0.9)' }}>
        Envía tu enlace a un amigo y que se cree una cuenta PLEIA. Desbloqueas <strong>playlists ilimitadas para siempre</strong> (o compra el pass por 5€).
      </p>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm" style={{ color: 'rgba(255, 241, 207, 0.7)' }}>
            Progreso: {referralStats?.qualifiedReferrals || 0} / {REF_REQUIRED_COUNT}
          </span>
          <span className="text-sm font-semibold" style={{ color: GOLD }}>
            {Math.round(progressPercentage)}%
          </span>
        </div>
        <div className="w-full rounded-full h-2" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
          <div 
            className="h-2 rounded-full transition-all duration-300"
            style={{ 
              background: `linear-gradient(90deg, ${GOLD_DARK}, ${GOLD})`,
              width: `${progressPercentage}%`
            }}
          ></div>
        </div>
      </div>

      {/* Referral Link */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(255, 241, 207, 0.85)' }}>
          Envía este enlace a tus amigos:
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={generateReferralLink(userEmail)}
            readOnly
            className="flex-1 px-3 py-2 rounded-lg text-sm"
            style={{
              backgroundColor: 'rgba(12, 16, 24, 0.65)',
              border: '1px solid rgba(246, 197, 68, 0.25)',
              color: '#fff',
              boxShadow: 'inset 0 0 12px rgba(246,197,68,0.12)'
            }}
          />
          <button
            onClick={copyReferralLink}
            className="px-4 py-2 rounded-lg font-medium text-sm transition-colors"
            style={{
              background: copied
                ? 'rgba(246, 197, 68, 0.15)'
                : `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD})`,
              border: `1px solid ${GOLD}`,
              color: copied ? GOLD : '#0B1018',
              boxShadow: copied ? '0 0 18px rgba(246,197,68,0.25)' : '0 12px 24px rgba(246,197,68,0.25)'
            }}
          >
            {copied ? '✓ Copiado' : 'Copiar'}
          </button>
          {isMobile && (
            <button
              onClick={shareReferralLink}
              className="px-3 py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD})`,
                border: `1px solid ${GOLD}`,
                color: '#0B1018',
                boxShadow: '0 12px 24px rgba(246,197,68,0.25)'
              }}
              title="Compartir en WhatsApp, Instagram, etc."
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {referralStats && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: GOLD }}>
              {referralStats.totalReferrals}
            </div>
            <div style={{ color: 'rgba(255, 241, 207, 0.6)' }}>Total invitados</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: '#36E2B4' }}>
              {referralStats.qualifiedReferrals}
            </div>
            <div style={{ color: 'rgba(255, 241, 207, 0.6)' }}>Cualificados</div>
          </div>
        </div>
      )}

      {/* Status Message */}
      <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: GOLD_SOFT, border: '1px solid rgba(246,197,68,0.25)' }}>
        <p className="text-sm font-medium" style={{ color: GOLD }}>
          {referralStats?.qualifiedReferrals >= REF_REQUIRED_COUNT 
            ? '🎉 ¡Felicidades! Ya tienes playlists ilimitadas para siempre.'
            : `Falta ${REF_REQUIRED_COUNT - (referralStats?.qualifiedReferrals || 0)} amigo para desbloquear playlists ilimitadas gratis. Envía tu enlace de arriba a un amigo y que se cree una cuenta PLEIA desde tu enlace.`
          }
        </p>
      </div>
    </div>
  );
}
