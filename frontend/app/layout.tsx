import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import { themeInitScript } from '@/hooks/useTheme';

const sourceSerif = Source_Serif_4({
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-source-serif',
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
  title: 'Semantic Archive — Find fanfiction in plain English',
  description:
    'Describe the fic you want, get a ranked list from AO3, FFN, and Wattpad. A small, fast, semantic search for fanfiction readers.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sourceSerif.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        {/* Resolve theme before first paint to avoid a flash of the wrong mode. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="bg-bg font-sans text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
