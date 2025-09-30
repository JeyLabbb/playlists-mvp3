export default function Gracias() {
  return (
    <div style={{maxWidth:740, margin:"60px auto", padding:"0 16px", textAlign:"center"}}>
      <h1 style={{fontSize:28, fontWeight:800, marginBottom:10}}>¡Gracias! ✅</h1>
      <p style={{opacity:.8, marginBottom:18}}>
        Ya estás en la lista. Te avisaremos por email cuando abramos plazas para probar las playlists con IA.
      </p>
      <a
        href="https://formspree.io/f/xpwjnyko"
        style={{
          display:"inline-block",
          padding:"10px 14px",
          borderRadius:10,
          border:"1px solid #111",
          background:"#111",
          color:"#fff",
          textDecoration:"none",
          fontWeight:600
        }}
      >
        Volver
      </a>
    </div>
  );
}
