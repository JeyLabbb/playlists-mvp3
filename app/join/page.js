'use client';
import { useRouter } from "next/navigation";
import { useState } from "react";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/xpwjnyko";

export default function Join() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setSubmitting(true);

    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      name: fd.get("name")?.toString() || "",
      email: fd.get("email")?.toString() || "",
    };

    try {
      // Nuestro email de gracias
      const r1 = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r1.ok) throw new Error("send-failed");

      // Guardar también en Formspree (lista)
      await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        body: fd,
        headers: { "Accept": "application/json" },
      });

      router.push("/thanks");
    } catch (e) {
      setErr("No se pudo enviar. Prueba de nuevo en un rato.");
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{maxWidth:520, margin:"50px auto", padding:"0 16px",
                 fontFamily:"system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif"}}>
      <h1 style={{fontSize:28, fontWeight:800, marginBottom:6}}>Acceso temprano</h1>
      <p style={{opacity:.8, marginBottom:18}}>
        Apúntate para ser de los <b>primeros</b> en probar el generador de playlists con IA.
        Iremos abriendo cupos poco a poco.
      </p>

      <form onSubmit={handleSubmit} style={{display:"grid", gap:12}}>
        <input name="name" type="text" placeholder="Tu nombre (opcional)"
               style={{padding:12, border:"1px solid #ddd", borderRadius:10}} />
        <input name="email" type="email" required placeholder="Tu email"
               style={{padding:12, border:"1px solid #ddd", borderRadius:10}} />

        <button disabled={submitting}
                style={{
                  padding:"12px 14px",
                  borderRadius:12,
                  border:"1px solid #111",
                  background: submitting ? "#f5f5f5" : "#111",
                  color: submitting ? "#111" : "#fff",
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontWeight:700
                }}>
          {submitting ? "Enviando…" : "Quiero ser tester"}
        </button>

        {err && <p style={{color:"#b91c1c"}}>{err}</p>}
      </form>

      <p style={{opacity:.7, fontSize:12, marginTop:16}}>
        No redirigimos al generador todavía. Solo te avisaremos cuando haya sitio.
      </p>
    </div>
  );
}
