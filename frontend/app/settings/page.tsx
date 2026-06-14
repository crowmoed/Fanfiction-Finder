'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SettingsContent from '@/components/settings/SettingsContent';

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen paper-grid-bg">
      <header className="sticky top-0 z-40 h-14 flex items-center justify-between px-6 bg-bg-elevated border-b border-border-default shadow-sm">
        <Link href="/" className="font-serif text-2xl leading-none text-text-primary">
          Semantic Archive
        </Link>
        <Link
          href="/"
          className="text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          ← Back to search
        </Link>
      </header>

      <main className="mx-auto max-w-[640px] w-full px-6 py-10">
        <h1 className="font-serif italic text-3xl text-text-primary mb-8">Settings</h1>
        <SettingsContent onSignOut={() => router.push('/')} />
      </main>
    </div>
  );
}
