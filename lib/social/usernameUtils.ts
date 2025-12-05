/**
 * Re-exporta normalizeUsername desde usernameCache para mantener compatibilidad
 * La función normalizeUsername en usernameCache.ts ya incluye la lógica de quitar el sufijo
 */
import { normalizeUsername as normalizeUsernameFromCache } from './usernameCache';
export { normalizeUsernameFromCache as normalizeUsername };

/**
 * Normaliza un username para mostrar, con fallback a email si no hay username
 */
export function getDisplayName(
  username: string | null | undefined,
  email: string | null | undefined
): string {
  const normalized = normalizeUsernameFromCache(username);
  if (normalized) return normalized;
  
  // Fallback: usar la parte local del email
  if (email) return email.split('@')[0];
  
  return 'Usuario desconocido';
}

