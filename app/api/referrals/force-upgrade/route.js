import { NextResponse } from 'next/server';
import { REFERRALS_ENABLED, REF_REQUIRED_COUNT } from '@/lib/referrals';
import { getPleiaServerUser } from '@/lib/auth/serverUser';
import { setUserPlan } from '@/lib/billing/usage';
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

    const userEmail = pleiaUser.email.toLowerCase();
    console.log('[REF-FORCE-UPGRADE] Checking upgrade eligibility for:', userEmail);

    // Get referral stats from KV
    const kv = await import('@vercel/kv');
    const profileKey = `jey_user_profile:${userEmail}`;
    const profile = await kv.kv.get(profileKey) || {};
    
    const referredQualifiedCount = profile.referredQualifiedCount || 0;
    const currentPlanInKV = profile.plan || 'free';
    
    // Check plan in Supabase
    let currentPlanInSupabase = null;
    try {
      const planContext = await getUserPlan(userEmail);
      currentPlanInSupabase = planContext?.plan || null;
    } catch (planError) {
      console.warn('[REF-FORCE-UPGRADE] Could not check plan in Supabase:', planError);
    }

    console.log('[REF-FORCE-UPGRADE] Current status:', {
      email: userEmail,
      referredQualifiedCount,
      requiredCount: REF_REQUIRED_COUNT,
      planInKV: currentPlanInKV,
      planInSupabase: currentPlanInSupabase,
      eligible: referredQualifiedCount >= REF_REQUIRED_COUNT
    });

    // Check if user is eligible
    if (referredQualifiedCount < REF_REQUIRED_COUNT) {
      return NextResponse.json({ 
        success: false, 
        error: 'Not enough referrals',
        referredQualifiedCount,
        requiredCount: REF_REQUIRED_COUNT
      }, { status: 400 });
    }

    // Check if already founder
    if (currentPlanInKV === 'founder' && currentPlanInSupabase === 'founder') {
      return NextResponse.json({ 
        success: true, 
        message: 'Already founder',
        plan: 'founder'
      });
    }

    // Upgrade to founder
    const now = new Date().toISOString();
    
    // Update KV profile
    const updatedProfile = {
      ...profile,
      email: userEmail,
      plan: 'founder',
      founderSince: profile.founderSince || now,
      updatedAt: now
    };
    await kv.kv.set(profileKey, updatedProfile);

    // Update Supabase
    let planResult = null;
    let planUpdatedInSupabase = false;
    
    try {
      // 🚨 CRITICAL: Verificar estado ANTES del update
      const { getSupabaseAdmin } = await import('@/lib/supabase/server');
      const supabaseAdmin = getSupabaseAdmin();
      
      const { data: beforeUpdate } = await supabaseAdmin
        .from('users')
        .select('id, email, plan, is_founder')
        .or(`email.eq.${userEmail}`)
        .maybeSingle();
      
      console.log('[REF-FORCE-UPGRADE] State BEFORE update:', {
        email: userEmail,
        userId: beforeUpdate?.id,
        planBefore: beforeUpdate?.plan,
        is_founderBefore: beforeUpdate?.is_founder
      });
      
      // Actualizar usando setUserPlan
      planResult = await setUserPlan(userEmail, 'founder', {
        isFounder: true,
        since: now
      });
      
      console.log('[REF-FORCE-UPGRADE] setUserPlan result:', planResult);
      
      if (planResult?.ok) {
        // 🚨 CRITICAL: Verificar que realmente se actualizó haciendo un SELECT
        await new Promise(resolve => setTimeout(resolve, 200)); // Pequeño delay para asegurar que el UPDATE se complete
        
        const { data: afterUpdate, error: selectError } = await supabaseAdmin
          .from('users')
          .select('id, email, plan, is_founder, max_uses')
          .or(`email.eq.${userEmail}`)
          .maybeSingle();
        
        console.log('[REF-FORCE-UPGRADE] State AFTER update:', {
          email: userEmail,
          userId: afterUpdate?.id,
          planAfter: afterUpdate?.plan,
          is_founderAfter: afterUpdate?.is_founder,
          max_usesAfter: afterUpdate?.max_uses,
          selectError: selectError?.message
        });
        
        if (afterUpdate?.plan === 'founder') {
          planUpdatedInSupabase = true;
          console.log('[REF-FORCE-UPGRADE] ✅ Successfully updated plan to founder in Supabase (verified)');
        } else {
          console.error('[REF-FORCE-UPGRADE] ❌ Plan not updated in Supabase! Still:', afterUpdate?.plan);
          // Intentar actualización directa como fallback
          try {
            const { error: directUpdateError } = await supabaseAdmin
              .from('users')
              .update({
                plan: 'founder',
                max_uses: null, // Unlimited
              })
              .or(`email.eq.${userEmail}`);
            
            if (directUpdateError) {
              console.error('[REF-FORCE-UPGRADE] ❌ Direct update also failed:', directUpdateError);
            } else {
              console.log('[REF-FORCE-UPGRADE] ✅ Direct update succeeded');
              planUpdatedInSupabase = true;
            }
          } catch (directError) {
            console.error('[REF-FORCE-UPGRADE] ❌ Direct update error:', directError);
          }
        }
      } else {
        console.error('[REF-FORCE-UPGRADE] ❌ setUserPlan failed:', planResult?.reason);
        // Intentar actualización directa como fallback
        try {
          const { getSupabaseAdmin } = await import('@/lib/supabase/server');
          const supabaseAdmin = getSupabaseAdmin();
          
            const { error: directUpdateError } = await supabaseAdmin
              .from('users')
              .update({
                plan: 'founder',
                max_uses: null, // Unlimited
              })
              .or(`email.eq.${userEmail}`);
          
          if (directUpdateError) {
            console.error('[REF-FORCE-UPGRADE] ❌ Direct update failed:', directUpdateError);
          } else {
            console.log('[REF-FORCE-UPGRADE] ✅ Direct update succeeded (fallback)');
            planUpdatedInSupabase = true;
          }
        } catch (directError) {
          console.error('[REF-FORCE-UPGRADE] ❌ Direct update error:', directError);
        }
      }
    } catch (planError) {
      console.error('[REF-FORCE-UPGRADE] ❌ Error updating plan to founder in Supabase:', planError);
      // Intentar actualización directa como último recurso
      try {
        const { getSupabaseAdmin } = await import('@/lib/supabase/server');
        const supabaseAdmin = getSupabaseAdmin();
        
        const { error: directUpdateError } = await supabaseAdmin
          .from('users')
          .update({
            plan: 'founder',
            max_uses: null
          })
          .or(`email.eq.${userEmail}`);
        
        if (!directUpdateError) {
          console.log('[REF-FORCE-UPGRADE] ✅ Direct update succeeded (last resort)');
          planUpdatedInSupabase = true;
        }
      } catch (lastError) {
        console.error('[REF-FORCE-UPGRADE] ❌ Last resort update failed:', lastError);
      }
    }

    // 🚨 CRITICAL: Enviar email de bienvenida a founder
    try {
      const { sendFounderWelcomeEmail } = await import('@/lib/newsletter/workflows');
      const emailSent = await sendFounderWelcomeEmail(userEmail, {
        origin: 'referral_founder_upgrade_force'
      });
      
      if (emailSent) {
        console.log('[REF-FORCE-UPGRADE] ✅ Founder welcome email sent to:', userEmail);
      } else {
        console.warn('[REF-FORCE-UPGRADE] ⚠️ Failed to send founder welcome email to:', userEmail);
      }
    } catch (emailError) {
      console.error('[REF-FORCE-UPGRADE] ❌ Error sending founder welcome email:', emailError);
      // Don't fail if email fails
    }

    return NextResponse.json({ 
      success: true, 
      message: planUpdatedInSupabase 
        ? 'Upgraded to founder successfully in Supabase' 
        : 'Upgraded in KV but Supabase update may have failed - check logs',
      plan: 'founder',
      planUpdatedInSupabase
    });

  } catch (error) {
    console.error('[REF-FORCE-UPGRADE] Error:', error);
    return NextResponse.json({ error: 'Failed to force upgrade' }, { status: 500 });
  }
}

