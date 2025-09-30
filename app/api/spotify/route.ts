// web/app/api/debug/spotify/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const env = {
      NODE_ENV: process.env.NODE_ENV || "",
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || "",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "OK" : "MISSING",
      SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID || "(missing)",
      SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET ? "OK" : "MISSING",
      PORT: process.env.PORT || "3000",
    };

    const base =
      env.NEXTAUTH_URL && env.NEXTAUTH_URL.trim().length > 0
        ? env.NEXTAUTH_URL.replace(/\/$/, "")
        : `http://127.0.0.1:${env.PORT}`;

    const redirect_uri = `${base}/api/auth/callback/spotify`;

    const params = new URLSearchParams({
      client_id: env.SPOTIFY_CLIENT_ID,
      response_type: "code",
      scope:
        "user-read-email user-read-private playlist-modify-public playlist-modify-private",
      redirect_uri,
    });

    const authorizeUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;

    return NextResponse.json({ ok: true, env, redirect_uri, authorizeUrl });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}