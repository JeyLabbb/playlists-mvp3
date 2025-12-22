import { NextResponse } from 'next/server';
import { REFERRALS_ENABLED, REF_REQUIRED_COUNT, canInvite } from '@/lib/referrals';
import { getUserPlan } from '@/lib/billing/usageV2';
import { getPleiaServerUser } from '@/lib/auth/serverUser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    if (!REFERRALS_ENABLED) {
      return NextResponse.json({ error: 'Referrals not enabled' }, { status: 403 });
    }

    const pleiaUser = await getPleiaServerUser();
    const userEmail = pleiaUser?.email || null;

    if (!userEmail) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const normalizedEmail = userEmail.toLowerCase();

    // 🚨 OPTIMIZATION: Consulta directa a Supabase para obtener solo el flag necesario
    // Esto es más rápido que getUserPlan que hace múltiples consultas
    let isEarlyFounderCandidate = false;
    let planContext = null;
    
    try {
      // 🚨 OPTIMIZATION: Consulta directa y rápida solo para el flag
      const { getSupabaseAdmin } = await import('@/lib/supabase/server');
      const supabase = getSupabaseAdmin();
      
      // 🚨 OPTIMIZATION: Usar id primero (primary key, más rápido) si está disponible
      let query = supabase
        .from('users')
        .select('is_early_founder_candidate, plan');
      
      if (pleiaUser.id) {
        query = query.eq('id', pleiaUser.id); // 🚨 OPTIMIZATION: id es primary key
      } else {
        query = query.eq('email', normalizedEmail);
      }
      
      const { data: userData, error: dbError } = await query.maybeSingle();
      
      if (!dbError && userData) {
        isEarlyFounderCandidate = !!userData.is_early_founder_candidate;
        planContext = { 
          plan: userData.plan || 'free', 
          isEarlyFounderCandidate: !!userData.is_early_founder_candidate 
        };
        console.log('[REF] Direct DB check result:', {
          email: normalizedEmail,
          isEarlyFounderCandidate,
          plan: userData.plan,
        });
      } else {
        // Fallback a getUserPlan solo si la consulta directa falla
        console.warn('[REF] Direct DB check failed, trying getUserPlan:', dbError);
        try {
          planContext = await getUserPlan(normalizedEmail);
          isEarlyFounderCandidate = !!planContext?.isEarlyFounderCandidate;
        } catch (planError) {
          console.warn('[REF] getUserPlan also failed:', planError);
          isEarlyFounderCandidate = false;
        }
      }
    } catch (error) {
      console.error('[REF] Error checking early founder candidate:', error);
      isEarlyFounderCandidate = false;
    }

    // 🚨 CRITICAL: Verificar canInvite ANTES de hacer más consultas
    const canInviteResult = canInvite(normalizedEmail, { isEarlyCandidate: isEarlyFounderCandidate });
    console.log('[REF] Checking canInvite:', {
      email: normalizedEmail,
      isEarlyFounderCandidate,
      canInviteResult,
    });

    if (!canInviteResult) {
      console.log('[REF] User not authorized to invite (early return):', {
        email: normalizedEmail,
        isEarlyFounderCandidate,
        REFERRALS_ENABLED,
      });
      return NextResponse.json({ error: 'User not authorized to invite' }, { status: 403 });
    }

    // Get user profile
    const kv = await import('@vercel/kv');
    // 🚨 CRITICAL: Usar la misma key que en track/route.js y otros lugares
    const profileKey = `jey_user_profile:${normalizedEmail}`;
    const profile = (await kv.kv.get(profileKey)) || {};

    const qualifiedReferrals = profile.referredQualifiedCount || 0;
    const stats = {
      totalReferrals: profile.referrals?.length || 0,
      qualifiedReferrals,
      remainingToUnlock: Math.max(0, REF_REQUIRED_COUNT - qualifiedReferrals),
      progressPercentage: Math.min((qualifiedReferrals / REF_REQUIRED_COUNT) * 100, 100),
      canInvite: true,
    };

    // 🚨 CRITICAL: Si tiene 1/1 referidos pero NO es founder, actualizar automáticamente
    // Esto corrige casos donde el contador se actualizó en KV pero el upgrade a Supabase falló
    if (qualifiedReferrals >= REF_REQUIRED_COUNT) {
      const currentPlan = planContext?.plan || 'free';
      
      if (currentPlan !== 'founder') {
        console.log('[REF-STATS] 🚨 User has 1/1 referido but plan is not founder! Auto-upgrading...', {
          email: normalizedEmail,
          qualifiedReferrals,
          requiredCount: REF_REQUIRED_COUNT,
          currentPlan,
          planInKV: profile.plan
        });
        
        try {
          const { getSupabaseAdmin } = await import('@/lib/supabase/server');
          const now = new Date().toISOString();
          
          // 🚨 CRITICAL: Actualización directa de 'plan', 'max_uses' y 'founder_source'
          // Esto es más confiable que setUserPlan
          const supabaseAdmin = getSupabaseAdmin();
          
          // 🚨 OPTIMIZATION: Usar id si está disponible (más rápido)
          let updateQuery = supabaseAdmin
            .from('users')
            .update({
              plan: 'founder',
              max_uses: null, // 🚨 CRITICAL: null = infinito
              // 🚨 NEW: Marcar que el founder se obtuvo mediante referidos
              founder_source: 'referral' // 'purchase' o 'referral'
            });
          
          if (pleiaUser.id) {
            updateQuery = updateQuery.eq('id', pleiaUser.id); // 🚨 OPTIMIZATION: id es primary key
          } else {
            updateQuery = updateQuery.eq('email', normalizedEmail);
          }
          
          const { error: updateError } = await updateQuery;
          
          if (updateError) {
            console.error('[REF-STATS] ❌ Direct update failed:', {
              error: updateError,
              message: updateError.message,
              details: updateError.details,
              hint: updateError.hint,
              email: normalizedEmail
            });
            throw updateError;
          }
          
          console.log('[REF-STATS] ✅ Update query executed, verifying...');
          
          // 🚨 OPTIMIZATION: Reducir delay - Supabase es rápido
          await new Promise(resolve => setTimeout(resolve, 100));
          // 🚨 OPTIMIZATION: Usar id si está disponible (más rápido)
          let selectQuery = supabaseAdmin
            .from('users')
            .select('id, email, plan, max_uses');
          
          if (pleiaUser.id) {
            selectQuery = selectQuery.eq('id', pleiaUser.id); // 🚨 OPTIMIZATION: id es primary key
          } else {
            selectQuery = selectQuery.eq('email', normalizedEmail);
          }
          
          const { data: afterUpdate } = await selectQuery.maybeSingle();
          
          if (afterUpdate?.plan === 'founder' && afterUpdate?.max_uses === null) {
            console.log('[REF-STATS] ✅ Plan updated to founder in Supabase (verified):', {
              email: normalizedEmail,
              plan: afterUpdate.plan,
              max_uses: afterUpdate.max_uses
            });
            
            // 🚨 CRITICAL: Actualizar KV DESPUÉS de Supabase (KV es solo caché, Supabase es la fuente de verdad)
            const updatedProfile = {
              ...profile,
              email: normalizedEmail,
              plan: 'founder',
              founderSince: profile.founderSince || now,
              updatedAt: now
            };
            await kv.kv.set(profileKey, updatedProfile);
            console.log('[REF-STATS] ✅ KV updated after Supabase update');
            
            // 🚨 CRITICAL: SOLO ENVIAR EMAIL DESPUÉS de verificar que Supabase se actualizó correctamente
            try {
              const { sendFounderWelcomeEmail } = await import('@/lib/newsletter/workflows');
              const emailSent = await sendFounderWelcomeEmail(normalizedEmail, {
                origin: 'referral_founder_upgrade_stats'
              });
              
              if (emailSent) {
                console.log('[REF-STATS] ✅ Founder welcome email sent to:', normalizedEmail);
              } else {
                console.warn('[REF-STATS] ⚠️ Failed to send founder welcome email to:', normalizedEmail);
              }
            } catch (emailError) {
              console.error('[REF-STATS] ❌ Error sending founder welcome email:', emailError);
              // No fallar si falla el email
            }
          } else {
            console.error('[REF-STATS] ❌ Plan not updated correctly in Supabase! Still:', {
              plan: afterUpdate?.plan,
              max_uses: afterUpdate?.max_uses
            });
            throw new Error('Plan update verification failed - Supabase not updated');
          }
          
        } catch (upgradeError) {
          console.error('[REF-STATS] ❌ Error auto-upgrading to founder:', upgradeError);
          // No fallar la petición si falla el upgrade
        }
      }
    }

    console.log('[REF] Stats for user:', normalizedEmail, stats);

    return NextResponse.json(stats);

  } catch (error) {
    console.error('[REF] Error getting stats:', error);
    return NextResponse.json({ error: 'Failed to get referral stats' }, { status: 500 });
  }
}
