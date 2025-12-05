import { NextResponse } from 'next/server';
// HUB_MODE eliminado - todas las funcionalidades siempre activas
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

    // 🚨 OPTIMIZATION: Ejecutar findUsageUser y getUserPlan en paralelo si es posible
    const [existingUser, planContextResult] = await Promise.all([
      findUsageUser(identity).catch(() => null),
      getUserPlan(identity).catch(() => null)
    ]);
    
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
        isEarlyFounderCandidate: false, // 🚨 CRITICAL: Añadir flag por defecto
      });
    }

    planContext = planContextResult;

    if (planContext?.plan === 'hub') {
      planContext = {
        ...planContext,
        plan: 'free',
        unlimited: false,
        source: 'supabase',
      };
    }

    // 🚨 OPTIMIZATION: Ejecutar getOrCreateUsageUser, getUsageSummary y consulta a Supabase en paralelo
    const [usageUser, usageSummary, userRecordResult] = await Promise.all([
      getOrCreateUsageUser(identity).catch(() => null),
      getUsageSummary(identity).catch(() => null),
      (async () => {
        // 🚨 OPTIMIZATION: Consulta directa y rápida usando id (primary key)
        const supabase = getSupabaseAdmin();
        if (supabase && pleiaUser?.id) {
          try {
            // 🚨 OPTIMIZATION: Usar solo los campos necesarios y id (más rápido)
            const { data } = await supabase
              .from('users')
              .select('usage_count, max_uses, plan, newsletter_opt_in, marketing_opt_in, terms_accepted_at, last_prompt_at, updated_at, created_at, username, is_early_founder_candidate')
              .eq('id', pleiaUser.id) // 🚨 OPTIMIZATION: id es primary key, más rápido que email
              .maybeSingle();
            return data || null;
          } catch (error) {
            console.warn('[USAGE-STATUS] Error fetching user record:', error);
            return null;
          }
        }
        return null;
      })()
    ]);
    
    const usageUserResult = usageUser || {};
    const usageSummaryResult = usageSummary || { used: 0, limit: getUsageLimit(), remaining: getUsageLimit(), unlimited: false, plan: 'free', source: 'fallback' };
    const userRecord = userRecordResult;

    const termsAcceptedAt =
      usageUserResult?.terms_accepted_at ?? userRecord?.terms_accepted_at ?? null;
    const username = usageUserResult?.username ?? userRecord?.username ?? null;
    
    // 🚨 CRITICAL: needsAccount = true si no tiene cuenta PLEIA completa
    // Cuenta completa = terms_accepted_at Y username (no null)
    const hasCompleteAccount = termsAcceptedAt && username;
    const marketingOptIn =
      typeof userRecord?.marketing_opt_in === 'boolean'
        ? userRecord.marketing_opt_in
        : !!usageUserResult?.marketing_opt_in;

    // CRITICAL: Priorizar datos de Supabase (userRecord) sobre usageSummary para datos más recientes
    const currentUsageCount = userRecord?.usage_count ?? usageSummaryResult.used ?? 0;

    // Resolver max_uses: priorizar userRecord > usageSummary > default
    let maxUsesCandidate = getUsageLimit();
    if (typeof userRecord?.max_uses === 'number') {
      maxUsesCandidate = userRecord.max_uses;
    } else if (typeof usageSummaryResult.limit === 'number') {
      maxUsesCandidate = usageSummaryResult.limit;
    }

    if (!planContext) {
      planContext = {
        plan: 'free',
        isFounder: false,
        isMonthly: false,
        unlimited: false,
        since: null,
        source: usageSummaryResult.source || 'supabase',
        isEarlyFounderCandidate: userRecord?.is_early_founder_candidate === true || false,
      };
    }
    
    // 🚨 CRITICAL: Si isEarlyFounderCandidate no está en planContext, obtenerlo de userRecord
    if (planContext && typeof planContext.isEarlyFounderCandidate !== 'boolean') {
      planContext.isEarlyFounderCandidate = userRecord?.is_early_founder_candidate === true || false;
    }

    const planUnlimited = !!planContext?.unlimited;
    let usageUnlimited = !!usageSummaryResult.unlimited;
    if (!planUnlimited && usageSummaryResult.plan === 'hub') {
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
        plan: planContext?.plan || (usageSummaryResult.plan === 'hub' ? 'free' : usageSummaryResult.plan) || 'free',
        maxUses: resolvedMaxUses,
        lastPromptAt: userRecord?.last_prompt_at || usageSummaryResult.lastPromptAt,
      },
      used: currentUsageCount,
      remaining: resolvedRemaining,
      limit: isUnlimited ? false : currentUsageCount >= (resolvedMaxUses ?? getUsageLimit()),
      unlimited: isUnlimited,
      plan: planContext?.plan || (usageSummaryResult.plan === 'hub' ? 'free' : usageSummaryResult.plan) || 'free',
      isFounder: !!planContext?.isFounder,
      isEarlyFounderCandidate, // 🚨 CRITICAL: Añadir flag de early founder candidate
      profile: {
        email,
        plan: planContext?.plan || 'free',
        since: planContext?.since || null,
        userId: pleiaUser.id,
      },
      source: usageSummaryResult.source || planContext?.source || 'supabase',
      limitPerWindow: resolvedMaxUses ?? getUsageLimit(),
      counters: {
        usage_count: currentUsageCount,
        max_uses: resolvedMaxUses,
        last_prompt_at: userRecord?.last_prompt_at || usageSummaryResult.lastPromptAt,
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