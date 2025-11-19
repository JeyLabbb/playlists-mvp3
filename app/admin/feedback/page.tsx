"use client";

import { useEffect, useState } from "react";
import { usePleiaSession } from "../../../lib/auth/usePleiaSession";
import { useRouter } from "next/navigation";

interface FeedbackEntry {
  id: string;
  rating: number;
  issue: string;
  improve: string;
  consent: boolean;
  playlistId: string;
  userEmail: string;
  userId: string;
  intentPrompt: string;
  mode: string;
  createdAt: string;
  ip: string;
}

export default function AdminFeedbackPage() {
  const { data: session, status } = usePleiaSession();
  const router = useRouter();
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // Load feedback data
  useEffect(() => {
    if (status === "authenticated") {
      loadFeedback();
    }
  }, [status]);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/feedback');
      
      if (!response.ok) {
        throw new Error('Failed to load feedback');
      }
      
      const data = await response.json();
      setFeedback(data.feedback || []);
    } catch (error) {
      console.error('Error loading feedback:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-400';
    if (rating >= 3) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-black-base flex items-center justify-center">
        <div className="text-white">Cargando...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-black-base p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Panel de Feedback
          </h1>
          <p className="text-gray-text-secondary">
            Últimos 200 feedbacks recibidos
          </p>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="text-white">Cargando feedback...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6 text-red-400">
            Error: {error}
          </div>
        )}

        {!loading && !error && (
          <div className="bg-black-surface border border-gray-dark rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-dark">
                  <tr>
                    <th className="text-left p-4 text-white font-semibold">Fecha</th>
                    <th className="text-left p-4 text-white font-semibold">Rating</th>
                    <th className="text-left p-4 text-white font-semibold">Usuario</th>
                    <th className="text-left p-4 text-white font-semibold">Playlist ID</th>
                    <th className="text-left p-4 text-white font-semibold">Modo</th>
                    <th className="text-left p-4 text-white font-semibold">¿Qué no ha clavado?</th>
                    <th className="text-left p-4 text-white font-semibold">Una mejora</th>
                  </tr>
                </thead>
                <tbody>
                  {feedback.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center p-8 text-gray-text-secondary">
                        No hay feedback disponible
                      </td>
                    </tr>
                  ) : (
                    feedback.map((entry) => (
                      <tr key={entry.id} className="border-b border-gray-dark hover:bg-gray-dark/20">
                        <td className="p-4 text-gray-text-secondary text-sm">
                          {formatDate(entry.createdAt)}
                        </td>
                        <td className="p-4">
                          <span className={`font-bold text-lg ${getRatingColor(entry.rating)}`}>
                            {entry.rating}/5
                          </span>
                        </td>
                        <td className="p-4 text-white text-sm">
                          {entry.userEmail || 'anónimo'}
                        </td>
                        <td className="p-4 text-gray-text-secondary text-sm font-mono">
                          {entry.playlistId ? (
                            <a
                              href={`https://open.spotify.com/playlist/${entry.playlistId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-spotify-green hover:text-accent-cyan transition-colors"
                            >
                              {entry.playlistId}
                            </a>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td className="p-4 text-gray-text-secondary text-sm">
                          {entry.mode || 'N/A'}
                        </td>
                        <td className="p-4 text-gray-text-secondary text-sm max-w-xs">
                          <div className="truncate" title={entry.issue || 'Sin comentarios'}>
                            {entry.issue || 'Sin comentarios'}
                          </div>
                        </td>
                        <td className="p-4 text-gray-text-secondary text-sm max-w-xs">
                          <div className="truncate" title={entry.improve || 'Sin comentarios'}>
                            {entry.improve || 'Sin comentarios'}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={loadFeedback}
            className="spotify-button-secondary"
            disabled={loading}
          >
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>
      </div>
    </div>
  );
}
