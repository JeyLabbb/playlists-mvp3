import { NextResponse } from 'next/server';
import { ensureAdminAccess } from '@/lib/admin/session';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * POST /api/admin/reyes/send-email
 * Envía el email de Reyes a usuarios que NO lo han recibido aún
 * Con rate limiting estricto: 2 emails por segundo (500ms entre cada uno)
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

    const body = await request.json().catch(() => ({}));
    const resendOnly = body.resendOnly === true; // Si es true, solo reenvía a los que fallaron

    const supabase = getSupabaseAdmin();

    // Obtener usuarios que NO han recibido el email
    let query = supabase
      .from('users')
      .select('id, email, reyes_email_sent, reyes_email_sent_at')
      .not('email', 'is', null);

    if (resendOnly) {
      // Solo usuarios que NO han recibido el email (reyes_email_sent = false o null)
      query = query.or('reyes_email_sent.is.null,reyes_email_sent.eq.false');
    } else {
      // Todos los usuarios (primera vez)
      query = query.or('reyes_email_sent.is.null,reyes_email_sent.eq.false');
    }

    const { data: users, error: fetchError } = await query;

    if (fetchError) {
      console.error('[REYES] Error fetching users:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Error al obtener usuarios' },
        { status: 500 }
      );
    }

    const usersToEmail = users || [];
    console.log(`[REYES] Enviando email a ${usersToEmail.length} usuarios (${resendOnly ? 'solo pendientes' : 'todos'})`);

    if (usersToEmail.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        failed: 0,
        total: 0,
        message: 'No hay usuarios pendientes de recibir el email'
      });
    }

    // Importar función de envío
    const { sendReyesEmail } = await import('@/lib/email/reyesNotification');

    // Rate limit: 2 emails por segundo = 500ms mínimo entre cada uno
    const DELAY_MS = 600; // 600ms para estar seguros (un poco más de 500ms)
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];
    const now = new Date().toISOString();

    // Procesar uno por uno con delay estricto
    for (const user of usersToEmail) {
      try {
        const result = await sendReyesEmail(user.id, user.email);
        
        if (result.ok) {
          // Marcar como enviado en la base de datos
          await supabase
            .from('users')
            .update({
              reyes_email_sent: true,
              reyes_email_sent_at: now,
            })
            .eq('id', user.id);
          
          sent++;
          console.log(`[REYES] ✅ Email enviado a ${user.email}`);
        } else {
          failed++;
          const errorMsg = `${user.email}: ${result.error}`;
          errors.push(errorMsg);
          console.error(`[REYES] ❌ Error enviando a ${user.email}:`, result.error);
        }
      } catch (error: any) {
        failed++;
        const errorMsg = `${user.email}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`[REYES] ❌ Exception enviando a ${user.email}:`, error);
      }

      // Esperar antes del siguiente email (excepto el último)
      if (user !== usersToEmail[usersToEmail.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    console.log(`[REYES] ✅ Proceso completado: ${sent} enviados, ${failed} fallidos`);

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: usersToEmail.length,
      errors: errors.slice(0, 20) // Primeros 20 errores
    });

  } catch (error: any) {
    console.error('[REYES] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

