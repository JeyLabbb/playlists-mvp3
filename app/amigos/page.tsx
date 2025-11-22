"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { usePleiaSession } from "../../lib/auth/usePleiaSession";
import { useAuthActions } from "../../lib/auth/clientActions";
import { normalizeUsername, getDisplayName } from "../../lib/social/usernameUtils";
import { markFriendsNotificationsAsSeen, isNewNotification } from "../../lib/hooks/useFriendsNotifications";

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return res.json();
};

type FriendEntry = {
  friendId: string;
  createdAt: string;
  email?: string | null;
  username?: string | null;
  plan?: string | null;
  lastActivity?: string | null;
};

type RequestEntry = {
  requestId: string;
  senderId?: string;
  receiverId?: string;
  email?: string | null;
  username?: string | null;
  createdAt: string;
  status?: string;
};

export default function FriendsPage() {
  const { data: session, status } = usePleiaSession();
  const { login } = useAuthActions();
  const router = useRouter();

  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean;
    friends: FriendEntry[];
    requests: {
      incoming: RequestEntry[];
      outgoing: RequestEntry[];
    };
  }>(session?.user ? "/api/social/friends/list" : null, fetcher, {
    revalidateOnFocus: true,
  });

  const [searchValue, setSearchValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const hasFriends = data?.friends?.length ?? 0;
  const hasIncoming = data?.requests?.incoming?.length ?? 0;
  const hasOutgoing = data?.requests?.outgoing?.length ?? 0;

  // 🚨 CRITICAL: Marcar todas las notificaciones como vistas cuando se entra a la página
  useEffect(() => {
    if (data && session?.user) {
      const incomingIds = (data.requests.incoming || []).map(req => req.requestId);
      const outgoingIds = (data.requests.outgoing || []).map(req => req.requestId);
      const friendIds = (data.friends || []).map(friend => friend.friendId);
      
      console.log('[AMIGOS] Marking notifications as seen:', {
        incoming: incomingIds.length,
        outgoing: outgoingIds.length,
        friends: friendIds.length
      });
      
      markFriendsNotificationsAsSeen(incomingIds, outgoingIds, friendIds);
    }
  }, [data, session?.user]);

  const handleSendRequest = async () => {
    if (!searchValue.trim()) return;
    setIsSubmitting(true);
    setSubmitMessage(null);
    try {
      const trimmed = searchValue.trim();
      const includesEmail = trimmed.includes('@');
      const payload: Record<string, any> = {};
      if (includesEmail) {
        payload.friendEmail = trimmed;
      } else {
        payload.username = trimmed;
      }

      const res = await fetch("/api/social/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "No se pudo enviar la solicitud");
      }
      setSubmitMessage("Solicitud enviada correctamente");
      setSearchValue("");
      mutate();
    } catch (err: any) {
      setSubmitMessage(err.message || "Error al enviar la solicitud");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRespond = async (requestId: string, action: "accept" | "decline") => {
    try {
      const res = await fetch("/api/social/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ requestId, action }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "No se pudo actualizar la solicitud");
      }
      mutate();
    } catch (err) {
      console.error("[SOCIAL] respond error:", err);
    }
  };

  const handleRemoveFriend = async (friendId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevenir que se active el click del perfil
    if (!confirm("¿Estás seguro de que quieres eliminar a este amigo?")) {
      return;
    }
    
    try {
      const res = await fetch(`/api/social/friends/remove?friendId=${friendId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "No se pudo eliminar el amigo");
      }
      mutate();
    } catch (err: any) {
      console.error("[SOCIAL] remove friend error:", err);
      alert(err.message || "Error al eliminar el amigo");
    }
  };

  const handleViewProfile = (friend: FriendEntry) => {
    const username = normalizeUsername(friend.username);
    if (username) {
      router.push(`/u/${username}`);
    } else if (friend.email) {
      // Si no hay username, intentar usar el email (aunque no es ideal)
      router.push(`/u/${friend.email.split('@')[0]}`);
    }
  };

  const sortedFriends = useMemo(() => {
    if (!data?.friends) return [];
    return [...data.friends].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [data?.friends]);

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="animate-spin h-10 w-10 border-b-2 border-cyan-400 mx-auto rounded-full"></div>
          <p className="text-gray-400 text-sm">Cargando tus amistades...</p>
        </div>
      </main>
    );
  }

  if (!session?.user) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Comunidad social
          </h1>
          <p className="text-gray-400 text-lg max-w-md mx-auto">
            Inicia sesión para descubrir qué están escuchando tus amigos, compartir playlists y chatear.
          </p>
          <button
            onClick={() => login("/amigos")}
            className="inline-flex items-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold px-8 py-4 rounded-xl transition shadow-lg"
          >
            <span className="text-lg">🔑</span>
            <span>Iniciar sesión</span>
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      <section className="max-w-6xl mx-auto px-6 py-16 space-y-10">
        <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-500 mb-2">PLEIA Social</p>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Tus amigos, tu música
            </h1>
            <p className="mt-3 text-gray-400 max-w-2xl">
              Gestiona solicitudes, descubre lo que escuchan tus amistades y comparte playlists creadas con la IA.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 bg-gray-900/60 border border-gray-700/60 rounded-2xl px-6 py-5 backdrop-blur">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-emerald-300">{hasFriends}</div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Amigos</p>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-cyan-300">{hasIncoming}</div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Solicitudes</p>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-purple-300">{hasOutgoing}</div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Pendientes</p>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-900/60 border border-gray-700/60 rounded-2xl p-6 backdrop-blur">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Añadir amigos</h2>
                  <p className="text-sm text-gray-400">
                    Envía una solicitud con el email registrado en PLEIA. También puedes aceptar peticiones pendientes.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="amigo@correo.com"
                  className="flex-1 rounded-xl bg-gray-950/80 border border-gray-700 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                />
                <button
                  onClick={handleSendRequest}
                  disabled={isSubmitting || !searchValue.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-semibold px-5 py-3 disabled:opacity-60 transition-colors"
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar solicitud'}
                </button>
              </div>
              {submitMessage && (
                <p className="mt-3 text-sm text-emerald-300/80">{submitMessage}</p>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="bg-gray-900/60 border border-gray-700/60 rounded-2xl p-6 space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="text-emerald-300 text-xl">📥</span>
                  Solicitudes entrantes
                </h3>
                {data?.requests?.incoming?.length ? (
                  <ul className="space-y-3">
                    {data.requests.incoming.map((req) => {
                      const isNew = isNewNotification(req.requestId);
                      return (
                      <li key={req.requestId} className={`border rounded-xl p-4 ${isNew ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-gray-800 bg-gray-950/60'}`}>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            {isNew && (
                              <span className="inline-block mb-1 px-2 py-0.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 rounded-full border border-emerald-500/30">
                                NEW
                              </span>
                            )}
                            <p className="font-medium text-white">
                              {(() => {
                                const displayName = getDisplayName(req.username, req.email);
                                const normalizedUsername = normalizeUsername(req.username);
                                return normalizedUsername ? (
                                  <span className="flex items-center gap-2">
                                    <span>@{normalizedUsername}</span>
                                    {req.email && (
                                      <span className="text-xs text-gray-500">({req.email})</span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 italic">{displayName}</span>
                                );
                              })()}
                            </p>
                            <p className="text-xs text-gray-500">
                              Desde {new Date(req.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRespond(req.requestId, "accept")}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black text-xs font-semibold hover:bg-emerald-400"
                            >
                              Aceptar
                            </button>
                            <button
                              onClick={() => handleRespond(req.requestId, "decline")}
                              className="px-3 py-1.5 rounded-lg border border-gray-700 text-xs font-semibold text-gray-200 hover:bg-gray-800"
                            >
                              Rechazar
                            </button>
                          </div>
                        </div>
                      </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No tienes nuevas solicitudes.</p>
                )}
              </div>

              <div className="bg-gray-900/60 border border-gray-700/60 rounded-2xl p-6 space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="text-cyan-300 text-xl">📤</span>
                  Solicitudes enviadas
                </h3>
                {data?.requests?.outgoing?.length ? (
                  <ul className="space-y-3">
                    {data.requests.outgoing.map((req) => {
                      const isNew = req.status === 'accepted' && isNewNotification(req.requestId);
                      return (
                      <li key={req.requestId} className={`border rounded-xl p-4 ${isNew ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-gray-800 bg-gray-950/60'}`}>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            {isNew && (
                              <span className="inline-block mb-1 px-2 py-0.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 rounded-full border border-emerald-500/30">
                                NEW
                              </span>
                            )}
                            <p className="font-medium text-white">
                              {(() => {
                                const displayName = getDisplayName(req.username, req.email);
                                const normalizedUsername = normalizeUsername(req.username);
                                return normalizedUsername ? (
                                  <span className="flex items-center gap-2">
                                    <span>@{normalizedUsername}</span>
                                    {req.email && (
                                      <span className="text-xs text-gray-500">({req.email})</span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 italic">{displayName}</span>
                                );
                              })()}
                            </p>
                            <p className="text-xs text-gray-500">
                              Estado: {req.status === 'accepted' ? 'Aceptada' : req.status === 'declined' ? 'Declinada' : 'Pendiente'}
                            </p>
                          </div>
                        </div>
                      </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No tienes solicitudes pendientes.</p>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="bg-gray-900/60 border border-gray-700/60 rounded-2xl p-6 backdrop-blur space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="text-purple-300 text-xl">🤝</span>
                Tus amigos
              </h2>

              {isLoading ? (
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <div className="animate-spin h-5 w-5 border-b-2 border-purple-400 rounded-full" />
                  Cargando lista...
                </div>
              ) : error ? (
                <p className="text-sm text-red-400">
                  Error cargando tus amistades. Inténtalo más tarde.
                </p>
              ) : sortedFriends.length ? (
                <ul className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {sortedFriends.map((friend) => {
                    const isNew = isNewNotification(friend.friendId);
                    const normalizedUsername = normalizeUsername(friend.username);
                    const displayName = normalizedUsername 
                      ? `@${normalizedUsername}` 
                      : getDisplayName(friend.username, friend.email);
                    
                    return (
                    <li
                      key={friend.friendId}
                      className={`border rounded-xl p-4 cursor-pointer transition-all hover:bg-gray-900/50 ${isNew ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-gray-800 bg-gray-950/50'}`}
                      onClick={() => handleViewProfile(friend)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1">
                          {isNew && (
                            <span className="inline-block mb-1 px-2 py-0.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 rounded-full border border-emerald-500/30">
                              NEW
                            </span>
                          )}
                          <p className="font-semibold text-white hover:text-emerald-400 transition-colors">
                            {displayName}
                          </p>
                          <p className="text-xs text-gray-500">
                            Amigos desde {new Date(friend.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs uppercase tracking-wide text-emerald-300/80 border border-emerald-500/30 rounded-full px-3 py-1">
                            {friend.plan || 'free'}
                          </span>
                          <button
                            onClick={(e) => handleRemoveFriend(friend.friendId, e)}
                            className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/30 border border-red-500/30 transition-colors"
                            title="Eliminar amigo"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">
                  Aún no tienes amigos. ¡Empieza enviando invitaciones!
                </p>
              )}
            </div>

            <div className="bg-gray-900/60 border border-gray-700/60 rounded-2xl p-6 backdrop-blur space-y-3">
              <h3 className="text-base font-semibold flex items-center gap-2 text-gray-200">
                <span className="text-cyan-300 text-lg">💡</span>
                Sugerencias
              </h3>
              <ul className="text-sm text-gray-400 space-y-2">
                <li>• Comparte una playlist y etiquétala como “Sólo amigos”.</li>
                <li>• Pronto podrás chatear y descubrir qué pistas están generando.</li>
                <li>• Cuantas más playlists públicas tengas, más fácil será que te encuentren.</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

