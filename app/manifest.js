export default function manifest() {
  return {
    name: 'Zipverra Pro — GitHub Workspace',
    short_name: 'Zipverra Pro',
    description: 'Mobile-first GitHub workspace with desktop workbench, ZIP analysis, review and safe GitHub push.',
    id: '/',
    scope: '/',
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
