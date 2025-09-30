"use client";
import { useState } from "react";

export default function Page() {
  const [email, setEmail] = useState("");
  const [name, setName]   = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await fetch("https://formspree.io/f/xpwjnyko", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ email, name })
      });

      if (res.ok) {
        // éxito: llevamos a tu thank-you
        window.location.assign("/gracias");
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error || "No se pudo enviar. Inténtalo de nuevo en un momento.");
      }
    } catch {
      setError("Error de red. Revisa tu conexión e inténtalo otra vez.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main style={{maxWidth: 720, margin: "40px auto", padding: "0 16px"}}>
      <h1 style={{fontSize: 28, fontWeight: 700, marginBottom: 8}}>Apúntate a la beta</h1>
      <p style={{opacity: 0.8, marginBottom: 16}}>
        Déjanos tu correo y te avisaremos cuando abramos el acceso para probar las playlists con IA.
      </p>

      <form onSubmit={handleSubmit} style={{display: "grid", gap: 12}}>
        <label style={{display: "grid", gap: 6}}>
          <span>Tu email (mejor el de tu Spotify)</span>
          <input
            type="email"
            name="email"
            required
            value={email}
            onChange={e=>setEmail(e.target.value)}
            placeholder="tucorreo@example.com"
            style={{padding: 10, borderRadius: 8, border: "1px solid #ddd"}}
          />
        </label>

        <input
          type="text"
          name="name"
          value={name}
          onChange={e=>setName(e.target.value)}
          placeholder="Tu nombre (opcional)"
          style={{padding: 10, borderRadius: 8, border: "1px solid #ddd"}}
        />

        <button
          type="submit"
          disabled={sending}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #111",
            background: sending ? "#f5f5f5" : "#111",
            color: sending ? "#111" : "#fff",
            fontWeight: 600,
            cursor: sending ? "not-allowed" : "pointer"
          }}
        >
          {sending ? "Enviando…" : "Apuntarme"}
        </button>

        {error ? (
          <div style={{color:"#b91c1c", fontSize: 14}}>{error}</div>
        ) : null}
      </form>
    </main>
  );
}
