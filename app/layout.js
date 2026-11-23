import './globals.css';

export const metadata = {
  title: '겨울 인스타그램 챌린지',
  description: '12월 1일부터 1월 31일까지, 매일의 숙제와 녹화본을 한곳에서',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: '인스타챌린지', statusBarStyle: 'default' },
  icons: { icon: '/icon-192.png', apple: '/apple-touch-icon.png' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#e1306c',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
