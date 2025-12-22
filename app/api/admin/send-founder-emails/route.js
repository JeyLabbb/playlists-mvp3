import { NextResponse } from 'next/server';
import { getPleiaServerUser } from '@/lib/auth/serverUser';

/**
 * Endpoint para enviar emails de bienvenida a founder
 * Solo para admins
 */
export async function POST(request) {
  try {
    // Leer el body una sola vez
    const body = await request.json();
    const { emails, adminKey } = body;
    
    const adminSecretKey = process.env.ADMIN_SECRET_KEY || 'admin-secret-key-change-me';
    
    let isAuthorized = false;
    
    // Opción 1: Clave secreta de admin (para scripts)
    if (adminKey === adminSecretKey) {
      isAuthorized = true;
      console.log('[SEND-FOUNDER-EMAILS] ✅ Authorized via admin key');
    } else {
      // Opción 2: Sesión de usuario admin
      const pleiaUser = await getPleiaServerUser();
      if (pleiaUser?.email) {
        const isAdmin = pleiaUser.email === 'jorgejr200419@gmail.com' || pleiaUser.email === 'jeylabbb@gmail.com';
        if (isAdmin) {
          isAuthorized = true;
          console.log('[SEND-FOUNDER-EMAILS] ✅ Authorized via user session:', pleiaUser.email);
        }
      }
    }
    
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    if (!emails || !Array.isArray(emails)) {
      return NextResponse.json({ error: 'emails array is required' }, { status: 400 });
    }

    const { sendFounderWelcomeEmail } = await import('@/lib/newsletter/workflows');

    const results = {
      sent: [],
      failed: []
    };

    for (const email of emails) {
      try {
        console.log(`[SEND-FOUNDER-EMAILS] 📤 Enviando email a: ${email}...`);
        const emailSent = await sendFounderWelcomeEmail(email, {
          origin: 'referral_founder_upgrade_manual_fix'
        });

        if (emailSent) {
          console.log(`[SEND-FOUNDER-EMAILS] ✅ Email enviado a: ${email}`);
          results.sent.push(email);
        } else {
          console.log(`[SEND-FOUNDER-EMAILS] ⚠️  No se pudo enviar email a: ${email}`);
          results.failed.push({ email, reason: 'sendFounderWelcomeEmail returned false' });
        }
      } catch (error) {
        console.error(`[SEND-FOUNDER-EMAILS] ❌ Error enviando email a ${email}:`, error);
        results.failed.push({ email, reason: error.message });
      }
    }

    return NextResponse.json({
      success: true,
      sent: results.sent.length,
      failed: results.failed.length,
      results
    });

  } catch (error) {
    console.error('[SEND-FOUNDER-EMAILS] Error:', error);
    return NextResponse.json({ error: 'Failed to send emails', details: error.message }, { status: 500 });
  }
}

