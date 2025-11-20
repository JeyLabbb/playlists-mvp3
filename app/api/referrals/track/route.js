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
    const profileKey = `userprofile:${currentUserEmail}`;
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
      
      const referrerProfileKey = `userprofile:${referralEmail}`;
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
        try {
          // Verificar estado antes del update
          const { getSupabaseAdmin } = await import('@/lib/supabase/server');
          const supabaseAdmin = getSupabaseAdmin();
          
          const { data: beforeUpdate } = await supabaseAdmin
            .from('users')
            .select('id, email, plan, is_founder')
            .or(`email.eq.${referralEmail}`)
            .maybeSingle();
          
          console.log('[REF] State BEFORE update:', {
            email: referralEmail,
            planBefore: beforeUpdate?.plan,
            is_founderBefore: beforeUpdate?.is_founder
          });
          
          const planResult = await setUserPlan(referralEmail, 'founder', {
            isFounder: true,
            since: now
          });
          
          console.log('[REF] setUserPlan result:', planResult);
          
          let planUpdated = false;
          
          if (planResult?.ok) {
            // Verificar que realmente se actualizó
            await new Promise(resolve => setTimeout(resolve, 200));
            
            const { data: afterUpdate, error: selectError } = await supabaseAdmin
              .from('users')
              .select('id, email, plan, is_founder, max_uses')
              .or(`email.eq.${referralEmail}`)
              .maybeSingle();
            
            console.log('[REF] State AFTER update:', {
              email: referralEmail,
              planAfter: afterUpdate?.plan,
              is_founderAfter: afterUpdate?.is_founder,
              selectError: selectError?.message
            });
            
            if (afterUpdate?.plan === 'founder') {
              planUpdated = true;
              console.log('[REF] ✅ Successfully updated plan to founder in Supabase (verified)');
            } else {
              console.error('[REF] ❌ Plan not updated! Still:', afterUpdate?.plan);
              // Fallback: actualización directa de 'plan', 'max_uses' y 'updated_at'
              const { error: directError } = await supabaseAdmin
                .from('users')
                .update({
                  plan: 'founder',
                  max_uses: null,
                  updated_at: now
                })
                .or(`email.eq.${referralEmail}`);
              
              if (directError) {
                console.error('[REF] ❌ Direct update failed:', directError);
              } else {
                console.log('[REF] ✅ Direct update succeeded (fallback)');
                planUpdated = true;
              }
            }
          } else {
            console.error('[REF] ❌ setUserPlan failed:', planResult?.reason);
            // Fallback: actualización directa de 'plan', 'max_uses' y 'updated_at'
            try {
              const { error: directError } = await supabaseAdmin
                .from('users')
                .update({
                  plan: 'founder',
                  max_uses: null,
                  updated_at: now
                })
                .or(`email.eq.${referralEmail}`);
              
              if (directError) {
                console.error('[REF] ❌ Direct update failed:', directError);
              } else {
                console.log('[REF] ✅ Direct update succeeded (fallback)');
                planUpdated = true;
              }
            } catch (fallbackError) {
              console.error('[REF] ❌ Fallback update error:', fallbackError);
            }
          }
          
          // 🚨 CRITICAL: Solo enviar email si el plan se actualizó correctamente
          if (planUpdated) {
            // 🚨 CRITICAL: Enviar email de bienvenida a founder
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
          }
        } catch (planError) {
          console.error('[REF] ❌ Error updating plan to founder in Supabase:', planError);
          // Último recurso: actualización directa de 'plan', 'max_uses' y 'updated_at'
          try {
            const { getSupabaseAdmin } = await import('@/lib/supabase/server');
            const supabaseAdmin = getSupabaseAdmin();
            const { error: lastResortError } = await supabaseAdmin
              .from('users')
              .update({
                plan: 'founder',
                max_uses: null,
                updated_at: now
              })
              .or(`email.eq.${referralEmail}`);
            
            if (!lastResortError) {
              console.log('[REF] ✅ Last resort update succeeded');
            }
          } catch (lastError) {
            console.error('[REF] ❌ Last resort update failed:', lastError);
          }
        }
      }

      await kv.kv.set(referrerProfileKey, updatedReferrerProfile);
      console.log('[REF] Referrer stats updated on account creation:', { 
        referrerEmail: referralEmail, 
        referredQualifiedCount,
        newUser: currentUserEmail,
        upgradedToFounder
      });

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
