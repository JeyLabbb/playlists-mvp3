"use client";

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Navigation from '../components/Navigation';

export default function ProfilePage() {
  const { data: session, status } = useSession();
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

  useEffect(() => {
    if (session?.user?.email) {
      fetchProfile();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [session, status]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/profile');
      const data = await response.json();
      
      if (data.success) {
        setProfile(data.profile);
        setFormData({
          displayName: data.profile.displayName || '',
          username: data.profile.username || '',
          bio: data.profile.bio || '',
          image: data.profile.image || ''
        });
        
        // If fallback to localStorage, save locally
        if (data.reason === 'fallback-localStorage') {
          const localKey = `jey_user_profile:${session.user.email}`;
          localStorage.setItem(localKey, JSON.stringify(data.profile));
        }
      } else {
        console.log('API returned error, trying localStorage fallback');
        setError(data.error || 'Failed to load profile');
        
        // Try localStorage fallback even when API returns error
        const localKey = `jey_user_profile:${session.user.email}`;
        const localProfile = JSON.parse(localStorage.getItem(localKey) || 'null');
        if (localProfile) {
          console.log('Loaded profile from localStorage:', localProfile);
          setProfile(localProfile);
          setFormData({
            displayName: localProfile.displayName || '',
            username: localProfile.username || '',
            bio: localProfile.bio || '',
            image: localProfile.image || ''
          });
          setError(null); // Clear error since we found data in localStorage
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile');
      
      // Try localStorage fallback
      const localKey = `jey_user_profile:${session.user.email}`;
      const localProfile = JSON.parse(localStorage.getItem(localKey) || 'null');
      if (localProfile) {
        setProfile(localProfile);
        setFormData({
          displayName: localProfile.displayName || '',
          username: localProfile.username || '',
          bio: localProfile.bio || '',
          image: localProfile.image || ''
        });
      }
    } finally {
      setLoading(false);
    }
  };

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
        
        // If fallback to localStorage, save locally
        if (data.reason === 'fallback-localStorage') {
          const localKey = `jey_user_profile:${session.user.email}`;
          localStorage.setItem(localKey, JSON.stringify(data.profile));
        }
        
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

  // Not authenticated
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <Navigation />
        
        <div className="pt-20 pb-12 px-6">
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
              onClick={() => signIn('spotify')}
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
        <Navigation />
        
        <div className="pt-20 pb-12 px-6">
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
        <Navigation />
        
        <div className="pt-20 pb-12 px-6">
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
      <Navigation />
      
      <div className="pt-20 pb-12 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
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
                    <div className="text-white font-medium">{formData.displayName || 'Nombre no establecido'}</div>
                    <div className="text-gray-400 text-sm">@{formData.username || 'username'}</div>
                    {formData.bio && (
                      <div className="text-gray-300 text-sm mt-1">{formData.bio}</div>
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
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Cuéntanos algo sobre ti..."
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Foto de perfil (opcional)
                </label>
                <input
                  type="url"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://ejemplo.com/mi-foto.jpg"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                />
                <p className="text-gray-400 text-sm mt-1">
                  URL de una imagen. Si quieres cambiar la foto de Spotify, úsala aquí.
                </p>
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
      </div>
    </div>
  );
}
