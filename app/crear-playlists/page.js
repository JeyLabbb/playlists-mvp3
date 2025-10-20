import { redirect } from "next/navigation";
export const metadata = {
  title: "Crear playlists con IA",
  description: "Genera playlists personalizadas con PLEIA usando prompts en lenguaje natural.",
};

export default function CrearPlaylistsPage() {
  // Redirección directa al generador (home)
  redirect("/");
}


