"use client"

// ClerkProvider now lives in app/layout.tsx (server component).
// This file is kept as a passthrough for any future client-only providers
// (e.g. ThemeProvider, ReactQueryProvider, Sonner <Toaster />).
export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
