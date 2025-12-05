import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPleiaServerUser } from '@/lib/auth/serverUser';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import {
  findUsageUser,
  getOrCreateUsageUser,
  resolveDefaultMaxUses,
  getUsageLimit,
} from '@/lib/billing/usage';
import { createSupabaseRouteClient } from '@/lib/supabase/routeClient';
import { getNewsletterAdminClient, ensureContactByEmail } from '@/lib/newsletter/server';
import { executeWorkflowSteps } from '@/lib/newsletter/workflows';
import { cacheUsernameMapping } from '@/lib/social/usernameCache';

// 🚨 CRITICAL: Función para detectar columnas (similar a la de usageV2.ts)
// Necesitamos verificar qué columnas existen en la base de datos antes de intentar actualizarlas
async function detectColumns(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>) {
  const columnChecks: Record<string, boolean> = {
    is_founder: false,
    is_early_founder_candidate: false,
    newsletter_opt_in: false,
    marketing_opt_in: false,
    terms_accepted_at: false,
    last_prompt_at: false,
    username: false,
    created_at: false,
    updated_at: false,
  };
  
  if (!supabaseAdmin) return columnChecks;

  const check = async (column: string) => {
    const { error } = await supabaseAdmin.from('users').select(column).limit(1);
    if (!error) {
      columnChecks[column] = true;
    } else if (error.code === '42703') {
      columnChecks[column] = false;
    } else {
      columnChecks[column] = false;
    }
  };

  await Promise.all([
    check('is_founder'),
    check('is_early_founder_candidate'),
    check('newsletter_opt_in'),
    check('marketing_opt_in'),
    check('terms_accepted_at'),
    check('last_prompt_at'),
    check('username'),
    check('created_at'),
    check('updated_at'),
  ]);
  
  return columnChecks;
}

const requestSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'El nombre no puede estar vacío')
    .max(80, 'El nombre es demasiado largo')
    .optional()
    .nullable(),
  username: z
    .string()
    .trim()
    .min(3, 'El nombre de usuario debe tener al menos 3 caracteres')
    .max(24, 'El nombre de usuario es demasiado largo')
    .regex(/^[a-z0-9._-]+$/, 'El nombre de usuario solo puede contener letras, números, puntos y guiones'),
  marketingOptIn: z.boolean().optional(),
  termsAccepted: z.literal(true, {
    errorMap: () => ({
      message: 'Debes aceptar los términos y condiciones para continuar.',
    }),
  }),
  redirectTo: z.string().optional(),
  referralEmail: z.string().email().optional().nullable(),
});

function sanitizeUsername(username: string) {
  return username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 24);
}

export async function POST(request: Request) {
  try {
    const pleiaUser = await getPleiaServerUser();
    if (!pleiaUser?.id || !pleiaUser.email) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const json = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(json);

    if (!parsed.success) {
      const message =
        parsed.error.errors[0]?.message || 'La información enviada no es válida. Revisa los campos.';
      return NextResponse.json(
        { ok: false, error: 'validation_error', message },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();
    const supabase = admin ?? (await createSupabaseRouteClient());

    const normalizedEmail = pleiaUser.email.toLowerCase();
    // 🚨 CRITICAL: marketingOptIn debe ser explícitamente true o false
    // Si no se proporciona, debe ser false
    let marketingOptIn = parsed.data.marketingOptIn === true;
    
    try {
      const { data: existingNewsletter } = await supabase
        .from('newsletter')
        .select('email')
        .eq('email', normalizedEmail)
        .maybeSingle();
      if (existingNewsletter?.email) {
        marketingOptIn = true;
      }
    } catch (newsletterLookupError) {
      console.warn('[AUTH] Failed to inspect newsletter subscription during onboarding:', newsletterLookupError);
    }
    
    console.log('[AUTH-COMPLETE] Marketing opt-in value:', {
      provided: parsed.data.marketingOptIn,
      final: marketingOptIn,
      type: typeof marketingOptIn
    });
    const redirectTo = parsed.data.redirectTo && parsed.data.redirectTo.startsWith('/')
      ? parsed.data.redirectTo
      : '/';

    // 🚨 CRITICAL: Buscar usuario existente con logs detallados
    console.log('[AUTH-COMPLETE] ===== SEARCHING FOR EXISTING USER =====');
    console.log('[AUTH-COMPLETE] User ID:', pleiaUser.id);
    console.log('[AUTH-COMPLETE] Email:', pleiaUser.email);
    
    // 🚨 CRITICAL: Verificar directamente en la BD además de findUsageUser
    // para debugging (reutilizar admin ya declarado arriba)
    if (admin) {
      const { data: directCheck, error: directError } = await admin
        .from('users')
        .select('id, email, username, terms_accepted_at')
        .or(`id.eq.${pleiaUser.id},email.eq.${pleiaUser.email}`)
        .maybeSingle();
      
      console.log('[AUTH-COMPLETE] Direct DB check:', {
        found: !!directCheck,
        error: directError?.message,
        data: directCheck ? {
          id: directCheck.id,
          email: directCheck.email,
          username: directCheck.username,
          terms_accepted_at: directCheck.terms_accepted_at,
        } : null,
      });
    }
    
    const existingUser = await findUsageUser({
      userId: pleiaUser.id,
      email: pleiaUser.email,
    });

    console.log('[AUTH-COMPLETE] findUsageUser result:', {
      found: !!existingUser,
      id: existingUser?.id,
      email: existingUser?.email,
      username: existingUser?.username,
      terms_accepted_at: existingUser?.terms_accepted_at,
      hasCompleteAccount: !!(existingUser?.terms_accepted_at && existingUser?.username),
    });

    // 🚨 CRITICAL: Solo rechazar si tiene cuenta PLEIA completa (terms_accepted_at Y username)
    // Si solo tiene terms_accepted_at pero no username, permitir completar el onboarding
    if (existingUser?.terms_accepted_at && existingUser?.username) {
      console.log('[AUTH-COMPLETE] ⚠️ Account already completed, rejecting');
      return NextResponse.json(
        { ok: false, error: 'already_completed', redirectTo },
        { status: 409 },
      );
    }

    const ensuredUser =
      existingUser ||
      (await getOrCreateUsageUser({
        userId: pleiaUser.id,
        email: pleiaUser.email,
      }));

    if (!ensuredUser) {
      return NextResponse.json(
        { ok: false, error: 'failed_to_create_user' },
        { status: 500 },
      );
    }

    const now = new Date().toISOString();
    const defaultLimit = resolveDefaultMaxUses(ensuredUser.plan || 'free', ensuredUser.max_uses);
    const sanitizedUsername = sanitizeUsername(parsed.data.username);
    if (!sanitizedUsername) {
      return NextResponse.json(
        { ok: false, error: 'validation_error', message: 'El nombre de usuario no es válido.' },
        { status: 400 },
      );
    }

    // 🚨 CRITICAL: Detectar qué columnas existen en la base de datos
    const supabaseAdmin = getSupabaseAdmin();
    const columns = await detectColumns(supabaseAdmin);
    
    console.log('[AUTH-COMPLETE] ===== DETECTED COLUMNS =====');
    console.log('[AUTH-COMPLETE] Available columns:', columns);
    console.log('[AUTH-COMPLETE] Ensured user:', {
      id: ensuredUser.id,
      email: ensuredUser.email,
      username: ensuredUser.username,
      terms_accepted_at: ensuredUser.terms_accepted_at,
      hasUsername: !!ensuredUser.username,
      hasTerms: !!ensuredUser.terms_accepted_at,
    });

    const updatePayload: Record<string, any> = {};

    // 🚨 CRITICAL: Siempre intentar actualizar terms_accepted_at si la columna existe
    // NO verificar si ensuredUser tiene la propiedad, solo si la columna existe en la BD
    if (columns.terms_accepted_at) {
      updatePayload.terms_accepted_at = now;
      console.log('[AUTH-COMPLETE] ✅ Adding terms_accepted_at to updatePayload:', now);
    } else {
      console.warn('[AUTH-COMPLETE] ⚠️ terms_accepted_at column does not exist in database');
    }

    // 🚨 CRITICAL: Siempre intentar actualizar username si la columna existe y es diferente
    if (columns.username) {
      if (!ensuredUser.username || ensuredUser.username !== sanitizedUsername) {
        updatePayload.username = sanitizedUsername;
        console.log('[AUTH-COMPLETE] ✅ Adding username to updatePayload:', sanitizedUsername);
      } else {
        console.log('[AUTH-COMPLETE] ℹ️ Username already matches, skipping update');
      }
    } else {
      console.warn('[AUTH-COMPLETE] ⚠️ username column does not exist in database');
    }

    // 🚨 CRITICAL: Actualizar marketing_opt_in siempre (true o false explícitamente)
    if (columns.marketing_opt_in) {
      updatePayload.marketing_opt_in = marketingOptIn === true; // Asegurar que sea boolean explícito
      console.log('[AUTH-COMPLETE] ✅ Setting marketing_opt_in to:', updatePayload.marketing_opt_in);
    }
    if (columns.newsletter_opt_in) {
      updatePayload.newsletter_opt_in = marketingOptIn === true; // Asegurar que sea boolean explícito
      console.log('[AUTH-COMPLETE] ✅ Setting newsletter_opt_in to:', updatePayload.newsletter_opt_in);
    }
    if (!ensuredUser.plan) {
      updatePayload.plan = 'free';
    }
    if (typeof ensuredUser.usage_count !== 'number') {
      updatePayload.usage_count = 0;
    }
    if (ensuredUser.max_uses == null) {
      updatePayload.max_uses = defaultLimit ?? getUsageLimit();
    }

    // 🚨 CRITICAL: Asignar is_early_founder_candidate si la columna existe
    // Solo los primeros 1000 usuarios que completan el onboarding deben tenerlo como true
    if (columns.is_early_founder_candidate) {
      // Si el usuario ya tiene el flag, mantenerlo
      if (ensuredUser.is_early_founder_candidate === true) {
        // Ya es early founder candidate, mantenerlo
        console.log('[AUTH-COMPLETE] ✅ User already has is_early_founder_candidate = true');
      } else {
        // Verificar cuántos usuarios ya tienen el flag
        try {
          const { count, error: countError } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('is_early_founder_candidate', true);
          
          const currentCount = count || 0;
          console.log('[AUTH-COMPLETE] Current early founder candidates:', currentCount);
          
          if (countError) {
            console.warn('[AUTH-COMPLETE] ⚠️ Error counting early founder candidates:', countError);
            // En caso de error, usar false por seguridad
            updatePayload.is_early_founder_candidate = false;
          } else if (currentCount < 1000) {
            // Aún hay espacio para más early founder candidates
            updatePayload.is_early_founder_candidate = true;
            console.log('[AUTH-COMPLETE] ✅ Assigning is_early_founder_candidate = true (count: ' + currentCount + '/1000)');
          } else {
            // Ya hay 1000 o más, asignar false
            updatePayload.is_early_founder_candidate = false;
            console.log('[AUTH-COMPLETE] ⚠️ Not assigning is_early_founder_candidate (limit reached: ' + currentCount + '/1000)');
          }
        } catch (countErr) {
          console.error('[AUTH-COMPLETE] ❌ Error checking early founder candidate count:', countErr);
          // En caso de error, usar false por seguridad
          updatePayload.is_early_founder_candidate = false;
        }
      }
    }

    console.log('[AUTH-COMPLETE] ===== UPDATE PAYLOAD =====');
    console.log('[AUTH-COMPLETE] Payload:', JSON.stringify(updatePayload, null, 2));
    console.log('[AUTH-COMPLETE] Payload keys:', Object.keys(updatePayload));
    console.log('[AUTH-COMPLETE] Payload values check:', {
      hasTerms: 'terms_accepted_at' in updatePayload,
      termsValue: updatePayload.terms_accepted_at,
      hasMarketing: 'marketing_opt_in' in updatePayload,
      marketingValue: updatePayload.marketing_opt_in,
      hasUsername: 'username' in updatePayload,
      usernameValue: updatePayload.username,
      hasEarlyFounder: 'is_early_founder_candidate' in updatePayload,
      earlyFounderValue: updatePayload.is_early_founder_candidate,
    });
    console.log('[AUTH-COMPLETE] Payload values:', {
      terms_accepted_at: updatePayload.terms_accepted_at,
      username: updatePayload.username,
      marketing_opt_in: updatePayload.marketing_opt_in,
      newsletter_opt_in: updatePayload.newsletter_opt_in,
      is_early_founder_candidate: updatePayload.is_early_founder_candidate,
    });

    let updatedUser = ensuredUser;

    if (Object.keys(updatePayload).length > 0) {
      console.log('[AUTH-COMPLETE] 🔄 Executing UPDATE query...');
      console.log('[AUTH-COMPLETE] User ID:', pleiaUser.id);
      console.log('[AUTH-COMPLETE] Update payload:', updatePayload);
      
      // 🚨 CRITICAL: Construir select dinámicamente basado en columnas disponibles
      // Incluir TODAS las columnas que estamos actualizando para asegurar que se devuelvan
      const selectFields = [
        'id',
        'email',
        'plan',
        'usage_count',
        'max_uses',
        columns.username ? 'username' : undefined,
        columns.terms_accepted_at ? 'terms_accepted_at' : undefined,
        columns.marketing_opt_in ? 'marketing_opt_in' : undefined,
        columns.newsletter_opt_in ? 'newsletter_opt_in' : undefined,
        columns.is_early_founder_candidate ? 'is_early_founder_candidate' : undefined,
      ].filter(Boolean).join(', ');

      console.log('[AUTH-COMPLETE] Select fields:', selectFields);

      // 🚨 CRITICAL: Verificar el estado ANTES del UPDATE
      const { data: beforeUpdate } = await supabaseAdmin
        .from('users')
        .select('id, username, terms_accepted_at, marketing_opt_in')
        .eq('id', pleiaUser.id)
        .maybeSingle();
      
      console.log('[AUTH-COMPLETE] State BEFORE update:', {
        username: beforeUpdate?.username,
        terms_accepted_at: beforeUpdate?.terms_accepted_at,
        marketing_opt_in: beforeUpdate?.marketing_opt_in,
      });

      // 🚨 CRITICAL: Ejecutar UPDATE sin SELECT primero para asegurar que se guarde
      // Luego hacer SELECT separado para obtener los datos
      console.log('[AUTH-COMPLETE] Executing UPDATE (without SELECT first)...');
      const { error: updateError, count: updateCount } = await supabaseAdmin
        .from('users')
        .update(updatePayload)
        .eq('id', pleiaUser.id);
      
      console.log('[AUTH-COMPLETE] UPDATE execution result:', {
        hasError: !!updateError,
        error: updateError?.message,
        errorCode: updateError?.code,
        rowsAffected: updateCount,
        updatePayload: updatePayload,
      });
      
      if (updateError) {
        console.error('[AUTH-COMPLETE] ❌ UPDATE failed:', updateError);
        if (updateError.code === '23505') {
          return NextResponse.json(
            { ok: false, error: 'username_taken' },
            { status: 409 },
          );
        }
        return NextResponse.json(
          { ok: false, error: 'failed_to_update_user', details: updateError.message },
          { status: 500 },
        );
      }
      
      // Si el UPDATE funcionó, ahora hacer SELECT para obtener los datos actualizados
      console.log('[AUTH-COMPLETE] UPDATE succeeded, now fetching updated data...');
      const { data, error: selectError } = await supabaseAdmin
        .from('users')
        .select('id, email, username, terms_accepted_at, marketing_opt_in, newsletter_opt_in, is_early_founder_candidate, plan, usage_count, max_uses')
        .eq('id', pleiaUser.id)
        .maybeSingle();
      
      console.log('[AUTH-COMPLETE] SELECT after UPDATE:', {
        hasData: !!data,
        hasError: !!selectError,
        error: selectError?.message,
        dataKeys: data ? Object.keys(data) : null,
        data: data,
      });
      
      // 🚨 CRITICAL: Si hay error en el SELECT, pero el UPDATE funcionó, continuar
      // El UPDATE ya se ejecutó exitosamente arriba, así que los datos deberían estar guardados
      if (selectError) {
        console.warn('[AUTH-COMPLETE] ⚠️ SELECT after UPDATE failed, but UPDATE succeeded:', selectError);
        // Continuar - el UPDATE ya funcionó, los datos están guardados
      }
      
      if (data) {
        updatedUser = { ...updatedUser, ...data };
        console.log('[AUTH-COMPLETE] ✅ User updated successfully (data from SELECT):', {
          userId: pleiaUser.id,
          email: pleiaUser.email,
          username: data.username,
          terms_accepted_at: data.terms_accepted_at,
          marketing_opt_in: data.marketing_opt_in,
          hasUsername: !!data.username,
          hasTerms: !!data.terms_accepted_at,
          fullData: data,
        });
      } else {
        console.warn('[AUTH-COMPLETE] ⚠️ SELECT after UPDATE returned no data - will rely on fresh read');
      }
      
      // 🚨 CRITICAL: SIEMPRE forzar relectura de la base de datos después del UPDATE
      // Incluso si data está presente, re-leer para asegurar consistencia
      // Esto es especialmente importante si el UPDATE no devolvió datos
      console.log('[AUTH-COMPLETE] 🔄 Re-reading user data to verify update...');
      // Delay más largo para asegurar que la escritura se haya completado y propagado
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 🚨 CRITICAL: Usar SELECT directo sin campos dinámicos para asegurar que obtenemos los datos
      const { data: freshData, error: freshError } = await supabaseAdmin
        .from('users')
        .select('id, email, username, terms_accepted_at, marketing_opt_in, newsletter_opt_in, is_early_founder_candidate, plan, usage_count, max_uses')
        .eq('id', pleiaUser.id)
        .maybeSingle();
      
      console.log('[AUTH-COMPLETE] Fresh read result:', {
        hasData: !!freshData,
        hasError: !!freshError,
        error: freshError?.message,
        dataKeys: freshData ? Object.keys(freshData) : null,
        username: freshData?.username,
        terms_accepted_at: freshData?.terms_accepted_at,
      });
      
      if (freshError) {
        console.error('[AUTH-COMPLETE] ❌ Error re-reading user:', freshError);
      } else if (freshData) {
        updatedUser = { ...updatedUser, ...freshData };
        console.log('[AUTH-COMPLETE] ✅ Verified user data after update:', {
          userId: pleiaUser.id,
          username: freshData.username,
          terms_accepted_at: freshData.terms_accepted_at,
          hasCompleteAccount: !!(freshData.username && freshData.terms_accepted_at),
          fullFreshData: freshData,
        });
      } else {
        console.error('[AUTH-COMPLETE] ❌ CRITICAL: No fresh data found after update - trying direct query...');
        // Último intento: consulta directa sin SELECT dinámico
        const { data: directData, error: directError } = await supabaseAdmin
          .from('users')
          .select('id, email, username, terms_accepted_at, marketing_opt_in, newsletter_opt_in')
          .eq('id', pleiaUser.id)
          .maybeSingle();
        
        if (directError) {
          console.error('[AUTH-COMPLETE] ❌ Direct query also failed:', directError);
        } else if (directData) {
          updatedUser = { ...updatedUser, ...directData };
          console.log('[AUTH-COMPLETE] ✅ Got data from direct query:', {
            username: directData.username,
            terms_accepted_at: directData.terms_accepted_at,
            hasCompleteAccount: !!(directData.username && directData.terms_accepted_at),
          });
        } else {
          console.error('[AUTH-COMPLETE] ❌ CRITICAL: User not found in database after update!');
        }
      }
    }

    try {
      if (marketingOptIn) {
        await supabase
          .from('newsletter')
          .upsert(
            {
              email: normalizedEmail,
              subscribed_at: now,
              manually_added: false,
            },
            { onConflict: 'email' },
          );
      } else {
        await supabase.from('newsletter').delete().eq('email', normalizedEmail);
      }
    } catch (newsletterError) {
      console.warn('[AUTH] Failed to sync newsletter opt-in during onboarding:', newsletterError);
    }

    // Disparar workflows con trigger pleia_account_created (si existen), independientemente del opt-in
    try {
      const newsletterClient = await getNewsletterAdminClient();
      const { data: workflows } = await newsletterClient
        .from('newsletter_workflows')
        .select('id, name, is_active, trigger_type, steps:newsletter_workflow_steps(*)')
        .eq('trigger_type', 'pleia_account_created')
        .eq('is_active', true);

      if (workflows && workflows.length > 0) {
        const contact = await ensureContactByEmail(newsletterClient, normalizedEmail, {
          name: parsed.data.displayName || sanitizedUsername,
          origin: 'pleia-account-created',
        });

        for (const workflow of workflows) {
          workflow.steps.sort((a: any, b: any) => a.step_order - b.step_order);
          await executeWorkflowSteps({
            supabase: newsletterClient,
            workflow,
            contact: { id: contact.id, email: contact.email },
            startIndex: 0,
          });
        }
      }
    } catch (workflowError) {
      console.warn('[AUTH] Failed to trigger pleia_account_created workflows:', workflowError);
    }

    const supabaseRoute = await createSupabaseRouteClient();
    const {
      data: { user },
    } = await supabaseRoute.auth.getUser();

    if (parsed.data.displayName && user?.id && admin?.auth?.admin) {
      try {
        await admin.auth.admin.updateUserById(pleiaUser.id, {
          user_metadata: {
            ...(user.user_metadata || {}),
            full_name: parsed.data.displayName,
            name: parsed.data.displayName,
          },
        });
      } catch (metaError) {
        console.warn('[AUTH] Failed to update user metadata during onboarding:', metaError);
      }
    }

    if (sanitizedUsername) {
      try {
        await cacheUsernameMapping({
          username: sanitizedUsername,
          email: pleiaUser.email,
          userId: pleiaUser.id,
        });
      } catch (cacheError) {
        console.warn('[AUTH] Failed to cache username mapping during onboarding:', cacheError);
      }
    }

    // 🚨 CRITICAL: Verificar una última vez que la cuenta está completa antes de responder
    // Usar updatedUser primero (datos más recientes de la relectura), luego findUsageUser como fallback
    const hasCompleteFromUpdatedUser = !!(updatedUser?.terms_accepted_at && updatedUser?.username);
    
    console.log('[AUTH-COMPLETE] ===== FINAL CHECK BEFORE RESPONSE =====');
    console.log('[AUTH-COMPLETE] User ID:', pleiaUser.id);
    console.log('[AUTH-COMPLETE] Email:', pleiaUser.email);
    console.log('[AUTH-COMPLETE] Updated user data:', {
      username: updatedUser?.username,
      terms_accepted_at: updatedUser?.terms_accepted_at,
      hasUsername: !!updatedUser?.username,
      hasTerms: !!updatedUser?.terms_accepted_at,
      hasCompleteAccount: hasCompleteFromUpdatedUser,
      fullUpdatedUser: updatedUser,
    });
    
    // Si updatedUser no tiene los datos completos, intentar findUsageUser como fallback
    let finalHasCompleteAccount = hasCompleteFromUpdatedUser;
    let finalCheck = updatedUser;
    
    if (!hasCompleteFromUpdatedUser) {
      console.log('[AUTH-COMPLETE] ⚠️ Updated user incomplete, trying findUsageUser as fallback...');
      // Delay adicional antes de buscar para dar tiempo a que se propague
      await new Promise(resolve => setTimeout(resolve, 200));
      
      finalCheck = await findUsageUser({
        userId: pleiaUser.id,
        email: pleiaUser.email,
      });
      
      const fallbackHasCompleteAccount = !!(finalCheck?.terms_accepted_at && finalCheck?.username);
      console.log('[AUTH-COMPLETE] findUsageUser fallback result:', {
        found: !!finalCheck,
        username: finalCheck?.username,
        terms_accepted_at: finalCheck?.terms_accepted_at,
        hasCompleteAccount: fallbackHasCompleteAccount,
        fullFinalCheck: finalCheck,
      });
      
      if (fallbackHasCompleteAccount) {
        // Si findUsageUser encuentra datos completos, usar esos y actualizar updatedUser
        updatedUser = { ...updatedUser, ...finalCheck };
        finalHasCompleteAccount = true;
        console.log('[AUTH-COMPLETE] ✅ Using findUsageUser data as final');
      } else {
        console.error('[AUTH-COMPLETE] ❌ CRITICAL: Account not complete after update!', {
          updatedUser: {
            username: updatedUser?.username,
            terms_accepted_at: updatedUser?.terms_accepted_at,
          },
          findUsageUser: {
            username: finalCheck?.username,
            terms_accepted_at: finalCheck?.terms_accepted_at,
          },
        });
      }
    } else {
      console.log('[AUTH-COMPLETE] ✅ Account complete from updatedUser');
    }

    // 🚨 CRITICAL: Track referral si existe cuando se crea la cuenta
    // Esto se hace después de que la cuenta esté completa para asegurar que el tracking funcione
    if (finalHasCompleteAccount && parsed.data.referralEmail) {
      try {
        const refEmail = parsed.data.referralEmail.toLowerCase().trim();
        
        if (refEmail && refEmail !== pleiaUser.email.toLowerCase()) {
          console.log('[AUTH-COMPLETE] Tracking referral on account creation:', {
            newUser: pleiaUser.email,
            referrer: refEmail
          });
          
          // 🚨 CRITICAL: Llamar directamente a la lógica de tracking en lugar de hacer fetch
          // Esto evita problemas de autenticación y es más eficiente
          try {
            const { REFERRALS_ENABLED, canInvite } = await import('@/lib/referrals');
            const { getUserPlan } = await import('@/lib/billing/usageV2');
            
            if (REFERRALS_ENABLED) {
              // Verificar si el referrer puede invitar
              let isEarlyFounderCandidate = false;
              try {
                const planContext = await getUserPlan(refEmail);
                isEarlyFounderCandidate = !!planContext?.isEarlyFounderCandidate;
              } catch (planError) {
                console.warn('[AUTH-COMPLETE] Could not check referrer plan:', planError);
              }
              
              if (canInvite(refEmail, { isEarlyCandidate: isEarlyFounderCandidate })) {
                // Actualizar stats del referrer directamente
                const kv = await import('@vercel/kv');
                const referrerProfileKey = `jey_user_profile:${refEmail}`;
                const referrerProfile = (await kv.kv.get(referrerProfileKey) || {}) as { 
                  referredQualifiedCount?: number; 
                  referrals?: string[]; 
                  plan?: string; 
                  founderSince?: string;
                };
                
                const referredQualifiedCount = (referrerProfile.referredQualifiedCount || 0) + 1;
                const referrals = referrerProfile.referrals || [];
                
                if (!referrals.includes(pleiaUser.email.toLowerCase())) {
                  referrals.push(pleiaUser.email.toLowerCase());
                }
                
                const updatedReferrerProfile = {
                  ...referrerProfile,
                  email: refEmail,
                  referrals,
                  referredQualifiedCount,
                  updatedAt: new Date().toISOString()
                };
                
                // 🚨 CRITICAL: Si alcanza 3/3, actualizar a founder
                const { REF_REQUIRED_COUNT } = await import('@/lib/referrals');
                if (referredQualifiedCount >= REF_REQUIRED_COUNT) {
                  const { setUserPlan } = await import('@/lib/billing/usage');
                  const now = new Date().toISOString();
                  
                  updatedReferrerProfile.plan = 'founder';
                  updatedReferrerProfile.founderSince = now;
                  
                  // Actualizar en Supabase
                  await setUserPlan(refEmail, 'founder', {
                    isFounder: true,
                    since: now
                  });
                  
                  // Enviar email de bienvenida
                  try {
                    const { sendFounderWelcomeEmail } = await import('@/lib/newsletter/workflows');
                    await sendFounderWelcomeEmail(refEmail, {
                      origin: 'referral_founder_upgrade_account_creation'
                    });
                  } catch (emailError) {
                    console.error('[AUTH-COMPLETE] Error sending founder email:', emailError);
                  }
                }
                
                await kv.kv.set(referrerProfileKey, updatedReferrerProfile);
                
                // También actualizar el perfil del nuevo usuario con el referrer
                const newUserProfileKey = `jey_user_profile:${pleiaUser.email.toLowerCase()}`;
                const newUserProfile = (await kv.kv.get(newUserProfileKey) || {}) as Record<string, any>;
                await kv.kv.set(newUserProfileKey, {
                  ...newUserProfile,
                  email: pleiaUser.email.toLowerCase(),
                  referredBy: refEmail,
                  updatedAt: new Date().toISOString()
                });
                
                console.log('[AUTH-COMPLETE] ✅ Referral tracked successfully:', {
                  referrer: refEmail,
                  newUser: pleiaUser.email,
                  qualifiedCount: referredQualifiedCount
                });
              } else {
                console.log('[AUTH-COMPLETE] Referrer cannot invite:', refEmail);
              }
            }
          } catch (trackError) {
            console.error('[AUTH-COMPLETE] ❌ Error tracking referral:', trackError);
            // No fallar la creación de cuenta si falla el tracking
          }
        }
      } catch (refError) {
        console.error('[AUTH-COMPLETE] ❌ Error processing referral:', refError);
        // No fallar la creación de cuenta si falla el tracking
      }
    }

    return NextResponse.json({
      ok: true,
      redirectTo,
      username: updatedUser.username ?? sanitizedUsername,
      termsAcceptedAt: updatedUser.terms_accepted_at ?? now,
      marketingOptIn,
      hasCompleteAccount: finalHasCompleteAccount, // 🚨 CRITICAL: Informar al cliente si la cuenta está completa
    });
  } catch (error) {
    console.error('[AUTH] Unexpected error completing account:', error);
    return NextResponse.json(
      { ok: false, error: 'unexpected_error' },
      { status: 500 },
    );
  }
}


