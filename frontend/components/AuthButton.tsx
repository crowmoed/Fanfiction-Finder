'use client';

import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/hooks/useAuth';

export default function AuthButton() {
  const { user, loading, login, logout, isLoggedIn } = useAuth();

  if (loading) {
    return (
      <div
        className="h-9 w-24 rounded-lg shimmer-bar"
        style={{ animationDelay: '0s' }}
      />
    );
  }

  if (!isLoggedIn) {
    return (
      <GoogleLogin
        onSuccess={login}
        onError={() => console.error('Google login failed')}
        size="medium"
        shape="pill"
        theme="outline"
        type="standard"
        text="signin"
      />
    );
  }

  const searchesRemaining =
    user && user.tier === 'free'
      ? `${user.searches_used}/${user.search_limit} searches`
      : null;

  return (
    <div className="flex items-center gap-3">
      {searchesRemaining && (
        <span
          className="text-xs font-mono px-2 py-1 rounded-md"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-tertiary)',
          }}
        >
          {searchesRemaining}
        </span>
      )}

      <span
        className="text-xs font-mono hidden sm:inline"
        style={{ color: 'var(--text-secondary)' }}
      >
        {user?.email}
      </span>

      {user?.tier && user.tier !== 'free' && (
        <span
          className="text-xs font-mono px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: 'var(--accent-light)',
            color: 'var(--accent)',
          }}
        >
          {user.tier}
        </span>
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
