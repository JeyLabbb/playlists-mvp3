// Referrals configuration for Founder Newsletter members
export const REFERRALS_ENABLED = true; // Enabled globally; eligibility now se basa en Supabase/usage

// Founder Newsletter whitelist (30 emails)
export const FOUNDER_WHITELIST = [
  'jorgejr200419@gmail.com',
  'jeylabbb@gmail.com',
  'founder1@example.com',
  'founder2@example.com',
  'founder3@example.com',
  'founder4@example.com',
  'founder5@example.com',
  'founder6@example.com',
  'founder7@example.com',
  'founder8@example.com',
  'founder9@example.com',
  'founder10@example.com',
  'founder11@example.com',
  'founder12@example.com',
  'founder13@example.com',
  'founder14@example.com',
  'founder15@example.com',
  'founder16@example.com',
  'founder17@example.com',
  'founder18@example.com',
  'founder19@example.com',
  'founder20@example.com',
  'founder21@example.com',
  'founder22@example.com',
  'founder23@example.com',
  'founder24@example.com',
  'founder25@example.com',
  'founder26@example.com',
  'founder27@example.com',
  'founder28@example.com',
  'founder29@example.com',
  'founder30@example.com'
];

// Referral requirements
export const REF_REQUIRED_COUNT = 3;
export const REF_QUALIFY_RULE = 'hasCreatedPlaylist >= 1';

// 🚨 PRODUCTION URL: URL de producción para enlaces de invitación
// NUNCA cambiar esto sin verificar que todos los enlaces funcionen
export const PRODUCTION_REFERRAL_BASE_URL = 'https://playlists.jeylabbb.com';

// Helper functions
export function isFounderWhitelisted(email: string): boolean {
  return FOUNDER_WHITELIST.includes(email.toLowerCase());
}

export function canInvite(email: string, options?: { isEarlyCandidate?: boolean | null }): boolean {
  if (!REFERRALS_ENABLED) return false;

  // Nueva regla: si el usuario es early-candidate (primeros 1000), siempre puede usar la ventaja
  if (options?.isEarlyCandidate) return true;

  // Fallback: lista blanca histórica por si queremos mantener algunos casos especiales
  return isFounderWhitelisted(email);
}

/**
 * Genera un enlace de invitación. 
 * 🚨 CRITICAL: En producción SIEMPRE usa playlists.jeylabbb.com
 * Solo usa localhost si estamos EXPLÍCITAMENTE en localhost en el navegador
 */
export function generateReferralLink(email: string): string {
  // 🚨 PRODUCTION DEFAULT: Siempre usar playlists.jeylabbb.com por defecto
  const PRODUCTION_URL = PRODUCTION_REFERRAL_BASE_URL;
  let baseUrl = PRODUCTION_URL;
  
  // Solo en el cliente (navegador) podemos verificar la URL actual
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    const hostname = window.location.hostname;
    
    // 🚨 SEGURIDAD: Solo usar localhost si estamos EXPLÍCITAMENTE en localhost
    // Verificar tanto origin como hostname para estar seguros
    const isLocalhost = 
      hostname === 'localhost' || 
      hostname === '127.0.0.1' ||
      origin.includes('localhost') || 
      origin.includes('127.0.0.1');
    
    if (isLocalhost) {
      // Solo en desarrollo local explícito usar localhost
      baseUrl = origin;
      console.log('[REFERRAL] Using localhost for referral link (development):', baseUrl);
    } else {
      // En cualquier otro caso (producción, staging, vercel preview, etc.), usar SIEMPRE producción
      baseUrl = PRODUCTION_URL;
      if (origin !== PRODUCTION_URL) {
        console.log('[REFERRAL] Using production URL for referral link (current origin:', origin, '->', baseUrl);
      }
    }
  } else {
    // En servidor (SSR), NUNCA usar localhost a menos que sea explícitamente desarrollo
    const isDev = process.env.NODE_ENV === 'development';
    const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL;
    
    // 🚨 SEGURIDAD: Solo usar localhost si TODAS estas condiciones se cumplen:
    // 1. Estamos en desarrollo
    // 2. La URL de entorno existe
    // 3. La URL de entorno es explícitamente localhost
    const canUseLocalhost = isDev && 
                            envUrl && 
                            (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'));
    
    if (canUseLocalhost) {
      baseUrl = envUrl;
      console.log('[REFERRAL] Using localhost for referral link (server-side development):', baseUrl);
    } else {
      // En producción o sin configuración clara, usar SIEMPRE producción
      baseUrl = PRODUCTION_URL;
      if (envUrl && envUrl !== PRODUCTION_URL) {
        console.log('[REFERRAL] Using production URL for referral link (env URL:', envUrl, '->', baseUrl);
      }
    }
  }
  
  // 🚨 VALIDACIÓN FINAL: Asegurar que nunca devolvamos localhost en producción
  // Si por alguna razón llegamos aquí con localhost y no estamos en desarrollo, forzar producción
  if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
    const isDefinitelyDev = typeof window !== 'undefined' 
      ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      : (process.env.NODE_ENV === 'development');
    
    if (!isDefinitelyDev) {
      console.warn('[REFERRAL] ⚠️ WARNING: Detected localhost in non-dev environment, forcing production URL');
      baseUrl = PRODUCTION_URL;
    }
  }
  
  const referralLink = `${baseUrl}/invite?ref=${encodeURIComponent(email)}`;
  
  // 🚨 LOGGING: En producción, loggear si detectamos algo raro
  if (typeof window !== 'undefined' && !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
    if (baseUrl !== PRODUCTION_URL) {
      console.warn('[REFERRAL] ⚠️ Using non-standard URL for referral:', baseUrl);
    }
  }
  
  return referralLink;
}

// Types
export interface ReferralProfile {
  email: string;
  plan: 'free' | 'founder' | 'pro';
  referredBy?: string;
  referrals?: string[];
  referredQualifiedCount?: number;
  hasCreatedPlaylist?: number;
  founderSince?: string;
}

export interface ReferralStats {
  totalReferrals: number;
  qualifiedReferrals: number;
  remainingToUnlock: number;
  progressPercentage: number;
  canInvite: boolean;
}
