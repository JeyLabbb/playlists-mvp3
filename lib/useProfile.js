import useSWR from 'swr';

const fetcher = (url) => fetch(url).then((res) => res.json());

export function useProfile() {
  const { data, error, isLoading, mutate } = useSWR('/api/me', fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 0,
    refreshInterval: 0,
    errorRetryCount: 3,
    errorRetryInterval: 1000,
  });

  return {
    isFounder: data?.isFounder || false,
    plan: data?.plan || null,
    founderSince: data?.founderSince || null,
    email: data?.email || null,
    loading: isLoading,
    error: error,
    mutate: mutate,
    data: data
  };
}

