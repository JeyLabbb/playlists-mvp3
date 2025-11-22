export default async function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://playlists.jeylabbb.com';
  const routes = [
    '/',
    '/trending',
    '/my',
    '/me',
    '/crear-playlists',
    '/como-funciona',
    '/faq',
    '/terms',
    '/privacy',
    '/support',
    '/pricing',
  ];
  return routes.map((route) => ({
    url: `${base}${route}`,
    changeFrequency: 'weekly',
    priority: route === '/' ? 1.0 : 0.7,
  }));
}


