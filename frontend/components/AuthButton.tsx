'use client';

import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/hooks/useAuth';

export default function AuthButton() {
  const { loading, login, isLoggedIn } = useAuth();

  if (loading) {
    return <div className="skeleton h-9 w-24 rounded-full" />;
  }

  if (isLoggedIn) return null;

  return (
    <GoogleLogin
      onSuccess={(credentialResponse) => {
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
