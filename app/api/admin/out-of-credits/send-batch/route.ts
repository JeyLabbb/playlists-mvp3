import { NextResponse } from 'next/server';
import { ensureAdminAccess } from '@/lib/admin/session';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { sendOutOfCreditsEmailWithTracking } from '@/lib/email/outOfCreditsWithTracking';

export async function POST(request: Request) {
  try {
    const adminAccess = await ensureAdminAccess(request);
    if (!adminAccess.ok) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Supabase admin client not configured' },
        { status: 500 },
      );
    }

    // Buscar usuarios con 0 usos restantes y sin email de out-of-credits enviado
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, usage_count, max_uses, plan, out_of_credits_email_sent')
      .eq('out_of_credits_email_sent', false)
      .not('email', 'is', null);

    if (error) {
      console.error('[OUT-OF-CREDITS-BATCH] Error fetching users:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    const unlimitedPlans = ['founder', 'premium', 'monthly', 'hub'];
    const candidates = (users || []).filter((user: any) => {
      if (!user.email) return false;
      if (unlimitedPlans.includes(user.plan)) return false;
      const limit = user.max_uses || 5;
      const used = user.usage_count || 0;
      const remaining = Math.max(0, limit - used);
      return remaining === 0;
    });

    const results: any[] = [];

    for (const user of candidates) {
      try {
        const result = await sendOutOfCreditsEmailWithTracking(user.id, user.email);
        results.push({
          userId: user.id,
          email: user.email,
          ok: result.ok,
          emailSent: (result as any).emailSent ?? false,
          reason: (result as any).reason ?? null,
          error: (result as any).error ?? null,
        });
      } catch (e: any) {
        console.error('[OUT-OF-CREDITS-BATCH] Error sending to user:', user.email, e);
        results.push({
          userId: user.id,
          email: user.email,
          ok: false,
          emailSent: false,
          reason: null,
          error: e?.message || 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalCandidates: candidates.length,
      results,
    });
  } catch (error: any) {
    console.error('[OUT-OF-CREDITS-BATCH] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Unexpected error' },
      { status: 500 },
    );
  }
}



