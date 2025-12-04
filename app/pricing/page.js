'use client';

import { useState, useEffect } from 'react';
import { CHECKOUT_ENABLED, SHOW_MONTHLY } from '../../lib/flags';
import { useProfile } from '../../lib/useProfile';
import { usePleiaSession } from '../../lib/auth/usePleiaSession';
import { useUsageStatus } from '../../lib/hooks/useUsageStatus';
import { REFERRALS_ENABLED, canInvite, generateReferralLink } from '../../lib/referrals';

export default function PricingPage() {
  const [loading, setLoading] = useState(null);
  const [copied, setCopied] = useState(false);
  const [referralStats, setReferralStats] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const { data: session } = usePleiaSession();
  const { isFounder, plan, isEarlyFounderCandidate: profileIsEarly, ready: profileReady } = useProfile();
  const { isEarlyFounderCandidate: usageIsEarly } = useUsageStatus({ disabled: !session?.user });
  const isEarlyFounderCandidate = profileIsEarly || usageIsEarly; // Usar ambos como respaldo
  const isFounderAccount = profileReady && isFounder;
  const currentPlan = profileReady ? plan : null;
  
  // Debug logs
  useEffect(() => {
    console.log('[PRICING] Profile state:', {
      isFounder,
      plan,
      isEarlyFounderCandidate,
      profileReady,
      isFounderAccount,
      sessionEmail: session?.user?.email,
      canInviteResult: session?.user?.email ? canInvite(session.user.email, { isEarlyCandidate: isEarlyFounderCandidate }) : false
    });
  }, [isFounder, plan, isEarlyFounderCandidate, profileReady, isFounderAccount, session?.user?.email]);
  
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

  const copyReferralLink = async () => {
    const link = generateReferralLink(session?.user?.email);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('[REFERRAL] Error copying link:', error);
    }
  };

  const shareReferralLink = async () => {
    const link = generateReferralLink(session?.user?.email);
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

  // Load referral stats for whitelist users
  useEffect(() => {
    if (!profileReady) {
      return;
    }

    const loadReferralStats = async () => {
      // 🚨 CRITICAL: Verificar canInvite antes de hacer la petición para evitar 403
      if (
        REFERRALS_ENABLED &&
        session?.user?.email &&
        canInvite(session.user.email, { isEarlyCandidate: isEarlyFounderCandidate }) &&
        !isFounderAccount
      ) {
        try {
          const response = await fetch('/api/referrals/stats');
          if (response.ok) {
            const stats = await response.json();
            setReferralStats(stats);
          } else if (response.status === 403) {
            // Usuario no autorizado - no mostrar error, simplemente no cargar stats
            console.log('[PRICING] User not authorized to invite, skipping stats');
            setReferralStats(null);
          }
        } catch (error) {
          console.error('[REFERRAL] Error loading stats:', error);
          // No mostrar error al usuario
        }
      }
    };

    loadReferralStats();
  }, [session?.user?.email, isFounderAccount, profileReady, isEarlyFounderCandidate]);

  const handleSubscribe = async (plan) => {
    if (!CHECKOUT_ENABLED) {
      alert('Los pagos estarán disponibles próximamente');
      return;
    }

    setLoading(plan);
    
    try {
      const response = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.reason || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Error al procesar el pago. Inténtalo de nuevo.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: '#0B0F14' }}
    >
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 
            className="text-2xl md:text-4xl font-bold mb-3 md:mb-6"
            style={{ 
              color: '#EAF2FF',
              fontFamily: 'Space Grotesk, sans-serif',
              fontWeight: 700
            }}
          >
            Elige tu plan PLEIA
          </h1>
          <p 
            className="text-sm md:text-xl max-w-2xl mx-auto mb-4 md:mb-6 hidden md:block"
            style={{ 
              color: '#EAF2FF',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 400,
              opacity: 0.8
            }}
          >
            Desbloquea el poder de la IA para crear playlists perfectas. 
            Acceso vitalicio o suscripción mensual.
          </p>
          
          {/* Current Plan */}
          {isFounderAccount && (
            <div 
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full"
              style={{
                backgroundColor: 'rgba(255, 140, 0, 0.1)',
                border: '1px solid rgba(255, 140, 0, 0.3)'
              }}
            >
              <span 
                className="text-sm font-semibold"
                style={{ 
                  color: '#FF8C00',
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontWeight: 600
                }}
              >
                Tu plan actual:
              </span>
              <span 
                className="px-3 py-1 text-sm font-bold rounded-full"
                style={{
                  backgroundColor: '#FF8C00',
                  color: '#0B0F14',
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontWeight: 700
                }}
              >
                FOUNDER
              </span>
            </div>
          )}
          {!CHECKOUT_ENABLED && (
            <div 
              className="mt-6 inline-flex items-center rounded-lg px-4 py-2"
              style={{ 
                backgroundColor: 'rgba(91, 140, 255, 0.1)',
                border: '1px solid rgba(91, 140, 255, 0.2)'
              }}
            >
              <span 
                className="font-medium text-sm"
                style={{ 
                  color: '#5B8CFF',
                  fontFamily: 'Inter, sans-serif'
                }}
              >
                Próximamente
              </span>
            </div>
          )}
        </div>

        {/* Founder Advantage Section (early users): izquierda ventaja, derecha Founder 5€, abajo monthly */}
        {REFERRALS_ENABLED && session?.user?.email && isEarlyFounderCandidate && !isFounderAccount && (
          <div className="mb-12 max-w-4xl mx-auto">
            <div 
              className="rounded-2xl p-8 border-2"
              style={{ 
                backgroundColor: 'rgba(255, 140, 0, 0.05)',
                borderColor: '#FF8C00'
              }}
            >
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <svg className="w-8 h-8" fill="currentColor" style={{ color: '#f6c744' }} viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h2 
                    className="text-2xl font-bold"
                    style={{ 
                      color: '#f6c744',
                      fontFamily: 'Space Grotesk, sans-serif',
                      fontWeight: 700
                    }}
                  >
                    ¡Eres de los primeros 1000 en PLEIA!
                  </h2>
                </div>
                <p 
                  className="text-sm md:text-lg mb-4 md:mb-6"
                  style={{ 
                    color: '#EAF2FF',
                    fontFamily: 'Inter, sans-serif',
                    opacity: 0.9
                  }}
                >
                  <span className="hidden md:inline">Por ser de los <strong>primeros 1000 usuarios</strong> puedes conseguir <strong>playlists ilimitadas y muchas ventajas más</strong> <strong> gratis</strong> invitando a <span className="diagonal-strike">3</span> <strong style={{ color: '#36E2B4', fontSize: '1.2em' }}>1</strong> amigo (o comprar el pass directo por 5€).</span>
                  <span className="md:hidden">Primeros 1000: consigue <strong>playlists ilimitadas</strong> <strong>gratis</strong> invitando <span className="diagonal-strike">3</span> <strong style={{ color: '#36E2B4' }}>1</strong> amigo o compra por 5€.</span>
                </p>
                {/* Oferta Especial Badge */}
                <div 
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 animate-pulse"
                  style={{
                    backgroundColor: 'rgba(54, 226, 180, 0.2)',
                    border: '2px solid #36E2B4',
                    boxShadow: '0 0 20px rgba(54, 226, 180, 0.5)'
                  }}
                >
                  <span className="text-lg">🎉</span>
                  <span 
                    className="text-sm font-bold"
                    style={{ 
                      color: '#36E2B4',
                      fontFamily: 'Space Grotesk, sans-serif'
                    }}
                  >
                    OFERTA ESPECIAL: Playlists ilimitadas con solo 1 referido
                  </span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Referral Option */}
                <div 
                  className="rounded-xl p-6"
                  style={{ 
                    backgroundColor: 'rgba(255, 140, 0, 0.1)',
                    border: '1px solid rgba(255, 140, 0, 0.3)'
                  }}
                >
                  <h3 
                    className="text-xl font-semibold mb-3"
                    style={{ 
                      color: '#FF8C00',
                      fontFamily: 'Space Grotesk, sans-serif'
                    }}
                  >
                    🎯 Invita <span className="diagonal-strike" style={{ fontSize: '0.9em' }}>3</span> <strong style={{ color: '#36E2B4', fontSize: '1.2em' }}>1</strong> amigo y desbloquea playlists ilimitadas
                  </h3>
                  <p 
                    className="text-xs md:text-sm mb-3 md:mb-4 hidden md:block"
                    style={{ 
                      color: '#EAF2FF',
                      fontFamily: 'Inter, sans-serif',
                      opacity: 0.8
                    }}
                  >
                    Envía tu enlace a un amigo y que se cree una cuenta PLEIA. Desbloqueas <strong>playlists ilimitadas para siempre</strong>.
                  </p>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span 
                        className="text-sm font-medium"
                        style={{ 
                          color: '#EAF2FF',
                          fontFamily: 'Inter, sans-serif'
                        }}
                      >
                        Progreso: {referralStats?.qualifiedReferrals || 0} / <span className="diagonal-strike">3</span> <strong style={{ color: '#36E2B4' }}>1</strong> cualificado
                      </span>
                      <span 
                        className="text-sm font-semibold"
                        style={{ 
                          color: '#FF8C00',
                          fontFamily: 'Inter, sans-serif'
                        }}
                      >
                        {Math.round(((referralStats?.qualifiedReferrals || 0) / 1) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full transition-all duration-500 ease-out"
                        style={{ 
                          backgroundColor: '#FF8C00',
                          width: `${Math.min(((referralStats?.qualifiedReferrals || 0) / 1) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                    <p 
                      className="text-xs mt-1"
                      style={{ 
                        color: '#EAF2FF',
                        fontFamily: 'Inter, sans-serif',
                        opacity: 0.7
                      }}
                    >
                      {referralStats?.qualifiedReferrals >= 1 
                        ? '🎉 ¡Ya tienes playlists ilimitadas para siempre!' 
                        : `Falta ${1 - (referralStats?.qualifiedReferrals || 0)} amigo para desbloquear playlists ilimitadas gratis`
                      }
                    </p>
                  </div>
                  
                  <div className="mb-4">
                    <label 
                      className="block text-sm font-medium mb-2"
                      style={{ 
                        color: '#EAF2FF',
                        fontFamily: 'Inter, sans-serif'
                      }}
                    >
                      Envía este enlace a tus amigos:
                    </label>
                    {/* En móvil, apilar elementos para evitar overflow horizontal */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-stretch">
                      <input
                        type="text"
                        value={generateReferralLink(session.user.email)}
                        readOnly
                        className="w-full sm:flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm"
                      />
                      <button
                        onClick={copyReferralLink}
                        className="w-full sm:w-auto px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors text-sm"
                      >
                        {copied ? '✓' : 'Copiar'}
                      </button>
                      {isMobile && (
                        <button
                          onClick={shareReferralLink}
                          className="w-full sm:w-auto px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
                          title="Compartir en WhatsApp, Instagram, etc."
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  <div 
                    className="text-center p-3 rounded-lg"
                    style={{ backgroundColor: 'rgba(54, 226, 180, 0.1)' }}
                  >
                    <span 
                      className="text-sm font-semibold"
                      style={{ 
                        color: '#36E2B4',
                        fontFamily: 'Inter, sans-serif'
                      }}
                    >
                      ✅ GRATIS - Solo necesitas <span className="diagonal-strike">3</span> <strong style={{ color: '#36E2B4', fontSize: '1.1em' }}>1</strong> referido cualificado
                    </span>
                  </div>
                </div>

                {/* Payment Option */}
                <div 
                  className="rounded-xl p-6"
                  style={{ 
                    backgroundColor: 'rgba(91, 140, 255, 0.1)',
                    border: '1px solid rgba(91, 140, 255, 0.3)'
                  }}
                >
                  <h3 
                    className="text-xl font-semibold mb-3"
                    style={{ 
                      color: '#5B8CFF',
                      fontFamily: 'Space Grotesk, sans-serif'
                    }}
                  >
                    💳 Pago directo
                  </h3>
                  <p 
                    className="text-xs md:text-sm mb-3 md:mb-4 hidden md:block"
                    style={{ 
                      color: '#EAF2FF',
                      fontFamily: 'Inter, sans-serif',
                      opacity: 0.8
                    }}
                  >
                    Si prefieres no esperar, puedes comprar Founder Pass directamente.
                  </p>
                  
                  <div className="text-center">
                    <div 
                      className="text-3xl font-bold mb-2"
                      style={{ 
                        color: '#5B8CFF',
                        fontFamily: 'Space Grotesk, sans-serif'
                      }}
                    >
                      5€
                    </div>
                    <div 
                      className="text-xs md:text-sm mb-3 md:mb-4 hidden md:block"
                      style={{ 
                        color: '#EAF2FF',
                        fontFamily: 'Inter, sans-serif',
                        opacity: 0.7
                      }}
                    >
                      Pago único (menos que un cubata)
                    </div>
                    
                    <button
                      onClick={() => handleSubscribe('founder')}
                      disabled={loading === 'founder'}
                      className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
                    >
                      {loading === 'founder' ? 'Procesando...' : 'Comprar Founder Pass'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pricing Cards - Only show para usuarios sin ventaja early */}
        {!(REFERRALS_ENABLED && session?.user?.email && isEarlyFounderCandidate && !isFounderAccount) && (
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Founder Pass */}
          <div 
            className="relative rounded-2xl p-8 transition-all duration-200 hover:scale-[1.02]"
            style={{ 
              backgroundColor: '#0F141B',
              border: isFounderAccount ? '2px solid #FF8C00' : '1px solid rgba(54, 226, 180, 0.2)',
              boxShadow: isFounderAccount ? '0 4px 20px rgba(255, 140, 0, 0.2)' : '0 4px 20px rgba(54, 226, 180, 0.1)'
            }}
          >
            {/* Selected Badge */}
            {isFounderAccount && (
              <div 
                className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-4 py-1 rounded-full"
                style={{
                  backgroundColor: '#FF8C00',
                  color: '#0B0F14'
                }}
              >
                <span 
                  className="text-sm font-bold"
                  style={{ 
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontWeight: 700
                  }}
                >
                  SELECCIONADO
                </span>
              </div>
            )}
            <div className="text-center">
              <h3 
                className="text-2xl font-bold mb-2"
                style={{ 
                  color: '#EAF2FF',
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontWeight: 600
                }}
              >
                Founder Pass
              </h3>
              <p 
                className="mb-6"
                style={{ 
                  color: '#EAF2FF',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  opacity: 0.7
                }}
              >
                Acceso vitalicio
              </p>
              
              <div className="mb-6">
                <span 
                  className="text-5xl font-bold"
                  style={{ 
                    color: '#36E2B4',
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontWeight: 700
                  }}
                >
                  5€
                </span>
                <span 
                  className="ml-2"
                  style={{ 
                    color: '#EAF2FF',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 400,
                    opacity: 0.7
                  }}
                >
                  pago único (menos que un cubata)
                </span>
              </div>

              <ul className="space-y-4 mb-8 text-left">
                <li className="flex items-center">
                  <svg 
                    className="w-5 h-5 mr-3 flex-shrink-0" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{ color: '#36E2B4' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span 
                    style={{ 
                      color: '#EAF2FF',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400
                    }}
                  >
                    Playlists ilimitadas
                  </span>
                </li>
                <li className="flex items-center">
                  <svg 
                    className="w-5 h-5 mr-3 flex-shrink-0" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{ color: '#36E2B4' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span 
                    style={{ 
                      color: '#EAF2FF',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400
                    }}
                  >
                    Compatibilidad con Spotify
                  </span>
                </li>
                <li className="flex items-center">
                  <svg 
                    className="w-5 h-5 mr-3 flex-shrink-0" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{ color: '#36E2B4' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span 
                    style={{ 
                      color: '#EAF2FF',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400
                    }}
                  >
                    Updates y mejoras constantes
                  </span>
                </li>
                <li className="flex items-center">
                  <svg 
                    className="w-5 h-5 mr-3 flex-shrink-0" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{ color: '#36E2B4' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span 
                    style={{ 
                      color: '#EAF2FF',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400
                    }}
                  >
                    Soporte prioritario
                  </span>
                </li>
              </ul>

              <button
                onClick={() => !isFounderAccount && handleSubscribe('founder')}
                disabled={isFounderAccount || !CHECKOUT_ENABLED || loading === 'founder'}
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                  isFounderAccount 
                    ? 'cursor-default' 
                    : CHECKOUT_ENABLED
                      ? 'hover:shadow-lg hover:scale-[1.02]'
                      : 'opacity-50 cursor-not-allowed'
                }`}
                style={{
                  backgroundColor: isFounderAccount 
                    ? '#FF8C00' 
                    : CHECKOUT_ENABLED 
                      ? '#36E2B4' 
                      : 'rgba(255, 255, 255, 0.1)',
                  color: isFounderAccount 
                    ? '#0B0F14' 
                    : CHECKOUT_ENABLED 
                      ? '#0B0F14' 
                      : '#EAF2FF',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  border: 'none'
                }}
              >
                {loading === 'founder' ? (
                  <div className="flex items-center justify-center">
                    <div 
                      className="animate-spin rounded-full h-5 w-5 border-b-2 mr-2"
                      style={{ borderColor: '#0B0F14' }}
                    ></div>
                    Procesando...
                  </div>
                ) : isFounderAccount ? (
                  '✓ Ya tienes este plan'
                ) : CHECKOUT_ENABLED ? (
                  'Comprar ahora'
                ) : (
                  'Próximamente'
                )}
              </button>
            </div>
          </div>

          {/* Monthly Plan */}
          <div 
            className="relative rounded-2xl p-8 transition-all duration-200"
            style={{ 
              backgroundColor: '#0F141B',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
            }}
          >
            {!SHOW_MONTHLY && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span 
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{ 
                    backgroundColor: 'rgba(91, 140, 255, 0.2)',
                    color: '#5B8CFF',
                    fontFamily: 'Inter, sans-serif'
                  }}
                >
                  Próximamente
                </span>
              </div>
            )}
            
            <div className="text-center">
              <h3 
                className="text-2xl font-bold mb-2"
                style={{ 
                  color: '#EAF2FF',
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontWeight: 600
                }}
              >
                PLEIA Monthly
              </h3>
              <p 
                className="mb-6"
                style={{ 
                  color: '#EAF2FF',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  opacity: 0.7
                }}
              >
                Suscripción mensual
              </p>
              
              <div className="mb-6">
                <span 
                  className="text-5xl font-bold"
                  style={{ 
                    color: '#5B8CFF',
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontWeight: 700
                  }}
                >
                  2.99€
                </span>
                <span 
                  className="ml-2"
                  style={{ 
                    color: '#EAF2FF',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 400,
                    opacity: 0.7
                  }}
                >
                  /mes
                </span>
              </div>

              <ul className="space-y-4 mb-8 text-left">
                <li className="flex items-center">
                  <svg 
                    className="w-5 h-5 mr-3 flex-shrink-0" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{ color: '#5B8CFF' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span 
                    style={{ 
                      color: '#EAF2FF',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400
                    }}
                  >
                    Playlists ilimitadas
                  </span>
                </li>
                <li className="flex items-center">
                  <svg 
                    className="w-5 h-5 mr-3 flex-shrink-0" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{ color: '#5B8CFF' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span 
                    style={{ 
                      color: '#EAF2FF',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400
                    }}
                  >
                    Compatibilidad con Spotify
                  </span>
                </li>
                <li className="flex items-center">
                  <svg 
                    className="w-5 h-5 mr-3 flex-shrink-0" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{ color: '#5B8CFF' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span 
                    style={{ 
                      color: '#EAF2FF',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400
                    }}
                  >
                    Updates y mejoras constantes
                  </span>
                </li>
                <li className="flex items-center">
                  <svg 
                    className="w-5 h-5 mr-3 flex-shrink-0" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{ color: '#5B8CFF' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span 
                    style={{ 
                      color: '#EAF2FF',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400
                    }}
                  >
                    Cancelar cuando quieras
                  </span>
                </li>
              </ul>

              <button
                onClick={() => handleSubscribe('monthly')}
                disabled={!CHECKOUT_ENABLED || !SHOW_MONTHLY || loading === 'monthly'}
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                  CHECKOUT_ENABLED && SHOW_MONTHLY
                    ? 'hover:shadow-lg hover:scale-[1.02]'
                    : 'opacity-50 cursor-not-allowed'
                }`}
                style={{
                  backgroundColor: CHECKOUT_ENABLED && SHOW_MONTHLY ? '#5B8CFF' : 'rgba(255, 255, 255, 0.1)',
                  color: CHECKOUT_ENABLED && SHOW_MONTHLY ? '#0B0F14' : '#EAF2FF',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  border: 'none'
                }}
              >
                {loading === 'monthly' ? (
                  <div className="flex items-center justify-center">
                    <div 
                      className="animate-spin rounded-full h-5 w-5 border-b-2 mr-2"
                      style={{ borderColor: '#0B0F14' }}
                    ></div>
                    Procesando...
                  </div>
                ) : CHECKOUT_ENABLED && SHOW_MONTHLY ? (
                  'Suscribirse'
                ) : (
                  'Próximamente'
                )}
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Pro Plan Section - Only for founder whitelist */}
        {REFERRALS_ENABLED && session?.user?.email && canInvite(session.user.email) && !isFounderAccount && (
          <div className="max-w-2xl mx-auto mb-12">
            <div 
              className="rounded-2xl p-8"
              style={{ 
                backgroundColor: '#0F141B',
                border: '1px solid rgba(91, 140, 255, 0.2)'
              }}
            >
              <div className="text-center">
                <h3 
                  className="text-2xl font-bold mb-2"
                  style={{ 
                    color: '#5B8CFF',
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontWeight: 600
                  }}
                >
                  PLEIA Pro
                </h3>
                <p 
                  className="mb-6"
                  style={{ 
                    color: '#EAF2FF',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 400,
                    opacity: 0.7
                  }}
                >
                  Próximamente
                </p>
                
                <div 
                  className="inline-flex items-center rounded-lg px-4 py-2"
                  style={{ 
                    backgroundColor: 'rgba(91, 140, 255, 0.1)',
                    border: '1px solid rgba(91, 140, 255, 0.2)'
                  }}
                >
                  <span 
                    className="font-medium text-sm"
                    style={{ 
                      color: '#5B8CFF',
                      fontFamily: 'Inter, sans-serif'
                    }}
                  >
                    Próximamente
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Features Section */}
        <div 
          className="mt-20 rounded-2xl p-8"
          style={{ 
            backgroundColor: '#0F141B',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <h2 
            className="text-3xl font-bold text-center mb-12"
            style={{ 
              color: '#EAF2FF',
              fontFamily: 'Space Grotesk, sans-serif',
              fontWeight: 700
            }}
          >
            ¿Qué incluye?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div 
                className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: 'rgba(54, 226, 180, 0.1)' }}
              >
                <svg 
                  className="w-6 h-6" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  style={{ color: '#36E2B4' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <h3 
                className="text-xl font-semibold mb-3"
                style={{ 
                  color: '#EAF2FF',
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontWeight: 600
                }}
              >
                Playlists ilimitadas
              </h3>
              <p 
                style={{ 
                  color: '#EAF2FF',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  opacity: 0.7
                }}
              >
                Crea tantas playlists como quieras sin restricciones
              </p>
            </div>

            <div className="text-center">
              <div 
                className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: 'rgba(91, 140, 255, 0.1)' }}
              >
                <svg 
                  className="w-6 h-6" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  style={{ color: '#5B8CFF' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 
                className="text-xl font-semibold mb-3"
                style={{ 
                  color: '#EAF2FF',
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontWeight: 600
                }}
              >
                Compatibilidad con Spotify
              </h3>
              <p 
                style={{ 
                  color: '#EAF2FF',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  opacity: 0.7
                }}
              >
                Integración completa con tu cuenta de Spotify
              </p>
            </div>

            <div className="text-center">
              <div 
                className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: 'rgba(54, 226, 180, 0.1)' }}
              >
                <svg 
                  className="w-6 h-6" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  style={{ color: '#36E2B4' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 
                className="text-xl font-semibold mb-3"
                style={{ 
                  color: '#EAF2FF',
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontWeight: 600
                }}
              >
                Updates y mejoras constantes
              </h3>
              <p 
                style={{ 
                  color: '#EAF2FF',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  opacity: 0.7
                }}
              >
                Nuevas funciones y mejoras regulares
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

