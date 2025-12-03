/**
 * Endpoint para confirmar todos los usuarios existentes que no tengan el email confirmado
 * Útil para migrar usuarios existentes después de deshabilitar la confirmación de email
 * 
 * IMPORTANTE: Este endpoint debería estar protegido o solo ejecutarse una vez
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    // Opcional: verificar alguna clave secreta para proteger este endpoint
    const { secret } = await request.json().catch(() => ({}));
    const expectedSecret = process.env.ADMIN_SECRET || 'confirm-all-users-secret';
    
    if (secret !== expectedSecret) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: 'Admin client not available' },
        { status: 500 }
      );
    }

    console.log('[AUTH-CONFIRM-ALL] Starting bulk email confirmation...');

    // Obtener todos los usuarios
    const { data: usersData, error: listError } = await admin.auth.admin.listUsers();
    
    if (listError) {
      console.error('[AUTH-CONFIRM-ALL] Error listing users:', listError);
      return NextResponse.json(
        { ok: false, error: listError.message },
        { status: 500 }
      );
    }

    const users = usersData?.users || [];
    console.log(`[AUTH-CONFIRM-ALL] Found ${users.length} total users`);

    // Filtrar usuarios no confirmados
    const unconfirmedUsers = users.filter(user => !user.email_confirmed_at);
    console.log(`[AUTH-CONFIRM-ALL] Found ${unconfirmedUsers.length} unconfirmed users`);

    const results = {
      total: users.length,
      unconfirmed: unconfirmedUsers.length,
      confirmed: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Confirmar cada usuario no confirmado
    for (const user of unconfirmedUsers) {
      try {
        const { error: confirmError } = await admin.auth.admin.updateUserById(
          user.id,
          { email_confirm: true }
        );

        if (confirmError) {
          results.failed++;
          results.errors.push(`${user.email}: ${confirmError.message}`);
          console.warn(`[AUTH-CONFIRM-ALL] Failed to confirm ${user.email}:`, confirmError);
        } else {
          results.confirmed++;
          console.log(`[AUTH-CONFIRM-ALL] ✅ Confirmed ${user.email}`);
        }
      } catch (err: any) {
        results.failed++;
        results.errors.push(`${user.email}: ${err.message || 'Unknown error'}`);
        console.error(`[AUTH-CONFIRM-ALL] Error confirming ${user.email}:`, err);
      }
    }

    console.log('[AUTH-CONFIRM-ALL] ✅ Bulk confirmation completed:', results);

    return NextResponse.json({
      ok: true,
      results,
      message: `Confirmed ${results.confirmed} out of ${results.unconfirmed} unconfirmed users`,
    });
  } catch (error: any) {
    console.error('[AUTH-CONFIRM-ALL] Unexpected error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}

