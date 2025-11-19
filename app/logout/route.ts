import { NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '../../lib/supabase/routeClient';

export async function GET(request: Request) {
  const supabase = await createSupabaseRouteClient();
  await supabase.auth.signOut();

  const url = new URL(request.url);
  const redirectTo = url.searchParams.get('redirect') || '/';
  return NextResponse.redirect(new URL(redirectTo, url.origin));
}

