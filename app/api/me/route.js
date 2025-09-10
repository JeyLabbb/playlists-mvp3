import { getToken } from "next-auth/jwt";

export async function GET(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.accessToken) {
    return new Response(JSON.stringify({ error: "no-access-token" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const r = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });
  const data = await r.json();
  return new Response(JSON.stringify(data, null, 2), {
    status: r.status,
    headers: { "content-type": "application/json" },
  });
}
