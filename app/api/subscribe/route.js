import { NextResponse } from "next/server";

// --- Normaliza el payload (Formspree u otros) ---
function normalize(body) {
  let email = body.email || body._replyto || body.replyTo || body.reply_to || "";
  let name  = body.name  || body.nombre || "";

  // Formato Formspree: { data: [{ name:"email", value:"..." }, ...] }
  if ((!email || !name) && Array.isArray(body.data)) {
    for (const f of body.data) {
      if (!email && /email/i.test(f?.name))  email = f?.value || "";
      if (!name  && /(name|nombre)/i.test(f?.name)) name = f?.value || "";
    }
  }
  return {
    email: String(email || "").trim(),
    name:  String(name  || "").trim(),
    source: body.source || body.form_name || body.form || "Landing Formspree",
    raw: body,
  };
}

// --- Envío con Resend, devolviendo error legible ---
async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.RESEND_FROM || 'Playlist AI <onboarding@resend.dev>';
  const reply  = process.env.CONTACT_EMAIL || undefined;

  if (!apiKey) {
    return { ok: false, status: 500, error: "RESEND_API_KEY missing" };
  }

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, " "),
      ...(reply ? { reply_to: reply } : {})
    })
  });

  let data = null;
  try { data = await r.json(); } catch { /* ignore */ }

  if (!r.ok || (data && data.error)) {
    const message =
      data?.error?.message ||
      data?.message ||
      (typeof data === "string" ? data : null) ||
      `HTTP ${r.status}`;
    return { ok: false, status: r.status, error: message, raw: data };
  }

  return { ok: true, status: r.status, id: data?.id || null, raw: data };
}

export async function POST(req) {
  // Lee body como texto y prueba JSON o x-www-form-urlencoded
  const text = await req.text();
  let body = {};
  try { body = JSON.parse(text); }
  catch { body = Object.fromEntries(new URLSearchParams(text)); }

  const norm = normalize(body);
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm.email);

  if (!isEmail) {
    return NextResponse.json(
      { ok: false, error: "bad-email", received: norm },
      { status: 400 }
    );
  }

  // 1) Email al suscriptor
  const subjectUser = "¡Gracias! Te avisaremos cuando abramos el acceso";
  const htmlUser = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
      <h2>¡Gracias por apuntarte${norm.name ? ", " + norm.name : ""}! 🎧</h2>
      <p>Te avisaremos en este correo cuando abramos el acceso para probar
      las <strong>playlists creadas con IA</strong>.</p>
      <p style="color:#666;font-size:13px">Si no te llega en unos minutos, revisa la carpeta de <em>spam</em> o <em>promociones</em>.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:16px 0" />
      <p style="color:#777;font-size:12px">Fuente: ${norm.source}</p>
    </div>
  `;
  const sentUser = await sendEmail({ to: norm.email, subject: subjectUser, html: htmlUser });

  // 2) Aviso interno (copia a tu buzón)
  let sentInternal = { ok: true };
  if (process.env.CONTACT_EMAIL) {
    const subjectAdmin = `Nuevo suscriptor: ${norm.email}`;
    const htmlAdmin = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
        <h3>Nuevo registro en la landing</h3>
        <p><strong>Email:</strong> ${norm.email}</p>
        ${norm.name ? `<p><strong>Nombre:</strong> ${norm.name}</p>` : ""}
        <pre style="background:#f8f8f8;padding:8px;border-radius:6px;white-space:pre-wrap">${JSON.stringify(norm.raw,null,2)}</pre>
        ${!sentUser.ok ? `<p style="color:#b91c1c"><strong>ERROR al enviar al suscriptor:</strong> ${sentUser.error || "desconocido"}</p>` : ""}
      </div>
    `;
    sentInternal = await sendEmail({ to: process.env.CONTACT_EMAIL, subject: subjectAdmin, html: htmlAdmin });
  }

  return NextResponse.json({
    ok: sentUser.ok,
    results: {
      user: sentUser.ok ? { status: "sent", id: sentUser.id } : { status: "error", error: sentUser.error, raw: sentUser.raw },
      admin: sentInternal.ok ? { status: "sent", id: sentInternal.id } : { status: "error", error: sentInternal.error }
    },
    debug: {
      env: {
        HAS_API_KEY: !!process.env.RESEND_API_KEY,
        FROM: process.env.RESEND_FROM || 'Playlist AI <onboarding@resend.dev>',
        ADMIN: process.env.CONTACT_EMAIL || null
      },
      payload: { email: norm.email, name: norm.name }
    }
  });
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: "POST { email, name? }" });
}
