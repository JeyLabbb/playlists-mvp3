import { NextResponse } from 'next/server';
import { REFERRALS_ENABLED, isFounderWhitelisted, canInvite } from '@/lib/referrals';
import { getPleiaServerUser } from '@/lib/auth/serverUser';
import { getUserPlan } from '@/lib/billing/usageV2';

export async function POST(request) {
  try {
    if (!REFERRALS_ENABLED) {
      return NextResponse.json({ error: 'Referrals not enabled' }, { status: 403 });
    }

    const pleiaUser = await getPleiaServerUser();
    
    if (!pleiaUser?.email) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const { refEmail } = await request.json();
    
    if (!refEmail) {
      return NextResponse.json({ error: 'Referral email is required' }, { status: 400 });
    }

    const currentUserEmail = pleiaUser.email.toLowerCase();
    const referralEmail = refEmail.toLowerCase();

    console.log('[REF] Tracking referral:', { currentUserEmail, referralEmail });

    // Security checks
    if (currentUserEmail === referralEmail) {
      console.log('[REF] Self-referral blocked:', currentUserEmail);
      return NextResponse.json({ error: 'Cannot refer yourself' }, { status: 400 });
    }

    // 🚨 CRITICAL: Verificar si el referrer puede invitar (whitelist O early_founder_candidate)
    // Consultamos plan/flags para saber si es early-founder-candidate
    let isEarlyFounderCandidate = false;
    try {
      const planContext = await getUserPlan(referralEmail);
      isEarlyFounderCandidate = !!planContext?.isEarlyFounderCandidate;
      console.log('[REF] Referrer plan check:', {
        email: referralEmail,
        isEarlyFounderCandidate,
        planContext: planContext ? { plan: planContext.plan, isEarlyFounderCandidate: planContext.isEarlyFounderCandidate } : null,
      });
    } catch (planError) {
      console.warn('[REF] Failed to load referrer plan for tracking:', planError);
      // 🚨 CRITICAL: Si getUserPlan falla, intentar obtener el flag directamente de la BD
      try {
        const { getSupabaseAdmin } = await import('@/lib/supabase/server');
        const supabase = getSupabaseAdmin();
        const { data: userData, error: dbError } = await supabase
          .from('users')
          .select('is_early_founder_candidate')
          .or(`email.eq.${referralEmail}`)
          .maybeSingle();
        
        if (!dbError && userData) {
          isEarlyFounderCandidate = !!userData.is_early_founder_candidate;
          console.log('[REF] Direct DB check for referrer:', {
            email: referralEmail,
            isEarlyFounderCandidate,
          });
        }
      } catch (dbFallbackError) {
        console.error('[REF] Error in DB fallback for referrer:', dbFallbackError);
      }
    }

    // 🚨 CRITICAL: Usar canInvite para verificar si el referrer puede invitar
    // Esto incluye tanto whitelist como early_founder_candidate
    if (!canInvite(referralEmail, { isEarlyCandidate: isEarlyFounderCandidate })) {
      console.error('[REF] Referrer not authorized to invite:', {
        email: referralEmail,
        isEarlyFounderCandidate,
        isWhitelisted: isFounderWhitelisted(referralEmail),
        canInviteResult: canInvite(referralEmail, { isEarlyCandidate: isEarlyFounderCandidate }),
      });
      return NextResponse.json({ error: 'Referrer not authorized' }, { status: 403 });
    }

    // Only block if user is trying to refer themselves
    if (currentUserEmail === referralEmail) {
      console.log('[REF] Self-referral blocked:', currentUserEmail);
      return NextResponse.json({ error: 'Cannot refer yourself' }, { status: 400 });
    }

    // Get current user profile
    const kv = await import('@vercel/kv');
    const profileKey = `jey_user_profile:${currentUserEmail}`;
    const currentProfile = await kv.kv.get(profileKey) || {};

    // Check if user already has a referrer
    if (currentProfile.referredBy) {
      console.log('[REF] User already referred by:', currentProfile.referredBy);
      return NextResponse.json({ 
        success: true, 
        message: 'Already referred',
        referredBy: currentProfile.referredBy
      });
    }

    // Update current user profile with referrer
    const updatedProfile = {
      ...currentProfile,
      email: currentUserEmail,
      referredBy: referralEmail,
      updatedAt: new Date().toISOString()
    };

    await kv.kv.set(profileKey, updatedProfile);
    console.log('[REF] User referred successfully:', { currentUserEmail, referredBy: referralEmail });

    // 🚨 CRITICAL: Actualizar el contador del referrer cuando el usuario se registra
    // Esto cuenta como un referido cualificado (cuenta creada)
    try {
      const { REF_REQUIRED_COUNT } = await import('@/lib/referrals');
      const { setUserPlan } = await import('@/lib/billing/usage');
      
      const referrerProfileKey = `jey_user_profile:${referralEmail}`;
      const referrerProfile = await kv.kv.get(referrerProfileKey) || {};
      
      // Actualizar stats del referrer
      const referredQualifiedCount = (referrerProfile.referredQualifiedCount || 0) + 1;
      const referrals = referrerProfile.referrals || [];
      
      // Añadir usuario actual a la lista de referidos si no está ya
      if (!referrals.includes(currentUserEmail)) {
        referrals.push(currentUserEmail);
      }

      const updatedReferrerProfile = {
        ...referrerProfile,
        email: referralEmail,
        referrals,
        referredQualifiedCount,
        updatedAt: new Date().toISOString()
      };

      // 🚨 CRITICAL: Verificar si el referrer debe ser actualizado a founder
      // Verificar tanto en KV como en Supabase para asegurar que se actualice correctamente
      let upgradedToFounder = false;
      let needsUpgrade = false;
      
      // Verificar plan en Supabase también, no solo en KV
      let currentPlanInSupabase = null;
      try {
        const { getUserPlan } = await import('@/lib/billing/usageV2');
        const planContext = await getUserPlan(referralEmail);
        currentPlanInSupabase = planContext?.plan || null;
        console.log('[REF] Current plan in Supabase for referrer:', {
          email: referralEmail,
          plan: currentPlanInSupabase,
          planInKV: referrerProfile.plan
        });
      } catch (planCheckError) {
        console.warn('[REF] Could not check plan in Supabase, will try to update anyway:', planCheckError);
      }
      
      // Si tiene 3/3 y NO es founder en KV o en Supabase, necesita upgrade
      if (referredQualifiedCount >= REF_REQUIRED_COUNT) {
        needsUpgrade = referrerProfile.plan !== 'founder' || currentPlanInSupabase !== 'founder';
      }
      
      if (needsUpgrade) {
        const now = new Date().toISOString();
        updatedReferrerProfile.plan = 'founder';
        updatedReferrerProfile.founderSince = now;
        upgradedToFounder = true;
        console.log('[REF] 🎉 Referrer reached 3/3 referidos! Upgrading to founder:', referralEmail);

          // 🚨 CRITICAL: Actualizar plan en Supabase automáticamente
          // HACER ACTUALIZACIÓN DIRECTA PRIMERO (más confiable que setUserPlan)
          try {
            const { getSupabaseAdmin } = await import('@/lib/supabase/server');
            const supabaseAdmin = getSupabaseAdmin();
            
            // 🚨 CRITICAL: Actualización directa de 'plan', 'max_uses', 'updated_at' y 'founder_source'
            // 🚨 OPTIMIZATION: Usar email directamente (no tenemos id del referrer)
            const { error: updateError } = await supabaseAdmin
              .from('users')
              .update({
                plan: 'founder',
                max_uses: null, // 🚨 CRITICAL: null = infinito
                updated_at: now,
                // 🚨 NEW: Marcar que el founder se obtuvo mediante referidos
                founder_source: 'referral' // 'purchase' o 'referral'
              })
              .eq('email', referralEmail); // 🚨 OPTIMIZATION: Usar eq en lugar de or cuando solo hay email
            
            if (updateError) {
              console.error('[REF] ❌ Direct update failed:', updateError);
              throw updateError;
            }
            
            // 🚨 OPTIMIZATION: Reducir delay - Supabase es rápido
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 🚨 OPTIMIZATION: Usar eq directamente (más rápido que or)
            const { data: afterUpdate, error: selectError } = await supabaseAdmin
              .from('users')
              .select('id, email, plan, max_uses')
              .eq('email', referralEmail) // 🚨 OPTIMIZATION: Usar eq en lugar de or
              .maybeSingle();
            
            console.log('[REF] State AFTER update:', {
              email: referralEmail,
              planAfter: afterUpdate?.plan,
              max_usesAfter: afterUpdate?.max_uses,
              selectError: selectError?.message
            });
            
            if (afterUpdate?.plan === 'founder' && afterUpdate?.max_uses === null) {
              console.log('[REF] ✅ Successfully updated plan to founder in Supabase (verified):', {
                email: referralEmail,
                plan: afterUpdate.plan,
                max_uses: afterUpdate.max_uses
              });
              
              // 🚨 CRITICAL: Actualizar KV DESPUÉS de Supabase (KV es solo caché, Supabase es la fuente de verdad)
              await kv.kv.set(referrerProfileKey, updatedReferrerProfile);
              console.log('[REF] ✅ KV updated after Supabase update');
              
              // 🚨 CRITICAL: SOLO ENVIAR EMAIL DESPUÉS de verificar que Supabase se actualizó correctamente
              try {
                const { sendFounderWelcomeEmail } = await import('@/lib/newsletter/workflows');
                const emailSent = await sendFounderWelcomeEmail(referralEmail, {
                  origin: 'referral_founder_upgrade'
                });
                
                if (emailSent) {
                  console.log('[REF] ✅ Founder welcome email sent to:', referralEmail);
                } else {
                  console.warn('[REF] ⚠️ Failed to send founder welcome email to:', referralEmail);
                }
              } catch (emailError) {
                console.error('[REF] ❌ Error sending founder welcome email:', emailError);
                // No fallar el upgrade si falla el email
              }
            } else {
              console.error('[REF] ❌ Plan not updated correctly in Supabase! Still:', {
                plan: afterUpdate?.plan,
                max_uses: afterUpdate?.max_uses
              });
              throw new Error('Plan update verification failed - Supabase not updated');
            }
          } catch (planError) {
            console.error('[REF] ❌ Error updating plan to founder in Supabase:', planError);
            // No fallar silenciosamente - el error ya se logueó
          }
      }

      // 🚨 CRITICAL: NO actualizar KV aquí si se hizo upgrade - ya se actualizó después de Supabase
      // Solo actualizar KV si NO se hizo upgrade
      if (!upgradedToFounder) {
        await kv.kv.set(referrerProfileKey, updatedReferrerProfile);
        console.log('[REF] Referrer stats updated in KV (no upgrade):', { 
          referrerEmail: referralEmail, 
          referredQualifiedCount,
          newUser: currentUserEmail
        });
      } else {
        console.log('[REF] Referrer stats - KV already updated after Supabase upgrade');
      }

      // 🚨 CRITICAL: Retornar información sobre el upgrade para que el cliente pueda mostrar el mensaje
      return NextResponse.json({ 
        success: true, 
        message: 'Referral tracked successfully',
        referredBy: referralEmail,
        upgradedToFounder, // 🚨 CRITICAL: Informar si el referrer fue actualizado a founder
        qualifiedCount: referredQualifiedCount,
        reachedLimit: referredQualifiedCount >= REF_REQUIRED_COUNT
      });
    } catch (referrerUpdateError) {
      console.error('[REF] Error updating referrer stats on account creation:', referrerUpdateError);
      // No fallar el tracking si falla la actualización del referrer
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Referral tracked successfully',
      referredBy: referralEmail
    });

  } catch (error) {
    console.error('[REF] Error tracking referral:', error);
    return NextResponse.json({ error: 'Failed to track referral' }, { status: 500 });
  }
}
