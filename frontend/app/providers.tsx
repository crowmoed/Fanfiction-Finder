'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from '@/hooks/useAuth';

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

console.log('[Providers] NEXT_PUBLIC_GOOGLE_CLIENT_ID:', clientId ? `${clientId.slice(0, 20)}...` : '(EMPTY — env var not set)');

export default function Providers({ children }: { children: React.ReactNode }) {
  console.log('[Providers] Rendering GoogleOAuthProvider, clientId length:', clientId.length);
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
