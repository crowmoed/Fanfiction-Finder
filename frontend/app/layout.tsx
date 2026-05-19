import type { Metadata } from 'next';
import { Instrument_Serif, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import { GravityGridBackground } from '@/components/ambient/GravityGridBackground';
import { SmoothScroll } from '@/components/ambient/SmoothScroll';

const instrumentSerif = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

const inter = Inter({
  weight: ['400', '500', '600', '700'],
  style: ['normal'],
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FanFiction Finder — A semantic search for fanfic readers',
  description: 'A small tool that helps you find fanfiction using plain English. Built by one person.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-sans" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <Providers>
          <SmoothScroll />
          <GravityGridBackground />
          <div className="relative z-10">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
