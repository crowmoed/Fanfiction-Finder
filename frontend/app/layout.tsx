import type { Metadata } from 'next';
import { Instrument_Serif, Newsreader, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import Providers from './providers';

const instrumentSerif = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

const newsreader = Newsreader({
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-plex-mono',
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
      className={`${instrumentSerif.variable} ${newsreader.variable} ${plexMono.variable}`}
    >
      <body className="font-sans" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
