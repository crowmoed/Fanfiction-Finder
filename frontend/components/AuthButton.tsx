'use client';

import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/hooks/useAuth';

export default function AuthButton() {
  const { user, loading, login, logout, isLoggedIn } = useAuth();

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

  return (
    <div className="flex items-center gap-3">
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
