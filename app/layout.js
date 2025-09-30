import "./globals.css";
import Providers from "./providers";
import { LanguageProvider } from "./contexts/LanguageContext";
import { Toaster } from "sonner";

export const metadata = {
  title: "JeyLabbb — Playlist Generator",
  description: "Create perfect playlists with AI. Generate personalized music collections using artificial intelligence.",
  openGraph: {
    site_name: "JeyLabbb",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <LanguageProvider>
          <Providers>{children}</Providers>
          <Toaster position="top-right" richColors />
        </LanguageProvider>
      </body>
    </html>
  );
}
