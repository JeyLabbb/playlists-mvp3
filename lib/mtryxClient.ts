/**
 * MTRYX Client - Integración para enviar eventos de PLEIA a MTRYX
 * 
 * Este módulo permite enviar eventos (signup, usage, payment, etc.) a MTRYX
 * sin bloquear el flujo principal de PLEIA.
 */

export type MtryxContactPayload = {
  email?: string;
  name?: string;
  // Añade aquí otros campos básicos de usuario de PLEIA si tiene sentido (id interno, etc.)
  [key: string]: any;
};

export type MtryxEventPayload = {
  type: string;              // "signup", "usage", "payment", etc.
  source?: string;           // "signup_form", "play", "billing", etc.
  timestamp?: string;        // ISO string; si no se pasa, usar new Date().toISOString()
  contact?: MtryxContactPayload;
  data?: Record<string, any>; // payload extra específico del evento
};

/**
 * Envía un evento a MTRYX
 * 
 * Esta función es no bloqueante y no debe romper el flujo principal de PLEIA.
 * Si MTRYX no está configurado o hay un error, se loguea pero no se lanza excepción.
 * 
 * @param event - El evento a enviar
 * @returns Promise<void>
 */
export async function sendEventToMtryx(event: MtryxEventPayload): Promise<void> {
  const mtryxUrl = process.env.MTRYX_EVENTS_URL;
  const mtryxSecretKey = process.env.MTRYX_SECRET_KEY;

  // Validar que las variables de entorno estén configuradas
  if (!mtryxUrl || !mtryxSecretKey) {
    // En producción, solo loguear un warning; no lanzar excepción
    if (process.env.NODE_ENV === 'production') {
      console.warn('[MTRYX] MTRYX_EVENTS_URL o MTRYX_SECRET_KEY no configuradas - evento no enviado');
    } else {
      console.warn('[MTRYX] MTRYX_EVENTS_URL o MTRYX_SECRET_KEY no configuradas - evento no enviado', {
        hasUrl: !!mtryxUrl,
        hasKey: !!mtryxSecretKey,
        eventType: event.type,
      });
    }
    return;
  }

  // Asegurar que timestamp esté presente
  const eventWithTimestamp = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  };

  try {
    const response = await fetch(mtryxUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: mtryxSecretKey,
        ...eventWithTimestamp,
      }),
    });

    if (!response.ok) {
      // Intentar leer el cuerpo del error si existe
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch (readError) {
        // Ignorar error al leer el cuerpo
      }

      console.error('[MTRYX] Error enviando evento a MTRYX:', {
        status: response.status,
        statusText: response.statusText,
        eventType: event.type,
        errorBody: errorBody || 'No error body available',
      });
      return;
    }

    // Evento enviado exitosamente (no necesitamos loguear en producción para evitar spam)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[MTRYX] Evento enviado exitosamente:', {
        type: event.type,
        source: event.source,
        timestamp: eventWithTimestamp.timestamp,
      });
    }
  } catch (error: any) {
    // Error de red u otro error inesperado
    console.error('[MTRYX] Error de red enviando evento a MTRYX:', {
      error: error?.message || 'Unknown error',
      eventType: event.type,
      source: event.source,
      // No loguear el stack trace completo en producción para evitar spam
      ...(process.env.NODE_ENV !== 'production' ? { stack: error?.stack } : {}),
    });
    // TODO: En el futuro, considerar añadir reintentos aquí
    // TODO: Si el proyecto tiene un logger más serio, usarlo en lugar de console.error
  }
}

/**
 * Helper para trackear un signup
 */
export async function trackSignup(user: {
  email: string;
  name?: string | null;
  userId?: string;
  plan?: string;
  referralEmail?: string | null;
}): Promise<void> {
  await sendEventToMtryx({
    type: 'signup',
    source: 'pleia_signup',
    contact: {
      email: user.email,
      name: user.name || undefined,
      id: user.userId,
    },
    data: {
      plan: user.plan || 'free',
      referralEmail: user.referralEmail || undefined,
    },
  });
}

/**
 * Helper para trackear un uso de la herramienta
 */
export async function trackUsage(user: {
  email: string;
  userId?: string;
  feature?: string;
  remainingFreeUses?: number | 'unlimited';
  plan?: string;
  usageId?: string | null;
}): Promise<void> {
  await sendEventToMtryx({
    type: 'usage',
    source: 'pleia_usage',
    contact: {
      email: user.email,
      id: user.userId,
    },
    data: {
      feature: user.feature || 'playlist_generation',
      remainingFreeUses: user.remainingFreeUses,
      plan: user.plan || 'free',
      usageId: user.usageId || undefined,
    },
  });
}

/**
 * Helper para trackear un pago
 */
export async function trackPayment(paymentInfo: {
  email: string;
  userId?: string;
  amount: number;
  currency?: string;
  plan: string;
  stripeSessionId?: string;
  stripeCustomerId?: string;
}): Promise<void> {
  await sendEventToMtryx({
    type: 'payment',
    source: 'pleia_billing',
    contact: {
      email: paymentInfo.email,
      id: paymentInfo.userId,
    },
    data: {
      amount: paymentInfo.amount,
      currency: paymentInfo.currency || 'EUR',
      plan: paymentInfo.plan,
      stripeSessionId: paymentInfo.stripeSessionId,
      stripeCustomerId: paymentInfo.stripeCustomerId,
    },
  });
}

