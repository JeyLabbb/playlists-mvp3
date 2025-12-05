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
export const REF_REQUIRED_COUNT = 1; // 🎉 OFERTA ESPECIAL: Reducido de 3 a 1 referido para Founder Pass ilimitado
export const REF_QUALIFY_RULE = 'hasCreatedPlaylist >= 1';

// Helper functions
export function isFounderWhitelisted(email: string): boolean {
  return FOUNDER_WHITELIST.includes(email.toLowerCase());
}

export function canInvite(email: string, options?: { isEarlyCandidate?: boolean | null }): boolean {
  if (!REFERRALS_ENABLED) return false;

  // 🎉 OFERTA ESPECIAL TEMPORAL: 
  // Mientras la promo esté activa, TODOS los usuarios pueden invitar y conseguir Founder con 1 referido.
  // Cuando se termine la oferta, se puede volver a limitar con early-candidate / whitelist.
  return true;

  // Código original (comentado para cuando termine la oferta):
  // // Nueva regla: si el usuario es early-candidate (primeros 1000), siempre puede usar la ventaja
  // if (options?.isEarlyCandidate) return true;
  // // Fallback: lista blanca histórica por si queremos mantener algunos casos especiales
  // return isFounderWhitelisted(email);
}

export function generateReferralLink(email: string): string {
  // Siempre usar el dominio de producción para enlaces de invitación
  // Solo usar localhost si estamos explícitamente en desarrollo local
  let baseUrl = 'https://playlists.jeylabbb.com';
  
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    // Solo usar localhost si estamos en desarrollo local explícito
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      // En desarrollo local, usar localhost
      baseUrl = origin;
    } else {
      // En cualquier otro caso (producción, staging, etc.), usar siempre playlists.jeylabbb.com
      baseUrl = 'https://playlists.jeylabbb.com';
    }
  } else {
    // En servidor, verificar si estamos en desarrollo
    const isDev = process.env.NODE_ENV === 'development';
    const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL;
    
    if (isDev && envUrl && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'))) {
      // Solo en desarrollo explícito usar localhost
      baseUrl = envUrl;
    } else {
      // En producción o sin configuración, usar siempre playlists.jeylabbb.com
      baseUrl = 'https://playlists.jeylabbb.com';
    }
  }
  
  return `${baseUrl}/invite?ref=${encodeURIComponent(email)}`;
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
