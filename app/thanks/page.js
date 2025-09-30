export default function Thanks() {
  return (
    <div style={{maxWidth:620, margin:"60px auto", padding:"0 16px",
                 fontFamily:"system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif"}}>
      <h1 style={{fontSize:30, fontWeight:800, marginBottom:10}}>¡Gracias por unirte! 🙌</h1>
      <p style={{opacity:.85, fontSize:16}}>
        Te hemos enviado un <b>correo de confirmación</b>. Si no lo ves, revisa <i>Promociones</i> o <i>Spam</i>.
      </p>
      <p style={{opacity:.85, fontSize:16}}>
        Estás en la lista para ser de los <b>primeros</b> en probar el generador de playlists con IA.
        Cupos limitados — por llegar pronto, tienes muchos puntos. De pana.
      </p>
      <div style={{marginTop:20}}>
        <a href="/join" style={{
          display:"inline-block", padding:"10px 14px", border:"1px solid #111",
          borderRadius:12, fontWeight:700, textDecoration:"none", color:"#111"
        }}>
          Volver
        </a>
      </div>
    </div>
  );
}
