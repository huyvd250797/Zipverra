export default function manifest() {
  return {
    name: 'Zipverra — ZIP to GitHub',
    short_name: 'Zipverra',
    description: 'Upload ZIP và push source lên GitHub từ điện thoại qua GitHub OAuth.',
    start_url: '/',
    display: 'standalone',
    background_color: '#080c17',
    theme_color: '#080c17',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
