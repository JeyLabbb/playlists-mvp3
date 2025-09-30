import NextAuth from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";

/** 
 * Refresco de access_token con Basic Auth (recomendado por Spotify).
 * Si el refresh falla, devolvemos un token con error para forzar sign-in.
 */
async function refreshAccessToken(token) {
  try {
    const basic = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");

    const r = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
      cache: "no-store",
    });

    const data = await r.json();
    if (!r.ok) throw data;

    return {
      ...token,
      accessToken: data.access_token,
      accessTokenExpires: Date.now() + (data.expires_in ?? 3600) * 1000,
      refreshToken: data.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch (e) {
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

const scopes = [
  "user-read-email",
  "user-read-private",
  "playlist-modify-public",
  "playlist-modify-private",
].join(" ");

export const authOptions = {
  // Importante: no pongas endpoints absolutos aquí; NextAuth usa NEXTAUTH_URL
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      // Usamos URL + scopes; NextAuth añadirá redirect_uri con tu NEXTAUTH_URL
      authorization: `https://accounts.spotify.com/authorize?scope=${encodeURIComponent(scopes)}`,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, account, user }) {
      // Primer login
      if (account && user) {
        return {
          ...token,
          user,
          accessToken: account.access_token,
          accessTokenExpires: Date.now() + (account.expires_in ?? 3600) * 1000,
          refreshToken: account.refresh_token,
        };
      }
      // Si el token sigue vigente, lo devolvemos
      if (token.accessToken && token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
        return token;
      }
      // Si caducó, intentamos refrescar
      return await refreshAccessToken(token);
    },

    async session({ session, token }) {
      session.user = session.user || {};
      session.user.name = token.user?.name ?? session.user?.name;
      session.user.email = token.user?.email ?? session.user?.email;
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },

    // Redirige siempre a tu app (evitamos quedarnos en Spotify)
    async redirect({ url, baseUrl }) {
      try {
        const u = new URL(url, baseUrl);
        if (u.origin === baseUrl) return u.toString();
      } catch {}
      return baseUrl;
    },
  },

  // Si alguna vez pinta pantalla de sign-in, que sea tu home
  pages: { signIn: "/" },
};

// Crea el handler una sola vez y expórtalo en GET/POST
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };