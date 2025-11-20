import { NextResponse } from 'next/server';
import { HUB_MODE } from '@/lib/features';
import { getPleiaServerUser } from '@/lib/auth/serverUser';
import {
  getUsageSummary,
  getUserPlan,
  getUsageLimit,
  getOrCreateUsageUser,
  findUsageUser,
} from '@/lib/billing/usage';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic'; // 🚨 CRITICAL: No cachear para obtener datos más recientes

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const emailParam = url.searchParams.get('email');

    let email = null;
    let planContext = null;

    const pleiaUser = await getPleiaServerUser();

    if (!pleiaUser?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (emailParam && emailParam !== pleiaUser.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    email = emailParam || pleiaUser.email;
    const identity = { userId: pleiaUser.id, email };

    if (HUB_MODE && process.env.NEXT_PUBLIC_HUB_MODE === '1') {
      planContext = {
        plan: 'hub',
        isFounder: false,
        isMonthly: false,
        unlimited: true,
        since: null,
        source: 'hub'
      };
    } else {
      const existingUser = await findUsageUser(identity);
      if (!existingUser) {
        const defaultLimit = getUsageLimit();
        return NextResponse.json({
          success: true,
          needsAccount: true,
          usage: {
            current: 0,
            limit: defaultLimit,
            remaining: defaultLimit,
            hasUnlimitedUses: false,
            plan: 'free',
            maxUses: defaultLimit,
            lastPromptAt: null,
          },
          remaining: defaultLimit,
          used: 0,
          unlimited: false,
          plan: 'free',
          limitPerWindow: defaultLimit,
          counters: null,
          termsAccepted: false,
          termsAcceptedAt: null,
          marketingOptIn: false,
        });
      }

      planContext = await getUserPlan(identity);

      if (planContext?.plan === 'hub') {
        planContext = {
          ...planContext,
          plan: 'free',
          unlimited: false,
          source: 'supabase',
        };
      }
    }

    if (HUB_MODE) {
      return NextResponse.json({
        success: true,
        usage: {
          current: 0,
          limit: null,
          remaining: 'unlimited',
          hasUnlimitedUses: true,
          plan: 'hub',
          windowDays: null,
          resetAt: null
        },
        limit: false,
        remaining: 'unlimited',
        used: 0,
        unlimited: true,
        plan: 'hub',
        profile: {
          email,
          plan: 'hub',
          since: null
        },
        source: 'hub'
      });
    }

    const usageUser = await getOrCreateUsageUser(identity);
    const usageSummary = await getUsageSummary(identity);

    const supabase = getSupabaseAdmin();
    let userRecord = null;
    if (supabase && pleiaUser?.id) {
      const { data } = await supabase
        .from('users')
        .select(
          'usage_count, max_uses, plan, newsletter_opt_in, marketing_opt_in, terms_accepted_at, last_prompt_at, updated_at, created_at, username',
        )
        .eq('id', pleiaUser.id)
        .maybeSingle();
      userRecord = data || null;
    }

    const termsAcceptedAt =
      usageUser?.terms_accepted_at ?? userRecord?.terms_accepted_at ?? null;
    const username = usageUser?.username ?? userRecord?.username ?? null;
    
    // 🚨 CRITICAL: Log detallado para debugging
    console.log('[USAGE-STATUS] ===== CHECKING ACCOUNT COMPLETENESS =====');
    console.log('[USAGE-STATUS] User ID:', pleiaUser?.id);
    console.log('[USAGE-STATUS] Email:', email);
    console.log('[USAGE-STATUS] Account data:', {
      fromUsageUser: {
        hasTerms: !!usageUser?.terms_accepted_at,
        hasUsername: !!usageUser?.username,
        username: usageUser?.username,
        terms_accepted_at: usageUser?.terms_accepted_at,
      },
      fromUserRecord: {
        hasTerms: !!userRecord?.terms_accepted_at,
        hasUsername: !!userRecord?.username,
        username: userRecord?.username,
        terms_accepted_at: userRecord?.terms_accepted_at,
      },
      resolved: {
        termsAcceptedAt,
        username,
        hasCompleteAccount: !!(termsAcceptedAt && username),
      },
    });
    
    // 🚨 CRITICAL: needsAccount = true si no tiene cuenta PLEIA completa
    // Cuenta completa = terms_accepted_at Y username (no null)
    const hasCompleteAccount = termsAcceptedAt && username;
    
    console.log('[USAGE-STATUS] Final decision:', {
      hasCompleteAccount,
      needsAccount: !hasCompleteAccount,
    });
    const marketingOptIn =
      typeof userRecord?.marketing_opt_in === 'boolean'
        ? userRecord.marketing_opt_in
        : !!usageUser?.marketing_opt_in;

    // CRITICAL: Priorizar datos de Supabase (userRecord) sobre usageSummary para datos más recientes
    const currentUsageCount = userRecord?.usage_count ?? usageSummary.used ?? 0;

    // Resolver max_uses: priorizar userRecord > usageSummary > default
    let maxUsesCandidate = getUsageLimit();
    if (typeof userRecord?.max_uses === 'number') {
      maxUsesCandidate = userRecord.max_uses;
    } else if (typeof usageSummary.limit === 'number') {
      maxUsesCandidate = usageSummary.limit;
    }

    if (!planContext) {
      planContext = {
        plan: 'free',
        isFounder: false,
        isMonthly: false,
        unlimited: false,
        since: null,
        source: usageSummary.source || 'supabase',
      };
    }

    const planUnlimited = !!planContext?.unlimited;
    let usageUnlimited = !!usageSummary.unlimited;
    if (!planUnlimited && usageSummary.plan === 'hub') {
      usageUnlimited = false;
    }
    const isUnlimited = planUnlimited || usageUnlimited;

    const resolvedMaxUses = isUnlimited ? null : maxUsesCandidate;
    
    // CRITICAL: Calcular remaining siempre desde los datos más recientes de Supabase
    // No usar usageSummary.remaining que puede estar desactualizado
    const resolvedRemaining = isUnlimited
      ? 'unlimited'
      : Math.max(0, (resolvedMaxUses ?? getUsageLimit()) - currentUsageCount);
    
    // Validación: remaining nunca debe ser negativo
    if (typeof resolvedRemaining === 'number' && resolvedRemaining < 0) {
      console.warn(`[USAGE-STATUS] Invalid remaining calculation: ${resolvedRemaining} (used=${currentUsageCount}, limit=${resolvedMaxUses})`);
    }

    // 🚨 CRITICAL: Obtener isEarlyFounderCandidate de planContext
    const isEarlyFounderCandidate = 
      typeof planContext?.isEarlyFounderCandidate === 'boolean'
        ? planContext.isEarlyFounderCandidate
        : false;

    const response = {
      success: true,
      needsAccount: !hasCompleteAccount, // 🚨 CRITICAL: needsAccount = true si no tiene cuenta completa
      usage: {
        current: currentUsageCount,
        limit: resolvedMaxUses,
        remaining: resolvedRemaining,
        hasUnlimitedUses: isUnlimited,
        plan: planContext?.plan || (usageSummary.plan === 'hub' ? 'free' : usageSummary.plan) || 'free',
        maxUses: resolvedMaxUses,
        lastPromptAt: userRecord?.last_prompt_at || usageSummary.lastPromptAt,
      },
      used: currentUsageCount,
      remaining: resolvedRemaining,
      limit: isUnlimited ? false : currentUsageCount >= (resolvedMaxUses ?? getUsageLimit()),
      unlimited: isUnlimited,
      plan: planContext?.plan || (usageSummary.plan === 'hub' ? 'free' : usageSummary.plan) || 'free',
      isFounder: !!planContext?.isFounder,
      isEarlyFounderCandidate, // 🚨 CRITICAL: Añadir flag de early founder candidate
      profile: {
        email,
        plan: planContext?.plan || 'free',
        since: planContext?.since || null,
        userId: pleiaUser.id,
      },
      source: usageSummary.source || planContext?.source || 'supabase',
      limitPerWindow: resolvedMaxUses ?? getUsageLimit(),
      counters: {
        usage_count: currentUsageCount,
        max_uses: resolvedMaxUses,
        last_prompt_at: userRecord?.last_prompt_at || usageSummary.lastPromptAt,
        updated_at: userRecord?.updated_at || null,
      },
      termsAccepted: !!termsAcceptedAt,
      termsAcceptedAt,
      marketingOptIn,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[USAGE] Error retrieving usage status:', error);
    return NextResponse.json({ error: 'Failed to retrieve usage status' }, { status: 500 });
  }
}