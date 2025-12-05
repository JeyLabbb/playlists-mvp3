"use client";
import { signIn, signOut, useSession } from "next-auth/react";

export default function Home() {
  const { data: session } = useSession();
  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-semibold">Playlists AI MVP</h1>
      {!session ? (
        <button
          className="border px-4 py-2 rounded"
          onClick={() => signIn("spotify")}
        >
          Iniciar sesión con Spotify
        </button>
      ) : (
        <>
          <p>Conectado como: {session.user?.name || "Usuario Spotify"}</p>
          <button
            className="border px-4 py-2 rounded"
            onClick={() => signOut()}
          >
            Cerrar sesión
          </button>
        </>
      )}
    </main>
  );
}
