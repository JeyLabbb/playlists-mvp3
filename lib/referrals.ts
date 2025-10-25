// Referrals configuration for Founder Newsletter members
export const REFERRALS_ENABLED = true; // Enable for testing

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

// Helper functions
export function isFounderWhitelisted(email: string): boolean {
  return FOUNDER_WHITELIST.includes(email.toLowerCase());
}

export function canInvite(email: string): boolean {
  return REFERRALS_ENABLED && isFounderWhitelisted(email);
}

export function generateReferralLink(email: string): string {
  const baseUrl = process.env.NODE_ENV === 'development' 
    ? 'http://127.0.0.1:3000' 
    : 'https://playlists.jeylabbb.com';
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
