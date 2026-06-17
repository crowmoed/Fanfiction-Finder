'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from '@/hooks/useAuth';
import { ThemeProvider } from '@/hooks/useTheme';

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <GoogleOAuthProvider clientId={clientId}>
        <AuthProvider>{children}</AuthProvider>
      </GoogleOAuthProvider>
    </ThemeProvider>
  );
}
