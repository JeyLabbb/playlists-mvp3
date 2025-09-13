import NextAuth from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";

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
  } catch (e) {
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const authOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      authorization: {
        url: "https://accounts.spotify.com/authorize",
        params: {
          scope:
            "user-read-email user-read-private playlist-modify-public playlist-modify-private",
          show_dialog: false,
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
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },

    // 🔁 Fuerza volver a tu app tras el login (no quedarse en Spotify)
    async redirect({ url, baseUrl }) {
      try {
        const u = new URL(url, baseUrl);
        if (u.origin === baseUrl) return u.toString();
      } catch {}
      return baseUrl; // home de la app
    },
  },

  pages: { signIn: "/" }, // si alguna vez muestra sign-in, será la home
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
