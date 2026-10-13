import './globals.css';

export const metadata = {
  title: 'Zipverra — ZIP to GitHub',
  description: 'Đăng nhập GitHub, upload source ZIP, xem thay đổi và push vào repository chỉ với điện thoại.',
  applicationName: 'Zipverra',
  appleWebApp: { capable: true, title: 'Zipverra', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#080c17' };

export default function RootLayout({ children }) {
  return <html lang="vi"><body>{children}</body></html>;
}
