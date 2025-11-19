'use client';

import { useState, useEffect } from 'react';
import { usePleiaSession } from '../../lib/auth/usePleiaSession';
import { REFERRALS_ENABLED, canInvite, generateReferralLink, REF_REQUIRED_COUNT } from '../../lib/referrals';

export default function ReferralModule({ userEmail }) {
  const { data: session, status } = usePleiaSession();
  const [referralStats, setReferralStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === 'loading') {
      return; // Wait for session to load
    }
    
    if (canInvite(userEmail)) {
      loadReferralStats();
      // Refresh stats every 10 seconds
      const interval = setInterval(loadReferralStats, 10000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [userEmail, status]);

  const loadReferralStats = async () => {
    try {
      const response = await fetch('/api/referrals/stats');
      if (response.ok) {
        const stats = await response.json();
        console.log('[REFERRAL] Stats received:', stats);
        setReferralStats(stats);
      } else {
        console.error('[REFERRAL] Stats response not ok:', response.status, await response.text());
      }
    } catch (error) {
      console.error('[REFERRAL] Error loading stats:', error);
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

  if (!REFERRALS_ENABLED || !canInvite(userEmail)) {
    return null;
  }

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

  return (
    <div className="bg-gradient-to-br from-orange-900/20 to-yellow-900/20 border border-orange-500/30 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-6 h-6" fill="currentColor" style={{ color: '#FF8C00' }} viewBox="0 0 20 20">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-semibold" style={{ color: '#FF8C00' }}>
          Invitar amigos
        </h3>
      </div>
      
      <p className="text-gray-300 text-sm mb-4">
        Invita a 3 amigos y desbloquea <strong>Founder de por vida</strong> gratis.
      </p>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">
            Progreso: {referralStats?.qualifiedReferrals || 0} / {REF_REQUIRED_COUNT}
          </span>
          <span className="text-sm font-semibold" style={{ color: '#FF8C00' }}>
            {Math.round(progressPercentage)}%
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className="h-2 rounded-full transition-all duration-300"
            style={{ 
              backgroundColor: '#FF8C00',
              width: `${progressPercentage}%`
            }}
          ></div>
        </div>
      </div>

      {/* Referral Link */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Tu enlace de invitación:
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={generateReferralLink(userEmail)}
            readOnly
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
          />
          <button
            onClick={copyReferralLink}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors text-sm"
          >
            {copied ? '✓' : 'Copiar'}
          </button>
        </div>
      </div>

      {/* Stats */}
      {referralStats && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: '#FF8C00' }}>
              {referralStats.totalReferrals}
            </div>
            <div className="text-gray-400">Total invitados</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: '#36E2B4' }}>
              {referralStats.qualifiedReferrals}
            </div>
            <div className="text-gray-400">Cualificados</div>
          </div>
        </div>
      )}

      {/* Status Message */}
      <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 140, 0, 0.1)' }}>
        <p className="text-sm" style={{ color: '#FF8C00' }}>
          {referralStats?.qualifiedReferrals >= REF_REQUIRED_COUNT 
            ? '🎉 ¡Felicidades! Ya tienes acceso de Founder de por vida.'
            : `Faltan ${REF_REQUIRED_COUNT - (referralStats?.qualifiedReferrals || 0)} invitados para desbloquear Founder de por vida.`
          }
        </p>
      </div>
    </div>
  );
}
