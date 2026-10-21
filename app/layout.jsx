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
import './styles/unified-components-v330.css';
import './styles/mobile-layout-v340.css';
import './styles/premium-workflow-v350.css';
import './styles/modal-motion-v360.css';
import './styles/visual-qa-v380.css';
import './styles/stable-experience-v383.css';
import './styles/notifications-v384.css';
import './styles/review-risk-v385.css';
import './styles/premium-interactions-v386.css';
import './styles/accessibility-visual-qa-v387.css';
import './styles/smooth-motion-v388.css';
import './styles/large-archive-v389.css';
import './styles/desktop-workspace-v390.css';
import './styles/smart-compact-v391.css';
import './styles/one-screen-v392.css';
import './styles/quick-actions-v393.css';
import './styles/adaptive-sheets-v394.css';

export const metadata = {
  title: 'Zipverra Pro — GitHub Workspace',
  description: 'Mobile-first GitHub workspace with a streamlined desktop layout. Analyze ZIP, review changes and push safely to GitHub.',
  applicationName: 'Zipverra Pro',
  appleWebApp: { capable: true, title: 'Zipverra Pro', statusBarStyle: 'black-translucent' },
  icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }, { url: '/icon-192.png', type: 'image/png', sizes: '192x192' }], apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }] },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  // Do not restrict pinch-to-zoom or browser text magnification.
  // iOS still uses viewportFit for safe-area edge-to-edge layout.
  viewportFit: 'cover',
  themeColor: '#0B111B',
};

export default function RootLayout({ children }) {
  return <html lang="vi" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:`(function(){try{var v=localStorage.getItem('zipverra.theme.v1');var choice=(v==='light'||v==='dark'||v==='system')?v:'dark';var light=choice==='light'||(choice==='system'&&matchMedia('(prefers-color-scheme: light)').matches);document.documentElement.setAttribute('data-theme',light?'light':'dark');document.documentElement.style.colorScheme=light?'light':'dark';}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`}}/></head><body>{children}</body></html>;
}
