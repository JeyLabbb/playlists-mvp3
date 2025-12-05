export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/review/'],
    },
    sitemap: 'https://playlists.jeylabbb.com/sitemap.xml',
  }
}