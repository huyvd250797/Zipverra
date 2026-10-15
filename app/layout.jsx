import './globals.css';
import './styles/pro-design-system.css';
import './styles/pro-motion.css';
import './styles/workspace-ux.css';
import './styles/pwa-reliability.css';
import './styles/advanced-ux-polish.css';
import './styles/production-hardening.css';
import './styles/source-zip-download.css';
import './styles/compact-ui.css';
import './styles/repository-workflow.css';
import './styles/premium-visual-v320.css';

export const metadata = {
  title: 'Zipverra Pro — GitHub Workspace',
  description: 'Push to GitHub from Mobile. Choose a repository, upload and verify a ZIP, then commit and track GitHub push from your phone.',
  applicationName: 'Zipverra Pro',
  appleWebApp: { capable: true, title: 'Zipverra Pro', statusBarStyle: 'black-translucent' },
  icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }, { url: '/icon-192.png', type: 'image/png', sizes: '192x192' }], apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }] },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0B111B',
};

export default function RootLayout({ children }) {
  return <html lang="vi"><body>{children}</body></html>;
}
