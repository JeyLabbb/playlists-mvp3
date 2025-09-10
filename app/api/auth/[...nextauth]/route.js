import NextAuth from 'next-auth';
import SpotifyProvider from 'next-auth/providers/spotify';

async function refreshAccessToken(token) {
  try {
    const basic = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString('base64');

    const r = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
      }),
    });

    const data = await r.json();
    if (!r.ok) throw data;

    return {
      ...token,
      accessToken: data.access_token,
      accessTokenExpires: Date.now() + (data.expires_in ?? 3600) * 1000,
      refreshToken: data.refresh_token ?? token.refreshToken,
    };
  } catch (e) {
    return { ...token, error: 'RefreshAccessTokenError', details: e };
  }
}

const scopes = [
  'playlist-modify-public',
  'playlist-modify-private',
  'user-read-email',
].join(' ');

const handler = NextAuth({
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      authorization: `https://accounts.spotify.com/authorize?scope=${encodeURIComponent(scopes)}`,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account && user) {
        return {
          ...token,
          user,
          accessToken: account.access_token,
          accessTokenExpires: Date.now() + (account.expires_in ?? 3600) * 1000,
          refreshToken: account.refresh_token,
        };
      }
      if (token.accessToken && token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
        return token;
      }
      return await refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.user = session.user || {};
      session.user.name = token.user?.name ?? session.user.name;
      session.user.email = token.user?.email ?? session.user.email;
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
