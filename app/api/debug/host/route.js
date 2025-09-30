export async function GET(req) {
  const url = new URL(req.url);
  const headers = Object.fromEntries(req.headers);

  const host = headers['host'] || '(sin host)';
  const xff  = headers['x-forwarded-host'] || '(sin x-forwarded-host)';
  const proto = headers['x-forwarded-proto'] || url.protocol;

  return new Response(
    JSON.stringify({
      ok: true,
      seenByServer: {
        href: url.href,
        origin: url.origin,
        host,
        xForwardedHost: xff,
        proto
      },
      env: {
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || '(no-set)',
      },
      hint: "Si host != 127.0.0.1:3000, tu navegador no está en el host correcto o NEXTAUTH_URL está mal."
    }, null, 2),
    { headers: { "content-type": "application/json" } }
  );
}