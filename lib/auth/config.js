import NextAuth from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";

const BASE_URL = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://playlists.jeylabbb.com";

// refresco de token
async function refreshAccessToken(token) {
  try {
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
      client_id: process.env.SPOTIFY_CLIENT_ID,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET,
    });

    const r = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const data = await r.json();
    if (!r.ok) throw data;

    return {
      ...token,
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
      refreshToken: data.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const authOptions = {
  // MUY importante en Next 15/local detrás de proxies
  trustHost: true,

  // Desactivar página de debug en producción
  debug: process.env.NODE_ENV === 'development',

  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "user-read-email user-read-private playlist-modify-public playlist-modify-private ugc-image-upload user-read-private",
        },
      },
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token ?? token.refreshToken,
          expiresAt: account.expires_at
            ? account.expires_at * 1000
            : Date.now() + (account.expires_in ?? 3600) * 1000,
        };
      }
      if ((token.expiresAt ?? 0) - 60_000 > Date.now()) return token;
      return await refreshAccessToken(token);
    },

    async session({ session, token }) {
      // FIXPACK: Exponer datos de Spotify en la sesión
      session.accessToken = token.accessToken;
      session.error = token.error;
      session.spotify = {
        accessToken: token.accessToken,
        userId: token.sub, // Spotify user ID
        displayName: token.name
      };
      return session;
    },

    async redirect({ url, baseUrl }) {
      // Siempre vuelve a nuestra base (127.0.0.1) en local
      try {
        const u = new URL(url, baseUrl);
        if (u.origin === baseUrl) return u.toString();
      } catch {}
      return baseUrl;
    },
  },
};
