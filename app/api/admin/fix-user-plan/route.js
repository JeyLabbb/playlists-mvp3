import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getPleiaServerUser } from '@/lib/auth/serverUser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Endpoint para corregir inconsistencias entre Supabase y KV
 * Asegura que Supabase sea la fuente de verdad
 */
export async function POST(request) {
  try {
    // Verificar que el usuario es admin
    const adminUser = await getPleiaServerUser();
    if (!adminUser?.email || adminUser.email !== 'jeylabbb@gmail.com') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, forceToFounder } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    // 🚨 CRITICAL: Leer estado actual de Supabase (fuente de verdad)
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('id, email, plan, max_uses, is_early_founder_candidate')
      .or(`email.eq.${normalizedEmail}`)
      .maybeSingle();

    if (dbError) {
      console.error('[FIX-USER-PLAN] Error reading from Supabase:', dbError);
      return NextResponse.json({ error: 'Failed to read from Supabase', details: dbError.message }, { status: 500 });
    }

    if (!userData) {
      return NextResponse.json({ error: 'User not found in Supabase' }, { status: 404 });
    }

    const currentPlan = userData.plan || 'free';
    const currentMaxUses = userData.max_uses;
    const isFounderInSupabase = currentPlan === 'founder';
    const shouldBeFounder = isFounderInSupabase && currentMaxUses === null;

    console.log('[FIX-USER-PLAN] Current state in Supabase:', {
      email: normalizedEmail,
      plan: currentPlan,
      max_uses: currentMaxUses,
      isFounderInSupabase,
      shouldBeFounder
    });

    // 🚨 CRITICAL: Si es founder en Supabase pero max_uses no es null, corregirlo
    let corrected = false;
    let forcedToFounder = false;
    const now = new Date().toISOString();
    
    if (isFounderInSupabase && currentMaxUses !== null) {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          max_uses: null, // 🚨 CRITICAL: null = infinito para founder
          updated_at: now
        })
        .or(`email.eq.${normalizedEmail}`);

      if (updateError) {
        console.error('[FIX-USER-PLAN] Error updating max_uses:', updateError);
        return NextResponse.json({ error: 'Failed to update max_uses', details: updateError.message }, { status: 500 });
      }

      corrected = true;
      console.log('[FIX-USER-PLAN] ✅ Corrected max_uses to null for founder');
    }
    
    // 🚨 CRITICAL: Si forceToFounder es true, forzar actualización a founder en Supabase
    // (Solo usar si la UI muestra founder pero Supabase no, y quieres corregir Supabase)
    if (forceToFounder === true && !isFounderInSupabase) {
      const { error: forceError } = await supabase
        .from('users')
        .update({
          plan: 'founder',
          max_uses: null, // 🚨 CRITICAL: null = infinito
          updated_at: now
        })
        .or(`email.eq.${normalizedEmail}`);

      if (forceError) {
        console.error('[FIX-USER-PLAN] Error forcing to founder:', forceError);
        return NextResponse.json({ error: 'Failed to force to founder', details: forceError.message }, { status: 500 });
      }

      forcedToFounder = true;
      console.log('[FIX-USER-PLAN] ✅ Forced user to founder in Supabase');
    }

    // 🚨 CRITICAL: Actualizar KV con datos de Supabase (KV debe reflejar Supabase)
    try {
      const kv = await import('@vercel/kv');
      const profileKey = `jey_user_profile:${normalizedEmail}`;
      const existingProfile = await kv.kv.get(profileKey) || {};
      
      const updatedProfile = {
        ...existingProfile,
        email: normalizedEmail,
        plan: currentPlan, // 🚨 CRITICAL: Usar plan de Supabase
        isEarlyFounderCandidate: !!userData.is_early_founder_candidate,
        founderSince: isFounderInSupabase ? (existingProfile.founderSince || userData.created_at) : null,
        updatedAt: new Date().toISOString()
      };
      
      await kv.kv.set(profileKey, updatedProfile);
      console.log('[FIX-USER-PLAN] ✅ KV updated with Supabase data');
    } catch (kvError) {
      console.warn('[FIX-USER-PLAN] Failed to update KV:', kvError);
      // No fallar si KV falla, Supabase es lo importante
    }

    // Verificar estado final
    const { data: finalData } = await supabase
      .from('users')
      .select('id, email, plan, max_uses')
      .or(`email.eq.${normalizedEmail}`)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      message: forcedToFounder ? 'User plan forced to founder and synchronized' : 'User plan synchronized',
      corrected,
      forcedToFounder,
      before: {
        plan: currentPlan,
        max_uses: currentMaxUses
      },
      after: {
        plan: finalData?.plan || currentPlan,
        max_uses: finalData?.max_uses
      },
      isFounder: finalData?.plan === 'founder' && finalData?.max_uses === null
    });

  } catch (error) {
    console.error('[FIX-USER-PLAN] Error:', error);
    return NextResponse.json({ error: 'Failed to fix user plan', details: error.message }, { status: 500 });
  }
}

