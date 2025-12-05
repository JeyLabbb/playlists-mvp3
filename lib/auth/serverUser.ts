import { createSupabaseRouteClient } from '../supabase/routeClient';

export type PleiaServerUser = {
  email: string;
  name?: string | null;
  image?: string | null;
  id?: string | null;
  source: 'supabase';
};

export async function getPleiaServerUser(): Promise<PleiaServerUser | null> {
  try {
    const supabase = await createSupabaseRouteClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      return {
        email: user.email ?? '',
        name: user.user_metadata?.full_name || user.email,
        image: user.user_metadata?.avatar_url || null,
        id: user.id,
        source: 'supabase',
      };
    }
  } catch (error) {
    console.warn('[AUTH] Supabase getUser failed:', error);
  }

  return null;
}

