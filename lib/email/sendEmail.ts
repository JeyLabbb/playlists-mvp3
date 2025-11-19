type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'PLEIA <onboarding@resend.dev>';
  const replyTo = process.env.CONTACT_EMAIL || undefined;

  if (!apiKey) {
    return { ok: false as const, status: 500, error: 'RESEND_API_KEY missing' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text: text || html.replace(/<[^>]+>/g, ' '),
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || data?.error) {
      const message =
        data?.error?.message ||
        data?.message ||
        (typeof data === 'string' ? data : null) ||
        `HTTP ${response.status}`;
      return { ok: false as const, status: response.status, error: message, raw: data };
    }

    return { ok: true as const, status: response.status, id: data?.id || null, raw: data };
  } catch (error: any) {
    return {
      ok: false as const,
      status: 500,
      error: error?.message || 'Failed to send email',
      raw: error,
    };
  }
}

