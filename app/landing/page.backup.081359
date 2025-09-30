export const metadata = { title: "Apúntate — Playlist AI" };

export default function Page() {
  return (
    <main style={{maxWidth: 720, margin: "40px auto", padding: "0 16px"}}>
      <h1 style={{fontSize: 28, fontWeight: 700, marginBottom: 8}}>Apúntate a la beta</h1>
      <p style={{opacity: 0.8, marginBottom: 16}}>
        Déjanos tu correo y te avisaremos cuando abramos el acceso a las playlists con IA.
      </p>

      <form
        action="https://formspree.io/f/xpwjnyko"
        method="POST"
        acceptCharset="UTF-8"
        style={{display: "grid", gap: 12}}
      >
        <label style={{display: "grid", gap: 6}}>
          <span>Tu email (mejor el de tu Spotify)</span>
          <input
            type="email"
            name="email"
            required
            placeholder="tucorreo@example.com"
            style={{padding: 10, borderRadius: 8, border: "1px solid #ddd"}}
          />
        </label>

        {/* redirección tras enviar */}
        <input type="hidden" name="_redirect" value="https://playlists-mvp3.vercel.app/gracias" />

        {/* opcional: nombre */}
        <input type="text" name="name" placeholder="Tu nombre (opcional)"
               style={{padding: 10, borderRadius: 8, border: "1px solid #ddd"}} />

        <button type="submit"
                style={{padding: "10px 14px", borderRadius: 10, border: "1px solid #111",
                        background: "#111", color: "#fff", fontWeight: 600, cursor: "pointer"}}>
          Apuntarme
        </button>
      </form>
    </main>
  );
}
