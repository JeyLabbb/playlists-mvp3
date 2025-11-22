import { NextResponse } from 'next/server';
import { getPleiaServerUser } from '@/lib/auth/serverUser';

// Force no caching
export const revalidate = 0;
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const pleiaUser = await getPleiaServerUser();
    
    if (!pleiaUser?.email) {
      return NextResponse.json({ 
        isFounder: false,
        plan: null,
        founderSince: null,
        email: null,
        isEarlyFounderCandidate: false
      });
    }

    // 🚨 CRITICAL: Supabase es la fuente de verdad - leer directamente de Supabase
    // KV es solo caché, pero Supabase es lo que realmente importa
    const { getSupabaseAdmin } = await import('@/lib/supabase/server');
    const supabase = getSupabaseAdmin();
    
    let userData = null;
    let isFounder = false;
    let plan = null;
    let isEarlyFounderCandidate = false;
    
    if (supabase && (pleiaUser?.id || pleiaUser?.email)) {
      try {
        // 🚨 OPTIMIZATION: Usar id primero (primary key, más rápido) si está disponible
        // Solo usar email si no hay id
        let query = supabase
          .from('users')
          .select('plan, max_uses, is_early_founder_candidate, created_at');
        
        if (pleiaUser.id) {
          query = query.eq('id', pleiaUser.id);
        } else {
          query = query.eq('email', pleiaUser.email);
        }
        
        const { data, error: dbError } = await query.maybeSingle();
        
        if (!dbError && data) {
          userData = data;
          plan = data.plan || 'free';
          isFounder = plan === 'founder';
          isEarlyFounderCandidate = !!data.is_early_founder_candidate;
          
          // 🚨 OPTIMIZATION: Corregir max_uses de forma asíncrona (no bloquear la respuesta)
          if (isFounder && data.max_uses !== null) {
            console.log('[ME] ⚠️ Found inconsistency: plan is founder but max_uses is not null, correcting asynchronously...');
            // No esperar - corregir en background para no bloquear la respuesta
            supabase
              .from('users')
              .update({
                max_uses: null,
                updated_at: new Date().toISOString()
              })
              .or(`email.eq.${pleiaUser.email},id.eq.${pleiaUser.id}`)
              .then(({ error: fixError }) => {
                if (fixError) {
                  console.error('[ME] ❌ Failed to fix max_uses:', fixError);
                } else {
                  console.log('[ME] ✅ Corrected max_uses to null for founder (async)');
                }
              })
              .catch(err => console.error('[ME] ❌ Error fixing max_uses:', err));
          }
          
          console.log('[ME] Got data from Supabase (source of truth):', { 
            email: pleiaUser.email,
            plan,
            isFounder,
            isEarlyFounderCandidate,
            max_uses: data.max_uses
          });
          
          // 🚨 CRITICAL: Actualizar KV con datos de Supabase (KV es solo caché)
          // SIEMPRE sobrescribir KV con datos de Supabase para evitar inconsistencias
          try {
            const kv = await import('@vercel/kv');
            const profileKey = `jey_user_profile:${pleiaUser.email}`;
            const existingProfile = await kv.kv.get(profileKey) || {};
            
            // 🚨 CRITICAL: Detectar si hay inconsistencia entre KV y Supabase
            if (existingProfile.plan && existingProfile.plan !== plan) {
              console.log('[ME] ⚠️ Found inconsistency between KV and Supabase:', {
                kvPlan: existingProfile.plan,
                supabasePlan: plan,
                correcting: true
              });
            }
            
            const updatedProfile = {
              ...existingProfile,
              email: pleiaUser.email,
              plan: plan, // 🚨 CRITICAL: Siempre usar plan de Supabase
              isEarlyFounderCandidate: isEarlyFounderCandidate,
              founderSince: isFounder ? (existingProfile.founderSince || data.created_at) : null,
              updatedAt: new Date().toISOString()
            };
            await kv.kv.set(profileKey, updatedProfile);
            console.log('[ME] ✅ KV updated with Supabase data (source of truth)');
          } catch (kvError) {
            console.warn('[ME] Failed to update KV:', kvError);
          }
        } else {
          console.warn('[ME] Direct DB query failed:', dbError);
        }
      } catch (error) {
        console.warn('[ME] Failed to get data from Supabase:', error);
      }
    }
    
    // Fallback a KV solo si Supabase falla
    if (!userData) {
      const kv = await import('@vercel/kv');
      const profileKey = `jey_user_profile:${pleiaUser.email}`;
      const profile = await kv.kv.get(profileKey);
      
      if (profile) {
        plan = profile.plan || 'free';
        isFounder = plan === 'founder';
        isEarlyFounderCandidate = !!profile.isEarlyFounderCandidate;
        console.log('[ME] Using KV fallback data');
      }
    }
    
    const responseData = { 
      isFounder,
      plan: plan || null,
      founderSince: isFounder ? (userData?.created_at || null) : null,
      email: pleiaUser.email,
      isEarlyFounderCandidate: isEarlyFounderCandidate === true
    };
    
    console.log('[ME] Response data:', responseData);
    
    const response = NextResponse.json(responseData);

    // Force no caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('[ME] Error:', error);
    return NextResponse.json({ 
      isFounder: false,
      plan: null,
      founderSince: null,
      email: null,
      isEarlyFounderCandidate: false,
      error: error.message
    });
  }
}