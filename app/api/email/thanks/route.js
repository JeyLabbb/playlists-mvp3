import { NextResponse } from "next/server";

function esc(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

export async function POST(req) {
  try {
    const { email, name } = await req.json().catch(() => ({}));
    if (!email) {
      return NextResponse.json({ ok: false, error: "missing-email" }, { status: 400 });
    }
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ ok: false, error: "missing-resend-key" }, { status: 500 });
    }

    const from = process.env.RESEND_FROM || "Playlist AI <onboarding@resend.dev>";
    const replyTo = process.env.CONTACT_EMAIL || "hola@ejemplo.com";

    const subject = "¡Gracias por apuntarte a la lista de espera! 🙌";
    const html = `
      <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5">
        <p>Hola${name ? " " + esc(name) : ""} 👋</p>
        <p>Gracias por unirte a la lista de espera de <strong>Playlist AI</strong>.</p>
        <p>Te avisaremos en cuanto habilitemos tu acceso para probar el MVP.</p>
        <p style="margin-top:16px;font-size:12px;opacity:.8">
          Tip: añade este remitente a tus contactos para no perderte el email (revisa Spam/Promociones).
        </p>
        <p style="margin-top:24px">— Equipo JeyLabbb</p>
      </div>
    `.trim();

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject,
        html,
        reply_to: replyTo,
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      return NextResponse.json({ ok: false, error: data }, { status: r.status });
    }
    return NextResponse.json({ ok: true, id: data?.id || null });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
