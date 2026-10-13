import './globals.css';

export const metadata = {
  title: 'Zipverra — ZIP to GitHub',
  description: 'Push to GitHub from Mobile. Choose a repository, upload and verify a ZIP, then commit and track GitHub push from your phone.',
  applicationName: 'Zipverra',
  appleWebApp: { capable: true, title: 'Zipverra', statusBarStyle: 'black-translucent' },
  icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }, { url: '/icon-192.png', type: 'image/png', sizes: '192x192' }], apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }] },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#080c17',
};

export default function RootLayout({ children }) {
  return <html lang="vi"><body>{children}</body></html>;
}
