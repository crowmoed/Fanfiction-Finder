'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading, isLoggedIn, logout, getAuthHeader } = useAuth();

  const handleUpgrade = async () => {
    try {
      const res = await fetch('/api/auth/checkout', {
        method: 'POST',
        headers: getAuthHeader(),
      });
      const body = await res.text();
      if (!res.ok) {
        throw new Error(`Checkout failed (${res.status}): ${body.slice(0, 200)}`);
      }
      const data = JSON.parse(body);
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('Upgrade error:', err);
    }
  };

  const handleManageBilling = async () => {
    try {
      const res = await fetch('/api/auth/billing-portal', {
        method: 'POST',
        headers: getAuthHeader(),
      });
      const body = await res.text();
      if (!res.ok) {
        throw new Error(`Billing portal failed (${res.status}): ${body.slice(0, 200)}`);
      }
      const data = JSON.parse(body);
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('Billing portal error:', err);
    }
  };

  const handleSignOut = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <header className="sticky top-0 z-40 h-14 flex items-center justify-between px-6 bg-bg-elevated border-b border-border-default shadow-sm">
        <Link href="/" className="font-serif text-2xl leading-none text-text-primary">
          FanFiction Finder
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

        {loading ? (
          <div className="h-24 rounded-lg shimmer-bar" />
        ) : !isLoggedIn ? (
          <div className="px-4 py-6 rounded-lg bg-bg-secondary border border-border-default text-center">
            <p className="text-sm text-text-secondary mb-1">You&apos;re not signed in.</p>
            <Link href="/" className="text-sm text-accent hover:text-accent-hover">
              Go back to sign in →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <section>
              <h2 className="text-xs font-mono uppercase tracking-wide text-text-tertiary mb-3">
                Account
              </h2>
              <div className="px-4 py-4 rounded-lg bg-bg-elevated border border-border-default flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Email</span>
                  <span className="text-sm font-mono text-text-primary">{user?.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Name</span>
                  <span className="text-sm text-text-primary">{user?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Tier</span>
                  {user?.tier === 'paid' ? (
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono bg-accent-light text-accent border"
                      style={{ borderColor: 'rgba(13,148,136,0.15)' }}
                    >
                      ✓ unlimited
                    </span>
                  ) : (
                    <span className="text-xs font-mono text-text-secondary">
                      Free — {user?.searches_used ?? 0}/2 this week
                    </span>
                  )}
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xs font-mono uppercase tracking-wide text-text-tertiary mb-3">
                Subscription
              </h2>
              {user?.tier === 'paid' ? (
                <div className="px-4 py-4 rounded-lg bg-bg-elevated border border-border-default">
                  <p className="text-sm text-text-primary mb-1">Unlimited is active.</p>
                  <p className="text-xs text-text-secondary mb-4 leading-relaxed">
                    Thanks for supporting the project. Manage your payment method or cancel anytime
                    through the Stripe customer portal.
                  </p>
                  <button
                    onClick={handleManageBilling}
                    className="px-4 py-2 rounded-lg text-sm bg-bg-secondary text-text-primary hover:bg-bg-hover border border-border-default"
                  >
                    Manage subscription
                  </button>
                  <p className="text-xs text-text-tertiary mt-2">Redirects to Stripe billing portal</p>
                </div>
              ) : (
                <div className="px-4 py-4 rounded-lg bg-bg-elevated border border-border-default">
                  <p className="text-sm text-text-primary mb-1">Upgrade to Unlimited</p>
                  <p className="text-xs text-text-secondary mb-4 leading-relaxed">
                    Free accounts get 2 searches per week. Each search costs real money in AI and
                    hosting fees — unlimited is $2/month to help cover the costs. Cancel anytime.
                  </p>
                  <button
                    onClick={handleUpgrade}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent-hover"
                  >
                    Upgrade — $2/mo
                  </button>
                  <p className="text-xs text-text-tertiary mt-2">Redirects to Stripe checkout</p>
                </div>
              )}
            </section>

            <section>
              <h2 className="text-xs font-mono uppercase tracking-wide text-text-tertiary mb-3">
                Session
              </h2>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 rounded-lg text-sm bg-bg-secondary text-text-primary hover:bg-bg-hover border border-border-default"
              >
                Sign out
              </button>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
