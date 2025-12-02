import { getServerSession } from 'next-auth';

// Sesión mock para desarrollo local
const MOCK_SESSION = {
  user: {
    name: 'Jorge JR',
    email: 'jorgejr200419@gmail.com',
    image: null,
  },
  expires: '2099-12-31T23:59:59.999Z', // Nunca expira en desarrollo
};

/**
 * Helper para obtener la sesión del usuario.
 * En desarrollo (localhost), retorna una sesión mock automáticamente.
 * En producción, usa NextAuth normalmente.
 */
export async function getSession() {
  // Verificar si estamos en desarrollo
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    // En desarrollo, retornar sesión mock automáticamente
    console.log('🔓 [DEV] Usando sesión mock:', MOCK_SESSION.user.email);
    return MOCK_SESSION;
  }
  
  // En producción, usar NextAuth normalmente
  return await getServerSession();
}

/**
 * Obtener el email del usuario actual.
 * En desarrollo retorna el email mock.
 */
export async function getCurrentUserEmail(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.email || null;
}

/**
 * Verificar si el usuario está autenticado.
 * En desarrollo siempre retorna true.
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session?.user;
}

