// HUB_MODE ha sido ELIMINADO COMPLETAMENTE - todas las funcionalidades están siempre activas
export const DISABLE_SPOTIFY_USER_OAUTH =
  process.env.DISABLE_SPOTIFY_USER_OAUTH === '1';

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

