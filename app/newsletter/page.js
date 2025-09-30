"use client";
import { useState } from "react";

export default function NewsletterPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);

      // 1) Enviar a Formspree
      const r = await fetch("https://formspree.io/f/xpwjnyko", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: fd,
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data?.errors?.[0]?.message || "Error al enviar");
      }

      // 2) Disparar nuestro email de gracias en background (si lo configuras en la opción B)
      const email = fd.get("email");
      const name = fd.get("name");
      fetch("/api/email/thanks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      }).catch(() => {});

      // 3) Redirigir a /gracias
      window.location.href = "/gracias";
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{maxWidth: 780, margin: "40px auto", padding: "0 16px"}}>
      <h1 style={{fontSize: 32, fontWeight: 800, marginBottom: 8}}>Playlist AI — Lista de espera</h1>
      <p style={{opacity: 0.8, marginBottom: 16}}>
        Apúntate para probar primero el MVP: listas en Spotify generadas por IA según tu prompt.
      </p>

      <form onSubmit={onSubmit} style={{
        border: "1px solid #eee", padding: 16, borderRadius: 12, display: "grid", gap: 12
      }}>
        <div>
          <label style={{display:"block", fontSize: 14, marginBottom: 6}}>Nombre (opcional)</label>
          <input
            type="text"
            name="name"
            placeholder="Tu nombre"
            style={{width:"100%", padding:10, borderRadius:8, border:"1px solid #ddd", fontSize:14}}
          />
        </div>

        <div>
          <label style={{display:"block", fontSize: 14, marginBottom: 6}}>Email (usa tu email de Spotify si quieres prioridad)</label>
          <input
            type="email"
            required
            name="email"
            placeholder="tucorreo@ejemplo.com"
            style={{width:"100%", padding:10, borderRadius:8, border:"1px solid #ddd", fontSize:14}}
          />
        </div>

        <label style={{display:"flex", gap:8, alignItems:"center", fontSize:14}}>
          <input type="checkbox" name="consent" required />
          Acepto recibir un email cuando esté listo el acceso.
        </label>

        <input type="hidden" name="_subject" value="Alta lista de espera — Playlist AI" />
        <input type="text" name="_gotcha" style={{display:"none"}} aria-hidden="true" />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            border: "1px solid #111",
            background: loading ? "#f5f5f5" : "#111",
            color: loading ? "#111" : "#fff",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 700
          }}
        >
          {loading ? "Enviando…" : "Apuntarme"}
        </button>

        {err ? <div style={{color:"#b91c1c", fontSize:14}}>⚠️ {err}</div> : null}
        <div style={{fontSize:12, opacity:0.7}}>
          *Solo usaremos tu email para informarte del acceso y novedades del MVP.
        </div>
      </form>
    </div>
  );
}
