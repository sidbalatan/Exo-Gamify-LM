"use client"

import { ClerkProvider } from "@clerk/nextjs"

import { clerkPublishableKeyOrNull } from "@/lib/clerk-config"

export function Providers({ children }: { children: React.ReactNode }) {
  const key = clerkPublishableKeyOrNull()
  if (!key) return <>{children}</>

  return <ClerkProvider publishableKey={key}>{children}</ClerkProvider>
}
