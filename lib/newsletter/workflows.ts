import { sendNewsletterEmail } from '@/lib/email/newsletterProvider';
import { getNewsletterAdminClient, getContactById, assignContactToGroups, removeContactFromGroups } from '@/lib/newsletter/server';

type WorkflowRecord = {
  id: string;
  name: string;
  steps: Array<{
    id: string;
    step_order: number;
    action_type: string;
    action_config: Record<string, any>;
  }>;
};

export async function ensureFounderWorkflow(
  supabase: Awaited<ReturnType<typeof getNewsletterAdminClient>>,
) {
  // Crea (si no existe) un workflow de ejemplo para Founder Pass visible en la HQ
  try {
    const { data: existing, error } = await supabase
      .from('newsletter_workflows')
      .select('id, name')
      .eq('name', 'Founder Pass · Bienvenida')
      .limit(1);

    if (error) {
      console.warn('[NEWSLETTER] ensureFounderWorkflow lookup error:', error);
      return null;
    }
    if (existing && existing.length > 0) {
      return existing[0].id;
    }

    const { data: workflow, error: insertError } = await supabase
      .from('newsletter_workflows')
      .insert({
        name: 'Founder Pass · Bienvenida',
        description:
          'Ejemplo de workflow para compradores del Founder Pass. Puedes editar pasos y mails desde la HQ.',
        trigger_type: 'manual',
        trigger_config: {},
        is_active: true,
      })
      .select('id')
      .single();

    if (insertError) {
      console.warn('[NEWSLETTER] ensureFounderWorkflow insert error:', insertError);
      return null;
    }

    // Paso inicial vacío: enviar mail guardado (elige el mail desde la UI)
    await supabase.from('newsletter_workflow_steps').insert({
      workflow_id: workflow.id,
      step_order: 0,
      action_type: 'send_saved_mail',
      action_config: {},
    });

    console.log('[NEWSLETTER] ensureFounderWorkflow created example workflow with id:', workflow.id);
    return workflow.id;
  } catch (e) {
    console.warn('[NEWSLETTER] ensureFounderWorkflow failed:', e);
    return null;
  }
}

export async function ensureOutOfCreditsWorkflow(
  supabase: Awaited<ReturnType<typeof getNewsletterAdminClient>>,
) {
  // Crea (si no existe) el workflow automático para "Out of Credits" visible en la HQ
  try {
    const { data: existing, error } = await supabase
      .from('newsletter_workflows')
      .select('id, name')
      .eq('name', 'Out of Credits · Automático')
      .limit(1);

    if (error) {
      console.warn('[NEWSLETTER] ensureOutOfCreditsWorkflow lookup error:', error);
      return null;
    }
    if (existing && existing.length > 0) {
      console.log('[NEWSLETTER] Out of Credits workflow already exists:', existing[0].id);
      return existing[0].id;
    }

    const { data: workflow, error: insertError } = await supabase
      .from('newsletter_workflows')
      .insert({
        name: 'Out of Credits · Automático',
        description:
          'Workflow automático que se activa cuando un usuario agota sus créditos. Envía email con opciones de upgrade. Visible en campañas y tracking.',
        trigger_type: 'automatic',
        trigger_config: {
          event: 'out_of_credits',
          condition: 'first_attempt_with_zero_uses',
        },
        is_active: true,
      })
      .select('id')
      .single();

    if (insertError) {
      console.warn('[NEWSLETTER] ensureOutOfCreditsWorkflow insert error:', insertError);
      return null;
    }

    // Paso 1: Enviar campaña de out of credits
    await supabase.from('newsletter_workflow_steps').insert({
      workflow_id: workflow.id,
      step_order: 0,
      action_type: 'send_campaign',
      action_config: {
        campaign_type: 'out_of_credits',
        tracking_enabled: true,
      },
    });

    console.log('[NEWSLETTER] ensureOutOfCreditsWorkflow created workflow with id:', workflow.id);
    return workflow.id;
  } catch (e) {
    console.warn('[NEWSLETTER] ensureOutOfCreditsWorkflow failed:', e);
    return null;
  }
}

export async function sendWorkflowCampaignEmail(
  supabase: Awaited<ReturnType<typeof getNewsletterAdminClient>>,
  campaignId: string,
  contact: { id: string; email: string },
) {
  const { data: campaign, error: campaignError } = await supabase
    .from('newsletter_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();
  if (campaignError) throw campaignError;

  const { data: recipient, error: recipientError } = await supabase
    .from('newsletter_campaign_recipients')
    .insert({
      campaign_id: campaign.id,
      contact_id: contact.id,
      email: contact.email,
      status: 'pending',
    })
    .select('*')
    .single();
  if (recipientError) throw recipientError;

  await sendNewsletterEmail(
    [{ email: recipient.email, contactId: recipient.contact_id, recipientId: recipient.id }],
    {
      subject: campaign.subject,
      title: campaign.title,
      message: campaign.body,
      primaryCta:
        campaign.primary_cta_label && campaign.primary_cta_url
          ? { label: campaign.primary_cta_label, url: campaign.primary_cta_url }
          : undefined,
      secondaryCta:
        campaign.secondary_cta_label && campaign.secondary_cta_url
          ? { label: campaign.secondary_cta_label, url: campaign.secondary_cta_url }
          : undefined,
      campaignContext: {
        campaignId: campaign.id,
        recipientTokenMap: {
          [recipient.email.toLowerCase()]: { recipientId: recipient.id },
        },
      },
    },
  );

  await supabase
    .from('newsletter_campaign_recipients')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      delivered_at: new Date().toISOString(),
    })
    .eq('id', recipient.id);

  await supabase.from('newsletter_events').insert({
    campaign_id: campaign.id,
    recipient_id: recipient.id,
    contact_id: contact.id,
    occurred_at: new Date().toISOString(),
    event_type: 'delivered',
  });
}

export async function sendWorkflowSavedMailEmail(
  supabase: Awaited<ReturnType<typeof getNewsletterAdminClient>>,
  mailId: string,
  contact: { id: string; email: string },
) {
  const { data: mail, error } = await supabase
    .from('newsletter_saved_mails')
    .select('*, template:newsletter_templates(*)')
    .eq('id', mailId)
    .single();
  if (error) throw error;
  if (!mail) return;

  const primaryCta =
    mail.template?.primary_cta?.label && mail.template?.primary_cta?.url
      ? { label: mail.template.primary_cta.label, url: mail.template.primary_cta.url }
      : undefined;
  const secondaryCta =
    mail.template?.secondary_cta?.label && mail.template?.secondary_cta?.url
      ? { label: mail.template.secondary_cta.label, url: mail.template.secondary_cta.url }
      : undefined;

  await sendNewsletterEmail([{ email: contact.email, contactId: contact.id }], {
    subject: mail.subject || mail.name,
    title: mail.name,
    message: mail.body,
    primaryCta,
    secondaryCta,
  });
}

export async function executeWorkflowSteps({
  supabase,
  workflow,
  contact,
  startIndex = 0,
}: {
  supabase: Awaited<ReturnType<typeof getNewsletterAdminClient>>;
  workflow: WorkflowRecord;
  contact: { id: string; email: string };
  startIndex?: number;
}) {
  for (let i = startIndex; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    switch (step.action_type) {
      case 'wait': {
        const delayMinutes = Number(step.action_config?.minutes ?? step.action_config?.delay ?? 0);
        if (delayMinutes <= 0) {
          continue;
        }
        const scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
        await supabase.from('newsletter_jobs').insert({
          job_type: 'workflow-step',
          payload: {
            workflowId: workflow.id,
            contactId: contact.id,
            email: contact.email,
            nextStepIndex: i + 1,
          },
          scheduled_for: scheduledFor,
        });
        return;
      }
      case 'send_campaign': {
        const campaignId = step.action_config?.campaign_id;
        if (campaignId) {
          await sendWorkflowCampaignEmail(supabase, campaignId, contact);
        }
        break;
      }
      case 'add_to_group': {
        const groupId = step.action_config?.group_id;
        if (groupId) {
          await assignContactToGroups(supabase, contact.id, [groupId]);
        }
        break;
      }
      case 'send_saved_mail': {
        const mailId = step.action_config?.mail_id;
        if (mailId) {
          await sendWorkflowSavedMailEmail(supabase, mailId, contact);
        }
        break;
      }
      case 'remove_from_group': {
        const groupId = step.action_config?.group_id;
        if (groupId) {
          await removeContactFromGroups(supabase, contact.id, [groupId]);
        }
        break;
      }
      default:
        break;
    }
  }
}

export async function resolveWorkflowContact(
  supabase: Awaited<ReturnType<typeof getNewsletterAdminClient>>,
  contactId?: string,
  email?: string,
) {
  if (contactId) {
    const contact = await getContactById(supabase, contactId);
    if (contact) return contact;
  }
  if (email) {
    const { data } = await supabase
      .from('newsletter_contacts')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    if (data) return data;
  }
  return null;
}

/**
 * Envía el email de bienvenida a founder cuando un usuario cambia de 'free' a 'founder'.
 * Esta función debe llamarse SIEMPRE que el plan cambie a 'founder' (manual o automático).
 * Ahora también registra el envío en el sistema de tracking de newsletter.
 * 
 * @param email - Email del usuario que se convierte en founder
 * @param options - Opciones adicionales (origen del cambio, etc.)
 * @returns true si el email se envió correctamente, false en caso contrario
 */
export async function sendFounderWelcomeEmail(
  email: string,
  options: { origin?: string } = {}
): Promise<boolean> {
  const normalizedEmail = email.toLowerCase();
  console.log('[FOUNDER-WELCOME] Sending founder welcome email to:', normalizedEmail, 'origin:', options.origin || 'unknown');
  
  try {
    // Usar sendConfirmationEmail que busca mails guardados o usa el template SMTP
    const { sendConfirmationEmail } = await import('@/lib/resend');
    
    const planName = 'Founder Pass';
    const amount = '0.00'; // Para upgrades automáticos (referrals, etc.)
    const date = new Date().toLocaleDateString('es-ES');
    
    const emailSent = await sendConfirmationEmail(normalizedEmail, {
      planName,
      amount,
      date,
      sessionId: `founder_upgrade_${options.origin || 'manual'}_${Date.now()}`,
    });
    
    if (emailSent) {
      console.log('[FOUNDER-WELCOME] ✅ Founder welcome email sent successfully to:', normalizedEmail);
      
      // Registrar en el sistema de tracking de newsletter
      try {
        const supabase = await getNewsletterAdminClient();
        
        // Buscar o crear la campaña de Welcome Founder Pass
        let { data: campaign } = await supabase
          .from('newsletter_campaigns')
          .select('id')
          .eq('title', 'Welcome Founder Pass')
          .maybeSingle();
        
        if (!campaign) {
          // Crear la campaña si no existe
          const { data: newCampaign, error: createError } = await supabase
            .from('newsletter_campaigns')
            .insert({
              title: 'Welcome Founder Pass',
              subject: '¡Bienvenido al grupo FOUNDERS de PLEIA! 🎵',
              body: 'Mail de bienvenida automático para nuevos Founders',
              status: 'sent',
              send_mode: 'immediate',
              mail_category: 'founder',
              tracking_enabled: true,
              template_mode: 'pleia',
            })
            .select('id')
            .single();
          
          if (createError) {
            console.error('[FOUNDER-WELCOME] Error creating tracking campaign:', createError);
          } else {
            campaign = newCampaign;
            console.log('[FOUNDER-WELCOME] Created tracking campaign:', campaign?.id);
          }
        }
        
        if (campaign) {
          // Buscar o crear el contacto
          let { data: contact } = await supabase
            .from('newsletter_contacts')
            .select('id')
            .eq('email', normalizedEmail)
            .maybeSingle();
          
          if (!contact) {
            const { data: newContact } = await supabase
              .from('newsletter_contacts')
              .insert({
                email: normalizedEmail,
                status: 'subscribed',
                origin: 'founder_upgrade',
              })
              .select('id')
              .single();
            contact = newContact;
          }
          
          if (contact) {
            // Crear el recipient
            const { data: recipient, error: recipientError } = await supabase
              .from('newsletter_campaign_recipients')
              .insert({
                campaign_id: campaign.id,
                contact_id: contact.id,
                email: normalizedEmail,
                status: 'sent',
                sent_at: new Date().toISOString(),
                delivered_at: new Date().toISOString(),
              })
              .select('id')
              .single();
            
            if (recipientError) {
              console.error('[FOUNDER-WELCOME] Error creating recipient:', recipientError);
            } else {
              // Crear evento de delivered
              await supabase.from('newsletter_events').insert({
                campaign_id: campaign.id,
                recipient_id: recipient.id,
                contact_id: contact.id,
                occurred_at: new Date().toISOString(),
                event_type: 'delivered',
              });
              
              console.log('[FOUNDER-WELCOME] ✅ Tracking registered for:', normalizedEmail);
            }
          }
        }
      } catch (trackingError) {
        console.error('[FOUNDER-WELCOME] ⚠️ Error registering tracking (email was sent):', trackingError);
      }
      
      return true;
    } else {
      console.error('[FOUNDER-WELCOME] ❌ Failed to send founder welcome email to:', normalizedEmail);
      return false;
    }
  } catch (error) {
    console.error('[FOUNDER-WELCOME] ❌ Error sending founder welcome email:', error);
    return false;
  }
}

