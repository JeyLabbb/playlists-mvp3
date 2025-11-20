import { NextResponse } from 'next/server';
import { REFERRALS_ENABLED, REF_REQUIRED_COUNT, canInvite } from '@/lib/referrals';
import { HUB_MODE } from '@/lib/features';
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

    // 🚨 CRITICAL: Consultamos plan/flags para saber si es early-founder-candidate
    // Si getUserPlan falla, intentar obtener el flag directamente de la base de datos
    let isEarlyFounderCandidate = false;
    let planContext = null;
    try {
      planContext = await getUserPlan(normalizedEmail);
      isEarlyFounderCandidate = !!planContext?.isEarlyFounderCandidate;
      console.log('[REF] getUserPlan result:', {
        email: normalizedEmail,
        isEarlyFounderCandidate,
        planContext: planContext ? { plan: planContext.plan, isEarlyFounderCandidate: planContext.isEarlyFounderCandidate } : null,
      });
    } catch (planError) {
      console.warn('[REF] Failed to load user plan for referrals stats:', planError);
      // 🚨 CRITICAL: Si getUserPlan falla, intentar obtener el flag directamente de la BD
      try {
        const { getSupabaseAdmin } = await import('@/lib/supabase/server');
        const supabase = getSupabaseAdmin();
        const { data: userData, error: dbError } = await supabase
          .from('users')
          .select('is_early_founder_candidate, plan')
          .or(`email.eq.${normalizedEmail},id.eq.${pleiaUser.id}`)
          .maybeSingle();
        
        if (!dbError && userData) {
          isEarlyFounderCandidate = !!userData.is_early_founder_candidate;
          planContext = { plan: userData.plan || 'free', isEarlyFounderCandidate: !!userData.is_early_founder_candidate };
          console.log('[REF] Direct DB check result:', {
            email: normalizedEmail,
            isEarlyFounderCandidate,
            plan: userData.plan,
            userData,
          });
        } else {
          console.warn('[REF] Direct DB check also failed:', dbError);
        }
      } catch (dbFallbackError) {
        console.error('[REF] Error in DB fallback:', dbFallbackError);
      }
    }

    // 🚨 CRITICAL: Log antes de verificar canInvite
    console.log('[REF] Checking canInvite:', {
      email: normalizedEmail,
      isEarlyFounderCandidate,
      canInviteResult: canInvite(normalizedEmail, { isEarlyCandidate: isEarlyFounderCandidate }),
    });

    if (!canInvite(normalizedEmail, { isEarlyCandidate: isEarlyFounderCandidate })) {
      console.error('[REF] User not authorized to invite:', {
        email: normalizedEmail,
        isEarlyFounderCandidate,
        REFERRALS_ENABLED,
        canInviteResult: canInvite(normalizedEmail, { isEarlyCandidate: isEarlyFounderCandidate }),
      });
      return NextResponse.json({ error: 'User not authorized to invite' }, { status: 403 });
    }

    // Get user profile
    const kv = await import('@vercel/kv');
    // 🚨 CRITICAL: Usar la misma key que en track/route.js
    const profileKey = `userprofile:${normalizedEmail}`;
    const profile = (await kv.kv.get(profileKey)) || {};

    const qualifiedReferrals = profile.referredQualifiedCount || 0;
    const stats = {
      totalReferrals: profile.referrals?.length || 0,
      qualifiedReferrals,
      remainingToUnlock: Math.max(0, REF_REQUIRED_COUNT - qualifiedReferrals),
      progressPercentage: Math.min((qualifiedReferrals / REF_REQUIRED_COUNT) * 100, 100),
      canInvite: true,
    };

    // 🚨 CRITICAL: Si tiene 3/3 referidos pero NO es founder, actualizar automáticamente
    if (qualifiedReferrals >= REF_REQUIRED_COUNT) {
      const currentPlan = planContext?.plan || 'free';
      
      if (currentPlan !== 'founder') {
        console.log('[REF-STATS] 🚨 User has 3/3 but plan is not founder! Auto-upgrading...', {
          email: normalizedEmail,
          qualifiedReferrals,
          currentPlan
        });
        
        try {
          const { setUserPlan } = await import('@/lib/billing/usage');
          const { getSupabaseAdmin } = await import('@/lib/supabase/server');
          const now = new Date().toISOString();
          
          // 🚨 CRITICAL: Actualizar directamente solo las columnas que existen: 'plan' y 'max_uses'
          const supabaseAdmin = getSupabaseAdmin();
          
          // Actualización directa de 'plan', 'max_uses' y 'updated_at'
          const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({
              plan: 'founder',
              max_uses: null, // Unlimited
              updated_at: now
            })
            .or(`email.eq.${normalizedEmail}`);
          
          if (updateError) {
            console.error('[REF-STATS] ❌ Direct update failed:', updateError);
          } else {
            // Verificar que se actualizó
            await new Promise(resolve => setTimeout(resolve, 200));
            const { data: afterUpdate } = await supabaseAdmin
              .from('users')
              .select('id, email, plan, max_uses')
              .or(`email.eq.${normalizedEmail}`)
              .maybeSingle();
            
            if (afterUpdate?.plan === 'founder') {
              console.log('[REF-STATS] ✅ Plan updated to founder in Supabase (verified):', {
                email: normalizedEmail,
                plan: afterUpdate.plan,
                max_uses: afterUpdate.max_uses
              });
              
              // 🚨 CRITICAL: Enviar email de bienvenida a founder
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
              console.error('[REF-STATS] ❌ Plan not updated! Still:', afterUpdate?.plan);
            }
          }
          
          // Actualizar también el perfil en KV
          const updatedProfile = {
            ...profile,
            email: normalizedEmail,
            plan: 'founder',
            founderSince: profile.founderSince || now,
            updatedAt: now
          };
          await kv.kv.set(profileKey, updatedProfile);
          
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
