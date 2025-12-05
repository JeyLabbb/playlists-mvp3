import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || 'onboarding@resend.dev';
const ALLOWLIST_TO = process.env.ALLOWLIST_TO || 'jeylabbb@gmail.com';

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export async function POST(req) {
  try {
    const { fullName, email } = await req.json();

    if (!fullName || fullName.trim().length < 2) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    if (!resend) {
      console.error('[ALLOWLIST] Missing RESEND_API_KEY');
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    await resend.emails.send({
      from: RESEND_FROM,
      to: ALLOWLIST_TO,
      subject: `Allowlist Spotify: ${email}`,
      text: [
        'Nueva solicitud de acceso',
        `Nombre: ${fullName}`,
        `Email (Spotify): ${email}`,
        `Fecha: ${new Date().toISOString()}`
      ].join('\n')
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[ALLOWLIST] Error:', e);
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }
}
