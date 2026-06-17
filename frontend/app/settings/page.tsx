'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SettingsContent from '@/components/settings/SettingsContent';

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="min-h-[100dvh]">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border-strong bg-surface px-6">
        <Link href="/" className="font-serif text-xl font-semibold leading-none text-ink">
          Semantic Archive
        </Link>
        <Link href="/" className="text-sm text-ink-2 transition-colors hover:text-ink">
          ← Back to search
        </Link>
      </header>

      <main className="mx-auto w-full max-w-content px-6 py-10">
        <h1 className="mb-8 font-serif text-3xl font-semibold tracking-[-0.02em] text-ink">Settings</h1>
        <SettingsContent onSignOut={() => router.push('/')} />
      </main>
    </div>
  );
}
