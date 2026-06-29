import { AppShell } from "@/components/AppShell";

// The real product surface: sidebar shell with modal panels for Saved / History
// / Account. Content routes (home, /results, /fic) render inside the shell.
export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
