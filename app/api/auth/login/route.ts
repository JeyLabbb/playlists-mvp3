import { NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/routeClient';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseRouteClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Si el error es "email not confirmed", auto-confirmar el email y reintentar
      if (error.message.includes('email') && error.message.includes('confirm')) {
        console.log('[AUTH] Email not confirmed, attempting auto-confirmation...');
        
        try {
          // Buscar el usuario por email usando admin client
          const admin = getSupabaseAdmin();
          if (admin) {
            const { data: users, error: listError } = await admin.auth.admin.listUsers();
            
            if (!listError && users?.users) {
              const user = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
              
              if (user) {
                // Auto-confirmar el email
                const { error: confirmError } = await admin.auth.admin.updateUserById(
                  user.id,
                  { email_confirm: true }
                );
                
                if (!confirmError) {
                  console.log('[AUTH] ✅ Email auto-confirmed, retrying login...');
                  
                  // Reintentar el login
                  const { error: retryError } = await supabase.auth.signInWithPassword({ email, password });
                  
                  if (!retryError) {
                    return NextResponse.json({ ok: true });
                  } else {
                    console.warn('[AUTH] Login failed after auto-confirmation:', retryError);
                  }
                } else {
                  console.warn('[AUTH] Failed to auto-confirm email:', confirmError);
                }
              }
            }
          }
        } catch (autoConfirmError) {
          console.error('[AUTH] Error during auto-confirmation:', autoConfirmError);
        }
      }
      
      // Si llegamos aquí, el error persiste o no era de confirmación
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[AUTH] Error logging in:', error);
    return NextResponse.json(
      { ok: false, error: 'Error al iniciar sesión' },
      { status: 500 }
    );
  }
}

