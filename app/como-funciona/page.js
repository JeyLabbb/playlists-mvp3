import Link from 'next/link';
export const metadata = {
  title: "Cómo funciona PLEIA",
  description: "Descubre cómo PLEIA genera playlists personalizadas con IA a partir de tus prompts.",
};

export default function ComoFuncionaPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16" style={{ color: 'var(--color-cloud)' }}>
      <h1 className="text-3xl sm:text-4xl font-bold mb-6" style={{ fontFamily: 'var(--font-primary)' }}>
        Cómo funciona PLEIA
      </h1>

      <ol className="space-y-6 list-decimal pl-6 text-gray-300" style={{ fontFamily: 'var(--font-body)' }}>
        <li>
          <strong>Entiende tu prompt:</strong> analizamos intención, artistas, géneros, época y contexto.
        </li>
        <li>
          <strong>Busca y filtra:</strong> combinamos recomendaciones y reglas de calidad para darte lo mejor.
        </li>
        <li>
          <strong>Te da control:</strong> puedes abrir en Spotify y guardar la playlist.
        </li>
      </ol>

      <div className="mt-10">
        <Link href="/" className="inline-block px-6 py-3 rounded-xl font-semibold"
           style={{ background: 'var(--gradient-primary)', color: 'var(--color-night)', fontFamily: 'var(--font-primary)' }}>
          Probar PLEIA ahora
        </Link>
      </div>
    </main>
  );
}


