import "./globals.css";
import Providers from "./providers";
import { LanguageProvider } from "./contexts/LanguageContext";
import { Toaster } from "sonner";
import SessionWatcher from "./components/SessionWatcher";
import CardNav from "./components/CardNav";
import { Analytics } from '@vercel/analytics/react';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://pleia.app"),
  title: {
    default: "PLEIA | Genera tu playlist perfecta con IA",
    template: "%s | PLEIA",
  },
  description: "PLEIA es una IA musical que crea playlists automáticas y personalizadas a partir de prompts en lenguaje natural. Crea tu playlist perfecta para Spotify en segundos.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    site_name: "PLEIA",
    title: "PLEIA | Genera tu playlist perfecta con IA",
    description: "Crea playlists personalizadas con inteligencia artificial. Describe tu mood, artistas o plan y obtén tu lista al instante.",
    url: "/",
    type: "website",
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
                    { label: "Crear playlists", href: "/crear-playlists", ariaLabel: "Ir al generador de playlists con IA" },
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
                    { label: "Cómo funciona", href: "/como-funciona", ariaLabel: "Cómo funciona PLEIA" },
                    { label: "FAQ", href: "/faq", ariaLabel: "Preguntas frecuentes" },
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
