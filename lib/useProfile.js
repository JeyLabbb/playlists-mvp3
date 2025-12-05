import useSWR from 'swr';

const fetcher = (url) => fetch(url).then((res) => res.json());

export function useProfile() {
  const { data, error, isLoading, mutate } = useSWR('/api/me', fetcher, {
    revalidateOnFocus: false, // 🚨 OPTIMIZATION: Desactivar revalidación al enfocar para mejor rendimiento
    dedupingInterval: 5000, // 🚨 OPTIMIZATION: Cachear por 5 segundos para evitar peticiones duplicadas
    refreshInterval: 0,
    errorRetryCount: 2, // 🚨 OPTIMIZATION: Reducir reintentos para fallar más rápido
    errorRetryInterval: 500, // 🚨 OPTIMIZATION: Reintentar más rápido
    keepPreviousData: true, // 🚨 OPTIMIZATION: Mantener datos anteriores mientras carga
  });

  return {
    isFounder: data?.isFounder || false,
    plan: data?.plan || null,
    founderSince: data?.founderSince || null,
    email: data?.email || null,
    isEarlyFounderCandidate: data?.isEarlyFounderCandidate === true, // 🚨 CRITICAL: Exponer flag de early founder candidate
    loading: isLoading,
    error: error,
    mutate: mutate,
    data: data,
    ready: !isLoading && !!data, // 🚨 CRITICAL: Exponer flag de ready para evitar bloqueos en la UI
  };
}

