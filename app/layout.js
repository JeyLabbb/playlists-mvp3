import "./globals.css";
import Providers from "./providers";
import { LanguageProvider } from "./contexts/LanguageContext";
import { Toaster } from "sonner";
import SessionWatcher from "./components/SessionWatcher";
import CardNav from "./components/CardNav";
import PaywallHost from "./PaywallHost";
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-16.png" sizes="16x16" type="image/png" />
        <link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png" />
        <link rel="icon" href="/favicon-48.png" sizes="48x48" type="image/png" />
        <link rel="apple-touch-icon" href="/logo-pleia.png" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className="antialiased">
        <LanguageProvider>
          <Providers>
            <CardNav
              items={[
                {
                  label: "Explorar",
                  links: [
                    { label: "Crear playlists", href: "/crear-playlists", ariaLabel: "Ir al generador de playlists con IA" },
                    { label: "Trending", href: "/trending", ariaLabel: "Ver playlists populares" },
                    { label: "Amigos", href: "/amigos", ariaLabel: "Ver y gestionar tus amigos" }
                  ]
                },
                {
                  label: "Tu música",
                  links: [
                    { label: "Mis playlists", href: "/my", ariaLabel: "Ver mis playlists guardadas" },
                    { label: "Mi perfil", href: "/me", ariaLabel: "Ver mi perfil" },
                    { label: "Planes", href: "/pricing", ariaLabel: "Ver planes y precios" }
                  ]
                },
                {
                  label: "MTRYX",
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
            <PaywallHost />
          </Providers>
          <Toaster position="top-right" richColors />
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
