import "./globals.css";
import Providers from "./providers";
import { LanguageProvider } from "./contexts/LanguageContext";
import { Toaster } from "sonner";
import SessionWatcher from "./components/SessionWatcher";
import CardNav from "./components/CardNav";
import { Analytics } from '@vercel/analytics/react';

export const metadata = {
  title: "PLEIA — AI Playlist Generator",
  description: "Create perfect playlists with AI. Generate personalized music collections using artificial intelligence. From prompt to playlist.",
  openGraph: {
    site_name: "PLEIA",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <LanguageProvider>
          <Providers>
            <CardNav
              items={[
                {
                  label: "Explorar",
                  links: [
                    { label: "Generador IA", href: "/", ariaLabel: "Ir al generador de playlists con IA" },
                    { label: "Trending", href: "/trending", ariaLabel: "Ver playlists populares" }
                  ]
                },
                {
                  label: "Tu música",
                  links: [
                    { label: "Mis playlists", href: "/my", ariaLabel: "Ver mis playlists guardadas" },
                    { label: "Mi perfil", href: "/me", ariaLabel: "Ver mi perfil" }
                  ]
                },
                {
                  label: "JeyLabbb",
                  links: [
                    { label: "Inicio", href: "/", ariaLabel: "Volver al inicio" },
                    { label: "Soporte", href: "mailto:jeylabbb@gmail.com", ariaLabel: "Contactar soporte" }
                  ]
                }
              ]}
            />
            {children}
            <SessionWatcher />
          </Providers>
          <Toaster position="top-right" richColors />
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
