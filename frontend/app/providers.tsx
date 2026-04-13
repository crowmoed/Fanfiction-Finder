'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

export default function Providers({ children }: { children: React.ReactNode }) {
  if (!clientId) {
    console.warn('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set — Google OAuth disabled. Restart the dev server after creating .env.local.');
    return <>{children}</>;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {children}
    </GoogleOAuthProvider>
  );
}
