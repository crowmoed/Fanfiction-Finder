'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

interface SettingsContentProps {
  /** Called after sign-out completes (e.g. close the modal / redirect). */
  onSignOut?: () => void;
}

/**
 * The account / subscription / session settings UI, shared by the SettingsModal
 * popup and the standalone /settings route.
 *
 * The free-tier usage counter ("X/2 this week") lives here so it can stay out of
 * the main search header. There are currently no enforced limits — keeping the
 * tier/usage block here means it's a one-line change to surface it again.
 */
export default function SettingsContent({ onSignOut }: SettingsContentProps) {
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
    onSignOut?.();
  };

  if (loading) {
    return <div className="skeleton h-24 rounded-md" />;
  }

  if (!isLoggedIn) {
    return (
      <div className="rounded-md border border-border bg-surface-2 px-4 py-6 text-center">
        <p className="mb-1 text-sm text-ink-2">You&apos;re not signed in.</p>
        <Link href="/" className="text-sm text-accent-text hover:underline">
          Go back to sign in →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-ink-3">Account</h3>
        <div className="flex flex-col gap-2 rounded-md border border-border bg-bg px-4 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-2">Email</span>
            <span className="font-mono text-sm text-ink">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-2">Name</span>
            <span className="text-sm text-ink">{user?.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-2">Tier</span>
            {user?.tier === 'paid' ? (
              <span className="inline-flex items-center gap-1.5 rounded-sm bg-accent-soft px-2 py-0.5 font-mono text-xs text-accent-text">
                ✓ unlimited
              </span>
            ) : (
              <span className="font-mono text-xs text-ink-2 tabular-nums">
                Free — {user?.searches_used ?? 0}/2 this week
              </span>
            )}
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-ink-3">Subscription</h3>
        {user?.tier === 'paid' ? (
          <div className="rounded-md border border-border bg-bg px-4 py-4">
            <p className="mb-1 text-sm text-ink">Unlimited is active.</p>
            <p className="mb-4 text-xs leading-relaxed text-ink-2">
              Thanks for supporting the project. Manage your payment method or cancel anytime through
              the Stripe customer portal.
            </p>
            <button
              onClick={handleManageBilling}
              className="rounded-md border border-border-strong bg-surface px-4 py-2 text-sm text-ink transition-colors duration-150 ease-out hover:bg-surface-2"
            >
              Manage subscription
            </button>
            <p className="mt-2 text-xs text-ink-3">Redirects to the Stripe billing portal</p>
          </div>
        ) : (
          <div className="rounded-md border border-border bg-bg px-4 py-4">
            <p className="mb-1 text-sm text-ink">Upgrade to Unlimited</p>
            <p className="mb-4 text-xs leading-relaxed text-ink-2">
              Free accounts get 2 searches per week. Each search costs real money in AI and hosting
              fees. Unlimited is $2/month to help cover the costs. Cancel anytime.
            </p>
            <button
              onClick={handleUpgrade}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-colors duration-150 ease-out hover:bg-accent-hover active:scale-[0.98] motion-reduce:active:scale-100"
            >
              Upgrade — $2/mo
            </button>
            <p className="mt-2 text-xs text-ink-3">Redirects to Stripe checkout</p>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-ink-3">Session</h3>
        <button
          onClick={handleSignOut}
          className="rounded-md border border-border-strong bg-surface px-4 py-2 text-sm text-ink transition-colors duration-150 ease-out hover:bg-surface-2"
        >
          Sign out
        </button>
      </section>
    </div>
  );
}
