export default function manifest() {
  return {
    name: 'Zipverra Pro — GitHub Workspace',
    short_name: 'Zipverra Pro',
    description: 'Push to GitHub from Mobile. Select a repository, analyze ZIP source, and safely push to GitHub from your phone.',
    start_url: '/',
    display: 'standalone',
    background_color: '#080c17',
    theme_color: '#080c17',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
