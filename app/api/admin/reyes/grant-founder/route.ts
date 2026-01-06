import { NextResponse } from 'next/server';
import { ensureAdminAccess } from '@/lib/admin/session';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * POST /api/admin/reyes/grant-founder
 * Convierte a TODOS los usuarios a Founder (plan ilimitado)
 * Idempotente: si ya son Founder, no hace nada
 */
export async function POST(request: Request) {
  try {
    // Verificar admin
    const adminCheck = await ensureAdminAccess(request);
    if (!adminCheck.ok) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Obtener todos los usuarios que NO sean Founder
    // Asumimos que Founder = plan = 'founder' o max_uses = null
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, email, plan, max_uses')
      .or('plan.neq.founder,max_uses.not.is.null');

    if (fetchError) {
      console.error('[REYES] Error fetching users:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Error al obtener usuarios' },
        { status: 500 }
      );
    }

    const usersToUpdate = users || [];
    console.log(`[REYES] Convirtiendo ${usersToUpdate.length} usuarios a Founder`);

    // Actualizar todos a Founder
    // Definimos Founder como: plan = 'founder' y max_uses = null (ilimitado)
    const { data: updated, error: updateError } = await supabase
      .from('users')
      .update({
        plan: 'founder',
        max_uses: null, // null = ilimitado
      })
      .or('plan.neq.founder,max_uses.not.is.null')
      .select('id, email');

    if (updateError) {
      console.error('[REYES] Error updating users:', updateError);
      return NextResponse.json(
        { success: false, error: 'Error al actualizar usuarios' },
        { status: 500 }
      );
    }

    console.log(`[REYES] ✅ ${updated?.length || 0} usuarios convertidos a Founder`);

    return NextResponse.json({
      success: true,
      updated: updated?.length || 0,
      message: `${updated?.length || 0} usuarios convertidos a Founder`
    });

  } catch (error: any) {
    console.error('[REYES] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

