"use client";

import { useState, useEffect, useCallback } from 'react';
import { usePleiaSession } from '../../lib/auth/usePleiaSession';
import { useAuthActions } from '../../lib/auth/clientActions';
import ReferralModule from '../components/ReferralModule';
import { useProfile } from '../../lib/useProfile';

export default function ProfilePage() {
  const { data: session, status } = usePleiaSession();
  const { login, logout } = useAuthActions();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    displayName: '',
    username: '',
    bio: '',
    image: ''
  });
  const [usernameAvailable, setUsernameAvailable] = useState(true);
  const [usernameDebounceTimer, setUsernameDebounceTimer] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const { isFounder, founderSince } = useProfile();

  // Simple localStorage loader
  const loadFromLocalStorage = () => {
    if (session?.user?.email) {
      const localKey = `jey_user_profile:${session.user.email}`;
      const localProfile = JSON.parse(localStorage.getItem(localKey) || 'null');
      console.log('[PROFILE] Simple loader - localStorage data:', localProfile);
      
      if (localProfile) {
        console.log('[PROFILE] Simple loader - found profile, updating formData');
        setFormData({
          displayName: localProfile.displayName || session.user.name || '',
          username: localProfile.username || session.user.email.split('@')[0],
          bio: localProfile.bio || '',
          image: localProfile.image || session.user.image || ''
        });
        setProfile(localProfile);
        console.log('[PROFILE] Simple loader - bio set to:', localProfile.bio || '');
      } else {
        console.log('[PROFILE] Simple loader - no profile found, creating default');
        setFormData({
          displayName: session.user.name || session.user.email.split('@')[0],
          username: session.user.email.split('@')[0],
          bio: '',
          image: session.user.image || ''
        });
      }
    }
  };

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[PROFILE] Fetching profile for user:', session.user.email);
      const response = await fetch('/api/profile');
      const data = await response.json();
      console.log('[PROFILE] API response:', data);
      
      if (data.success) {
        // Merge with any existing local profile to avoid wiping user data when KV is empty
        const localKey = `jey_user_profile:${session.user.email}`;
        const existingLocal = JSON.parse(localStorage.getItem(localKey) || 'null');
        const mergedProfile = {
          ...data.profile,
          bio: data.profile.bio ?? existingLocal?.bio ?? '',
          displayName: data.profile.displayName ?? existingLocal?.displayName ?? '',
          username: data.profile.username ?? existingLocal?.username ?? (session.user.email?.split('@')[0] || ''),
          image: data.profile.image ?? existingLocal?.image ?? (session.user.image || '')
        };

        setProfile(mergedProfile);
        setFormData({
          displayName: mergedProfile.displayName || '',
          username: mergedProfile.username || '',
          bio: mergedProfile.bio || '',
          image: mergedProfile.image || ''
        });

        // Always keep a local copy in localStorage for quick loads
        localStorage.setItem(localKey, JSON.stringify(mergedProfile));
      } else {
        console.log('API returned error, trying localStorage fallback');
        setError(data.error || 'Failed to load profile');
        
        // Try localStorage fallback even when API returns error
        const localKey = `jey_user_profile:${session.user.email}`;
        console.log('[PROFILE] Trying localStorage fallback with key:', localKey);
        const localProfile = JSON.parse(localStorage.getItem(localKey) || 'null');
        console.log('[PROFILE] localStorage data:', localProfile);
        
        if (localProfile) {
          console.log('[PROFILE] Successfully loaded profile from localStorage:', localProfile);
          setProfile(localProfile);
          setFormData({
            displayName: localProfile.displayName || '',
            username: localProfile.username || '',
            bio: localProfile.bio || '',
            image: localProfile.image || ''
          });
          console.log('[PROFILE] Set formData bio to:', localProfile.bio || '');
          setError(null); // Clear error since we found data in localStorage
        } else {
          console.log('[PROFILE] No profile found in localStorage');
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile');
      
      // Try localStorage fallback
      const localKey = `jey_user_profile:${session.user.email}`;
      console.log('[PROFILE] Catch block - trying localStorage fallback with key:', localKey);
      const localProfile = JSON.parse(localStorage.getItem(localKey) || 'null');
      console.log('[PROFILE] Catch block - localStorage data:', localProfile);
      
      if (localProfile) {
        console.log('[PROFILE] Catch block - Successfully loaded profile from localStorage:', localProfile);
        setProfile(localProfile);
        setFormData({
          displayName: localProfile.displayName || '',
          username: localProfile.username || '',
          bio: localProfile.bio || '',
          image: localProfile.image || ''
        });
        console.log('[PROFILE] Catch block - Set formData bio to:', localProfile.bio || '');
      } else {
        console.log('[PROFILE] Catch block - No profile found in localStorage');
      }
    } finally {
      setLoading(false);
    }
  }, [session?.user?.email]);

  useEffect(() => {
    if (session?.user?.email) {
      console.log('[PROFILE] useEffect - session available, fetching from API');
      fetchProfile();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [session, status, fetchProfile]);

  // Debug formData changes
  useEffect(() => {
    console.log('[PROFILE] formData changed:', formData);
    console.log('[PROFILE] formData.bio:', formData.bio);
  }, [formData]);

  // Direct localStorage check on component mount
  useEffect(() => {
    if (session?.user?.email && !loading) {
      console.log('[PROFILE] Direct localStorage check on mount');
      const localKey = `jey_user_profile:${session.user.email}`;
      const localProfile = JSON.parse(localStorage.getItem(localKey) || 'null');
      console.log('[PROFILE] Direct check - localStorage data:', localProfile);
      
      if (localProfile && localProfile.bio && !formData.bio) {
        console.log('[PROFILE] Direct check - Setting bio from localStorage:', localProfile.bio);
        setFormData(prev => ({
          ...prev,
          bio: localProfile.bio || '',
          displayName: localProfile.displayName || prev.displayName,
          username: localProfile.username || prev.username,
          image: localProfile.image || prev.image
        }));
      }
    }
  }, [session?.user?.email, loading, formData.bio]);


  const checkUsernameAvailability = async (username) => {
    if (!username || username === profile?.username) {
      setUsernameAvailable(true);
      return;
    }
    
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          displayName: formData.displayName,
          username: username,
          bio: formData.bio,
          image: formData.image
        })
      });
      
      const data = await response.json();
      setUsernameAvailable(data.success || data.available !== false);
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameAvailable(true); // Assume available on error
    }
  };

  const handleUsernameChange = (e) => {
    const newUsername = e.target.value;
    setFormData({ ...formData, username: newUsername });
    
    // Clear existing timer
    if (usernameDebounceTimer) {
      clearTimeout(usernameDebounceTimer);
    }
    
    // Set new timer
    const timer = setTimeout(() => {
      checkUsernameAvailability(newUsername);
    }, 500);
    
    setUsernameDebounceTimer(timer);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setProfile(data.profile);
        // Always sync localStorage with latest profile
        const localKey = `jey_user_profile:${session.user.email}`;
        localStorage.setItem(localKey, JSON.stringify(data.profile));
        
        alert('Perfil guardado exitosamente');
      } else {
        setError(data.error || 'Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setError('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      
      // Limpiar localStorage de estados de auth
      try {
        localStorage.removeItem('ea_done');
        localStorage.removeItem('ea_pending');
        // Limpiar cualquier perfil local
        if (session?.user?.email) {
          const localKey = `jey_user_profile:${session.user.email}`;
          localStorage.removeItem(localKey);
        }
      } catch (e) {
        console.warn('Error clearing localStorage:', e);
      }
      
      // Llamar al endpoint de logout
      const response = await fetch('/api/auth/logout', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        // Redirigir a signout de NextAuth
        window.location.href = '/api/auth/signout?callbackUrl=/';
      } else {
        console.error('Logout failed');
        setError('Error al cerrar sesión');
      }
    } catch (error) {
      console.error('Logout error:', error);
      setError('Error al cerrar sesión');
    } finally {
      setLoggingOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeletingAccount(true);
      
      const response = await fetch('/api/profile', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        // Limpiar localStorage
        try {
          localStorage.removeItem('ea_done');
          localStorage.removeItem('ea_pending');
          if (session?.user?.email) {
            const localKey = `jey_user_profile:${session.user.email}`;
            localStorage.removeItem(localKey);
          }
        } catch (e) {
          console.warn('Error clearing localStorage:', e);
        }
        
        // Cerrar sesión y redirigir
        await logout('/');
      } else {
        const data = await response.json();
        setError(data.error || 'Error al eliminar la cuenta');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      setError('Error al eliminar la cuenta');
    } finally {
      setDeletingAccount(false);
      setShowDeleteConfirm(false);
    }
  };

  // Not authenticated
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        
        <div className="pt-12 sm:pt-20 pb-6 sm:pb-12 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8">
              <div className="text-6xl mb-4">👤</div>
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                Mi Perfil
              </h1>
              <p className="text-gray-300 text-lg">
                Inicia sesión para ver y editar tu perfil
              </p>
            </div>
            
            <button
              onClick={() => login('/')}
              className="inline-flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white font-semibold px-8 py-4 rounded-xl transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              <span className="text-xl">🎵</span>
              <span>Conectar con Spotify</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        
        <div className="pt-12 sm:pt-20 pb-6 sm:pb-12 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Cargando perfil...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error
  if (error && !profile) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        
        <div className="pt-12 sm:pt-20 pb-6 sm:pb-12 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8">
              <div className="text-6xl mb-4">⚠️</div>
              <h1 className="text-2xl font-bold mb-4 text-red-400">Error</h1>
              <p className="text-gray-300">{error}</p>
            </div>
            
            <button
              onClick={fetchProfile}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-200"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Profile form
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      
      <div className="pt-12 sm:pt-20 pb-6 sm:pb-12 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-4 sm:mb-8">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
              Mi Perfil
            </h1>
            <p className="text-gray-300 text-lg">
              Personaliza tu perfil público y cómo apareces en las playlists trending
            </p>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-6">
            {/* Current Profile Preview */}
            {profile && (
              <div className="bg-gray-700/30 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">Vista previa</h3>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-cyan-500 rounded-full flex items-center justify-center">
                    {formData.image ? (
                      <img src={formData.image} alt="Profile" className="w-16 h-16 rounded-full object-cover" />
                    ) : (
                      <span className="text-white text-2xl">👤</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-white font-medium">{formData.displayName || 'Nombre no establecido'}</div>
                      {isFounder && (
                        <span 
                          className="px-2 py-1 text-xs font-semibold rounded-full"
                          style={{
                            backgroundColor: '#FF8C00',
                            color: '#0B0F14',
                            fontWeight: 700
                          }}
                        >
                          FOUNDER
                        </span>
                      )}
                    </div>
                    <div className="text-gray-400 text-sm">@{formData.username || 'username'}</div>
                    {formData.bio && (
                      <div className="text-gray-300 text-sm mt-1">{formData.bio}</div>
                    )}
                    {isFounder && (
                      <div 
                        className="text-xs mt-1"
                        style={{ color: '#FF8C00', opacity: 0.8 }}
                      >
                        Founder desde {founderSince ? new Date(founderSince).toLocaleDateString('es-ES') : 'hoy'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400">
                {error}
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Nombre para mostrar
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Escribe tu nombre público"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Username (único)
                  {!usernameAvailable && (
                    <span className="text-red-400 text-sm ml-2">✗ No disponible</span>
                  )}
                  {usernameAvailable && formData.username !== profile?.username && (
                    <span className="text-green-400 text-sm ml-2">✓ Disponible</span>
                  )}
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={handleUsernameChange}
                  placeholder="username"
                  className={`w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-1 focus:ring-green-500 transition-colors ${
                    !usernameAvailable && formData.username !== profile?.username ? 'border-red-500' : 'focus:border-green-500'
                  }`}
                />
                <p className="text-gray-400 text-sm mt-1">
                  Este será tu enlace público: /u/{formData.username || 'username'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Bio (opcional)
                </label>
                <textarea
                  rows={3}
                  value={formData.bio}
                  onChange={(e) => {
                    console.log('[PROFILE] Bio onChange:', e.target.value);
                    setFormData({ ...formData, bio: e.target.value });
                  }}
                  placeholder="Cuéntanos algo sobre ti..."
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Foto de perfil (opcional)
                </label>
                <div className="space-y-3">
                  <input
                    type="url"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://ejemplo.com/mi-foto.jpg"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                  />
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          const dataUrl = reader.result?.toString() || '';
                          setFormData({ ...formData, image: dataUrl });
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="hidden"
                      id="profile-photo-file"
                    />
                    <label
                      htmlFor="profile-photo-file"
                      className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-medium px-4 py-2 rounded-lg cursor-pointer transition-colors"
                    >
                      📷 Subir desde dispositivo
                    </label>
                    {formData.image && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image: '' })}
                        className="text-sm text-gray-300 hover:text-white"
                      >
                        Quitar imagen
                      </button>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm">
                    Puedes pegar una URL o subir una imagen desde tu dispositivo (en móvil abre Fototeca).
                  </p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving || (!usernameAvailable && formData.username !== profile?.username)}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200"
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>

        {/* Referral Section */}
        <div className="mt-8 pt-8 border-t border-gray-700">
          <div className="max-w-2xl mx-auto space-y-6">
            <ReferralModule userEmail={session?.user?.email} />
          </div>
        </div>

        {/* Logout Section */}
        <div className="mt-8 pt-8 border-t border-gray-700">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Cerrar sesión */}
            <div className="bg-gray-800/50 border border-gray-600/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-300 mb-3">
                Cerrar sesión
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Cierra tu sesión actual. No se eliminarán tus datos ni playlists.
                Tendrás que volver a iniciar sesión para acceder a tus playlists y configuraciones.
              </p>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
              >
                {loggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
              </button>
            </div>

            {/* Eliminar cuenta */}
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-400 mb-3">
                ⚠️ Eliminar cuenta
              </h3>
              <p className="text-gray-300 text-sm mb-4">
                <strong>Acción irreversible:</strong> Se eliminarán permanentemente todos tus datos, 
                playlists creadas, y tu cuenta de PLEIA. Esta acción no se puede deshacer.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                >
                  Eliminar mi cuenta
                </button>
                <p className="text-xs text-gray-400">
                  Para más información sobre la eliminación de datos, visita nuestra página de 
                  <a href="/delete-data" className="text-blue-400 hover:underline ml-1">eliminación de datos</a>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de confirmación de eliminación */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-red-500/30 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-semibold text-red-400 mb-4">
                ⚠️ Confirmar eliminación de cuenta
              </h3>
              <p className="text-gray-300 mb-6">
                <strong>Esta acción es irreversible.</strong> Se eliminarán permanentemente:
              </p>
              <ul className="text-gray-300 text-sm mb-6 space-y-1">
                <li>• Tu perfil y datos personales</li>
                <li>• Todas las playlists creadas</li>
                <li>• Historial de uso y estadísticas</li>
                <li>• Acceso a tu cuenta de PLEIA</li>
              </ul>
              <p className="text-gray-400 text-sm mb-6">
                Si estás seguro, escribe <strong>&quot;ELIMINAR&quot;</strong> para confirmar:
              </p>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Escribe ELIMINAR para confirmar"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                  id="deleteConfirmInput"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const input = document.getElementById('deleteConfirmInput');
                      if (input?.value === 'ELIMINAR') {
                        handleDeleteAccount();
                      } else {
                        setError('Debes escribir &quot;ELIMINAR&quot; para confirmar');
                      }
                    }}
                    disabled={deletingAccount}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                  >
                    {deletingAccount ? 'Eliminando...' : 'Eliminar cuenta'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deletingAccount}
                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
