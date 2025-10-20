export const metadata = {
  title: "FAQ | Preguntas frecuentes",
  description: "Resuelve dudas comunes sobre PLEIA, la IA que crea playlists personalizadas.",
};

export default function FaqPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16" style={{ color: 'var(--color-cloud)' }}>
      <h1 className="text-3xl sm:text-4xl font-bold mb-6" style={{ fontFamily: 'var(--font-primary)' }}>
        Preguntas frecuentes
      </h1>

      <div className="space-y-6" style={{ fontFamily: 'var(--font-body)' }}>
        <section>
          <h2 className="text-xl font-semibold mb-2">¿Qué es PLEIA?</h2>
          <p className="text-gray-300">Una IA musical que crea playlists personalizadas a partir de prompts.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">¿Necesito Spotify?</h2>
          <p className="text-gray-300">Puedes generar y escuchar muestras. Para guardar en tu cuenta, necesitas iniciar sesión con Spotify.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">¿Es gratis?</h2>
          <p className="text-gray-300">La versión actual es gratuita. Añadiremos planes si incorporamos funciones pro.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">¿Cómo escribir buenos prompts?</h2>
          <p className="text-gray-300">Sé específico: mezcla actividad + género + idioma + época + artistas. Ejemplo: “reggaetón para correr, 165 BPM, solo español, como Bad Bunny pero sin Bad Bunny”.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">¿Qué pasa si mi prompt es muy raro?</h2>
          <p className="text-gray-300">Puede fallar o devolver resultados limitados. Nuestra IA está muy entrenada, pero seguimos mejorándola. Tu feedback nos ayuda a afinarla.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">¿Aceptan feedback para mejorar?</h2>
          <p className="text-gray-300">Sí. Dentro de la app verás un cuadro de feedback. Cuéntanos qué funcionó y qué mejorarías: usamos esa señal para entrenar y ajustar reglas.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">¿Puedo excluir artistas o estilos?</h2>
          <p className="text-gray-300">Sí. Usa “sin X” o “excepto X”. Ejemplo: “reggaetón para fiesta, sin Bad Bunny”.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">¿Funciona con festivales?</h2>
          <p className="text-gray-300">Incluye el nombre y el año del festival. Ejemplo: “festival Primavera Sound 2025”. Buscamos fuentes fiables para construir la playlist.</p>
        </section>
      </div>

      <div className="mt-10">
        <a href="/" className="inline-block px-6 py-3 rounded-xl font-semibold"
           style={{ background: 'var(--gradient-primary)', color: 'var(--color-night)', fontFamily: 'var(--font-primary)' }}>
          Volver al generador
        </a>
      </div>
    </main>
  );
}


