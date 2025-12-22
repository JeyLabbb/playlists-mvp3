import { NextResponse } from 'next/server';
import { getPleiaServerUser } from '@/lib/auth/serverUser';
import { REF_REQUIRED_COUNT } from '@/lib/referrals';

/**
 * Endpoint para corregir usuarios que deberían ser founder pero no lo son
 * 
 * Busca en KV usuarios con referredQualifiedCount >= REF_REQUIRED_COUNT
 * pero que no tienen plan='founder' en Supabase
 * 
 * Uso: GET /api/referrals/fix-missing-founders?dryRun=true
 */
export async function GET(request) {
  try {
    const pleiaUser = await getPleiaServerUser();
    
    // Solo permitir a admins o al usuario mismo
    if (!pleiaUser?.email) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Verificar si es admin (puedes ajustar esta lógica)
    const isAdmin = pleiaUser.email === 'jorgejr200419@gmail.com' || pleiaUser.email === 'jeylabbb@gmail.com';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const dryRun = searchParams.get('dryRun') !== 'false'; // Por defecto dryRun=true para seguridad

    const kv = await import('@vercel/kv');
    const { getSupabaseAdmin } = await import('@/lib/supabase/server');
    const supabaseAdmin = getSupabaseAdmin();

    console.log('[FIX-MISSING-FOUNDERS] Starting fix process...', { dryRun });

    // Obtener todas las keys de perfiles de usuario
    // Nota: Vercel KV no tiene un método directo para listar todas las keys
    // Necesitamos usar un patrón o escanear
    // Por ahora, vamos a buscar usuarios específicos o usar un script separado
    
    // Alternativa: Buscar usuarios en Supabase que deberían ser founder
    // basándonos en los perfiles de KV que tenemos
    
    const fixedUsers = [];
    const errors = [];

    // Buscar en Supabase usuarios que tienen founder_source='referral' pero plan != 'founder'
    // O usuarios sin founder_source pero que deberían tenerlo
    const { data: usersInSupabase, error: supabaseError } = await supabaseAdmin
      .from('users')
      .select('id, email, plan, founder_source, max_uses')
      .or('founder_source.is.null,founder_source.eq.referral')
      .neq('plan', 'founder')
      .limit(1000); // Limitar para no sobrecargar

    if (supabaseError) {
      console.error('[FIX-MISSING-FOUNDERS] Error fetching users from Supabase:', supabaseError);
      return NextResponse.json({ error: 'Failed to fetch users', details: supabaseError }, { status: 500 });
    }

    console.log(`[FIX-MISSING-FOUNDERS] Found ${usersInSupabase?.length || 0} users to check`);

    // Para cada usuario, verificar en KV si debería ser founder
    for (const user of usersInSupabase || []) {
      try {
        const userEmail = user.email.toLowerCase();
        const profileKey = `jey_user_profile:${userEmail}`;
        const profile = await kv.kv.get(profileKey);

        // Verificar si el usuario debería ser founder
        const shouldBeFounder = profile && profile.referredQualifiedCount >= REF_REQUIRED_COUNT;
        
        // También verificar si ya tiene founder_source='referral' pero plan != 'founder'
        const hasReferralSourceButNotFounder = user.founder_source === 'referral' && user.plan !== 'founder';

        if (shouldBeFounder || hasReferralSourceButNotFounder) {
          console.log(`[FIX-MISSING-FOUNDERS] Found user that should be founder:`, {
            email: userEmail,
            referredQualifiedCount: profile?.referredQualifiedCount || 0,
            currentPlan: user.plan,
            profilePlan: profile?.plan,
            hasReferralSourceButNotFounder,
            shouldBeFounder
          });

          if (!dryRun) {
            // Actualizar a founder en Supabase
            const now = new Date().toISOString();
            const { error: updateError } = await supabaseAdmin
              .from('users')
              .update({
                plan: 'founder',
                max_uses: null,
                founder_source: 'referral'
              })
              .eq('email', userEmail);

            if (updateError) {
              console.error(`[FIX-MISSING-FOUNDERS] Error updating user ${userEmail}:`, updateError);
              errors.push({ email: userEmail, error: updateError.message });
            } else {
              // Verificar que se actualizó correctamente
              await new Promise(resolve => setTimeout(resolve, 100));
              const { data: afterUpdate } = await supabaseAdmin
                .from('users')
                .select('id, email, plan, max_uses, founder_source')
                .eq('email', userEmail)
                .maybeSingle();

              if (afterUpdate?.plan === 'founder' && afterUpdate?.max_uses === null) {
                // Actualizar también el perfil en KV si existe
                if (profile) {
                  await kv.kv.set(profileKey, {
                    ...profile,
                    plan: 'founder',
                    founderSince: now,
                    updatedAt: now
                  });
                }

                fixedUsers.push({
                  email: userEmail,
                  referredQualifiedCount: profile?.referredQualifiedCount || 0,
                  previousPlan: user.plan,
                  verified: true
                });

                console.log(`[FIX-MISSING-FOUNDERS] ✅ Fixed user: ${userEmail}`);
              } else {
                console.error(`[FIX-MISSING-FOUNDERS] ❌ Update verification failed for ${userEmail}`);
                errors.push({ email: userEmail, error: 'Update verification failed' });
              }
            }
          } else {
            fixedUsers.push({
              email: userEmail,
              referredQualifiedCount: profile?.referredQualifiedCount || 0,
              currentPlan: user.plan,
              wouldBeFixed: true
            });
          }
        }
      } catch (userError) {
        console.error(`[FIX-MISSING-FOUNDERS] Error processing user ${user.email}:`, userError);
        errors.push({ email: user.email, error: userError.message });
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      fixedCount: fixedUsers.length,
      errorCount: errors.length,
      fixedUsers,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('[FIX-MISSING-FOUNDERS] Error:', error);
    return NextResponse.json({ error: 'Failed to fix missing founders', details: error.message }, { status: 500 });
  }
}

