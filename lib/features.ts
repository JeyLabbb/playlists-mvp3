export const HUB_MODE = process.env.HUB_MODE === '1';
// DISABLE_SPOTIFY_USER_OAUTH solo afecta a OAuth de Spotify para usuarios, no a login con Google/Apple
export const DISABLE_SPOTIFY_USER_OAUTH =
  process.env.DISABLE_SPOTIFY_USER_OAUTH === '1';

/**
 * Expose hub mode flag to the client. Make sure to set NEXT_PUBLIC_HUB_MODE
 * alongside HUB_MODE in the environment.
 */
export const PUBLIC_HUB_MODE =
  typeof process.env.NEXT_PUBLIC_HUB_MODE !== 'undefined'
    ? process.env.NEXT_PUBLIC_HUB_MODE === '1'
    : HUB_MODE;

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'PLEIA';

// Playlist generation feature flags
// Por defecto TODO ACTIVADO; solo se desactiva si se pone explícitamente a '0'
const flag = (envKey: string) => {
  const v = process.env[envKey];
  if (v === '0') return false;
  if (v === '1') return true;
  // default: on
  return true;
};

export const FEATURE_ARTIST_DEDUP_CAP = flag('FEATURE_ARTIST_DEDUP_CAP');
export const FEATURE_MULTI_ARTIST_STYLE = flag('FEATURE_MULTI_ARTIST_STYLE');
export const FEATURE_COMPOSITE_NAME_SEARCH = flag('FEATURE_COMPOSITE_NAME_SEARCH');
export const FEATURE_INTERPRETIVE_FALLBACKS = flag('FEATURE_INTERPRETIVE_FALLBACKS');

