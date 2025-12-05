import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { usePleiaSession } from '../auth/usePleiaSession';

const FRIENDS_NOTIFICATIONS_KEY = 'pleia_friends_notifications_seen';
const FRIENDS_LAST_VISIT_KEY = 'pleia_friends_last_visit';

type FriendsData = {
  success: boolean;
  friends: Array<{ friendId: string; createdAt: string }>;
  requests: {
    incoming: Array<{ requestId: string; createdAt: string }>;
    outgoing: Array<{ requestId: string; createdAt: string; status?: string }>;
  };
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

/**
 * Hook para obtener el número de novedades en amigos
 * Novedades = solicitudes entrantes + solicitudes aceptadas recientes (después de la última visita)
 */
export function useFriendsNotifications() {
  const { data: session } = usePleiaSession();
  const { data, error, isLoading } = useSWR<FriendsData>(
    session?.user ? '/api/social/friends/list' : null,
    fetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 30000, // Revalidar cada 30 segundos
    }
  );

  const [notificationsCount, setNotificationsCount] = useState(0);

  useEffect(() => {
    if (!data || !session?.user) {
      console.log('[FRIENDS-NOTIF] No data or session, setting count to 0');
      setNotificationsCount(0);
      return;
    }

    // Obtener solicitudes vistas y última visita
    const seenRequests = JSON.parse(
      localStorage.getItem(FRIENDS_NOTIFICATIONS_KEY) || '[]'
    ) as string[];
    const lastVisit = localStorage.getItem(FRIENDS_LAST_VISIT_KEY);
    const lastVisitTime = lastVisit ? new Date(lastVisit).getTime() : 0;

    console.log('[FRIENDS-NOTIF] Calculating notifications:', {
      incomingCount: data.requests.incoming?.length || 0,
      outgoingCount: data.requests.outgoing?.length || 0,
      friendsCount: data.friends?.length || 0,
      seenRequestsCount: seenRequests.length,
      lastVisit: lastVisit || 'never'
    });

    let count = 0;

    // Contar solicitudes entrantes no vistas
    const incomingNotSeen = (data.requests.incoming || []).filter(
      (req) => !seenRequests.includes(req.requestId)
    );
    count += incomingNotSeen.length;
    console.log('[FRIENDS-NOTIF] Incoming not seen:', incomingNotSeen.length);

    // Contar solicitudes aceptadas recientes (solo las que fueron aceptadas después de la última visita)
    // Necesitamos verificar cuándo se aceptó, no cuándo se creó la solicitud
    // Por ahora, contamos todas las aceptadas que no hemos visto
    const acceptedNotSeen = (data.requests.outgoing || []).filter(
      (req) => {
        if (req.status !== 'accepted') return false;
        // Si no está en la lista de vistas, es nueva
        return !seenRequests.includes(req.requestId);
      }
    );
    count += acceptedNotSeen.length;
    console.log('[FRIENDS-NOTIF] Accepted not seen:', acceptedNotSeen.length);

    // También contar nuevos amigos (amistades creadas después de la última visita)
    const newFriends = (data.friends || []).filter((friend) => {
      const createdAt = new Date(friend.createdAt).getTime();
      // Amigo nuevo si se creó después de la última visita Y no lo hemos visto
      return createdAt > lastVisitTime && !seenRequests.includes(friend.friendId);
    });
    count += newFriends.length;
    console.log('[FRIENDS-NOTIF] New friends:', newFriends.length);

    console.log('[FRIENDS-NOTIF] Total notifications count:', count);
    setNotificationsCount(count);
  }, [data, session?.user]);

  return {
    count: notificationsCount,
    isLoading,
    error,
  };
}

/**
 * Marca las solicitudes como vistas
 */
export function markFriendsNotificationsAsSeen(
  incomingRequestIds: string[],
  outgoingRequestIds: string[],
  friendIds: string[]
) {
  const seenRequests = JSON.parse(
    localStorage.getItem(FRIENDS_NOTIFICATIONS_KEY) || '[]'
  ) as string[];
  
  const allIds = [...incomingRequestIds, ...outgoingRequestIds, ...friendIds];
  const newSeen = Array.from(new Set([...seenRequests, ...allIds]));
  
  localStorage.setItem(FRIENDS_NOTIFICATIONS_KEY, JSON.stringify(newSeen));
  localStorage.setItem(FRIENDS_LAST_VISIT_KEY, new Date().toISOString());
}

/**
 * Verifica si una solicitud/amigo es nuevo (no visto)
 */
export function isNewNotification(id: string): boolean {
  const seenRequests = JSON.parse(
    localStorage.getItem(FRIENDS_NOTIFICATIONS_KEY) || '[]'
  ) as string[];
  return !seenRequests.includes(id);
}

