import { getSupabaseAdmin } from '@/lib/supabase/server';
import { createSupabaseRouteClient } from '@/lib/supabase/routeClient';

export async function getNewsletterAdminClient() {
  const supabase = getSupabaseAdmin() ?? (await createSupabaseRouteClient());
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }
  return supabase;
}

export async function ensureContactByEmail(
  supabase: Awaited<ReturnType<typeof createSupabaseRouteClient>> | ReturnType<typeof getSupabaseAdmin>,
  email: string,
  defaults: { name?: string; origin?: string } = {},
) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    throw new Error('Email requerido');
  }

  const existing = await supabase
    .from('newsletter_contacts')
    .select('*')
    .eq('email', normalized)
    .maybeSingle();

  if (existing.data) {
    return existing.data;
  }

  const { data, error } = await supabase
    .from('newsletter_contacts')
    .insert({
      email: normalized,
      name: defaults.name ?? null,
      origin: defaults.origin ?? 'manual',
      status: 'subscribed',
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function assignContactToGroups(
  supabase: Awaited<ReturnType<typeof createSupabaseRouteClient>> | ReturnType<typeof getSupabaseAdmin>,
  contactId: string,
  groupIds: string[],
) {
  if (!groupIds?.length) {
    return;
  }

  const rows = groupIds.map((groupId) => ({
    contact_id: contactId,
    group_id: groupId,
  }));

  await supabase.from('newsletter_contact_groups').upsert(rows, { onConflict: 'contact_id,group_id' });
}

export async function replaceContactGroups(
  supabase: Awaited<ReturnType<typeof createSupabaseRouteClient>> | ReturnType<typeof getSupabaseAdmin>,
  contactId: string,
  groupIds: string[],
) {
  await supabase.from('newsletter_contact_groups').delete().eq('contact_id', contactId);
  if (groupIds?.length) {
    await assignContactToGroups(supabase, contactId, groupIds);
  }
}

export async function removeContactFromGroups(
  supabase: Awaited<ReturnType<typeof createSupabaseRouteClient>> | ReturnType<typeof getSupabaseAdmin>,
  contactId: string,
  groupIds: string[],
) {
  if (!groupIds?.length) return;
  await supabase
    .from('newsletter_contact_groups')
    .delete()
    .eq('contact_id', contactId)
    .in('group_id', groupIds);
}

export async function getContactById(
  supabase: Awaited<ReturnType<typeof createSupabaseRouteClient>> | ReturnType<typeof getSupabaseAdmin>,
  contactId: string,
) {
  const { data, error } = await supabase
    .from('newsletter_contacts')
    .select('*')
    .eq('id', contactId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

