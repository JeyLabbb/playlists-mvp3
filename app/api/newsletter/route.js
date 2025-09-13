import { NextResponse } from "next/server";
import { resend, FROM, ADMIN } from "../../../lib/resend.js";

function isEmail(x=""){ return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x); }

export async function POST(req) {
  const debug = { env:{
    HAS_API_KEY: !!process.env.RESEND_API_KEY,
    FROM, ADMIN
  }};
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || body.user_email || body.mail || "").trim();
    const name  = String(body.name  || body.user_name  || "").trim();

    debug.payload = { email, name };

    if (!isEmail(email)) {
      return NextResponse.json({ ok:false, error:"bad-email", debug }, { status: 400 });
    }

    const results = {};

    // 1) Confirmación al SUSCRIPTOR
    try {
      const { data, error } = await resend.emails.send({
        from: FROM,                     // ej: 'Playlist AI <onboarding@resend.dev>'
        to: email,                      // suscriptor
        reply_to: ADMIN || undefined,   // tu correo para respuestas
        subject: "Gracias por apuntarte — confirmación 🎧",
        text: `¡Gracias${name ? " " + name.split(" ")[0] : ""}!
Te acabas de unir a la lista de acceso temprano para probar el generador de playlists con IA.
Cuando abramos cupos te escribiremos. Si no ves nuestros correos, mira Spam/Promociones.

Abrazo,
JeyLabbb · Playlist AI`,
      });
      if (error) { results.user = { status:"error", error:String(error) }; }
      else { results.user = { status:"sent", id: data?.id || null }; }
    } catch (e) {
      results.user = { status:"exception", error:String(e?.message || e) };
    }

    // 2) Aviso interno (a ti)
    if (ADMIN) {
      try {
        const { data, error } = await resend.emails.send({
          from: FROM,
          to: ADMIN,
          subject: `Nuevo suscriptor: ${email}`,
          text: `Email: ${email}\nNombre: ${name || "-"}\nFuente: Landing Formspree/Join`,
        });
        if (error) { results.admin = { status:"error", error:String(error) }; }
        else { results.admin = { status:"sent", id: data?.id || null }; }
      } catch (e) {
        results.admin = { status:"exception", error:String(e?.message || e) };
      }
    }

    return NextResponse.json({ ok:true, results, debug });
  } catch (e) {
    return NextResponse.json(
      { ok:false, error:"server", message:String(e?.message || e), debug },
      { status: 500 }
    );
  }
}

export const GET = async () =>
  NextResponse.json({ ok:false, error:"method-not-allowed" }, { status:405 });
