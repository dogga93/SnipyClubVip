import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Header } from '@/components/layout/header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SportBot AI - AI-Powered Sports Betting Analytics',
  description: '2 hours of research in 60 seconds. Get AI-powered predictions and betting insights',
  openGraph: {
    images: [
      {
        url: 'https://bolt.new/static/og_default.png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [
      {
        url: 'https://bolt.new/static/og_default.png',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0a0a0b] text-gray-100 antialiased`}>
        <div className="fixed inset-0 bg-gradient-to-b from-[#1a1a2e]/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10">
          <Header />
          {children}
        </div>
      </body>
    </html>
  );
}
