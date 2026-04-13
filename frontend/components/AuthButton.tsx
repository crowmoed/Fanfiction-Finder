'use client';

import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/hooks/useAuth';

export default function AuthButton() {
  const { user, loading, login, logout, isLoggedIn, getAuthHeader } = useAuth();

  console.log('[AuthButton] Render — loading:', loading, 'isLoggedIn:', isLoggedIn, 'user:', user?.email ?? null);

  if (loading) {
    console.log('[AuthButton] Still loading auth state, showing shimmer');
    return (
      <div
        className="h-9 w-24 rounded-lg shimmer-bar"
        style={{ animationDelay: '0s' }}
      />
    );
  }

  if (!isLoggedIn) {
    console.log('[AuthButton] Not logged in — rendering GoogleLogin button');
    return (
      <GoogleLogin
        onSuccess={(credentialResponse) => {
          console.log('[AuthButton] Google onSuccess fired');
          console.log('[AuthButton] credential present:', !!credentialResponse.credential);
          console.log('[AuthButton] credential length:', credentialResponse.credential?.length ?? 0);
          login(credentialResponse);
        }}
        onError={() => {
          console.error('[AuthButton] Google onError fired — login popup failed or was closed');
        }}
        size="medium"
        shape="pill"
        theme="outline"
        type="standard"
        text="signin"
      />
    );
  }

  const handleUpgrade = async () => {
    try {
      const res = await fetch('/api/auth/checkout', {
        method: 'POST',
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error('Checkout failed');
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('[AuthButton] Upgrade error:', err);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span
        className="text-xs font-mono hidden sm:inline"
        style={{ color: 'var(--text-secondary)' }}
      >
        {user?.email}
      </span>

      {user?.tier === 'paid' ? (
        <span
          className="text-xs font-mono px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: 'var(--accent-light)',
            color: 'var(--accent)',
          }}
        >
          Pro
        </span>
      ) : (
        <button
          onClick={handleUpgrade}
          className="text-xs font-mono px-2 py-1 rounded-lg transition-colors"
          style={{
            color: 'var(--accent)',
            backgroundColor: 'var(--accent-light)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.opacity = '0.8';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.opacity = '1';
          }}
        >
          Upgrade — $2/mo
        </button>
      )}

      <button
        onClick={logout}
        className="text-xs px-3 py-1.5 rounded-lg transition-colors"
        style={{
          color: 'var(--text-secondary)',
          backgroundColor: 'var(--bg-secondary)',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-secondary)';
        }}
      >
        Sign out
      </button>
    </div>
  );
}
