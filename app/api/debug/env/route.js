import { NextResponse } from 'next/server';

export async function GET() {
  const mask = (v) => (v ? v.slice(0, 6) + '…' + v.slice(-2) : null);
  return NextResponse.json({
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || null,
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST || null,
    SPOTIFY_CLIENT_ID: mask(process.env.SPOTIFY_CLIENT_ID),
    SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET ? 'set' : 'missing',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'set' : 'missing',
    OPENAI_MODEL: process.env.OPENAI_MODEL || null,
  });
}
