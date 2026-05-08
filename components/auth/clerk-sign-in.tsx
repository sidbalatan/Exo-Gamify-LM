"use client"

import { SignIn } from "@clerk/nextjs"

export function ClerkSignIn() {
  return (
    <SignIn
      appearance={{
        variables: { colorPrimary: "#FFB300" },
        elements: {
          card: "rounded-2xl border border-border shadow-none",
          headerTitle: "text-foreground",
          headerSubtitle: "text-muted-foreground",
          socialButtonsBlockButton:
            "border-border bg-secondary/80 text-foreground hover:bg-secondary",
          formButtonPrimary: "rounded-lg shadow-none",
          footerActionLink: "text-primary hover:text-primary/90",
          identityPreviewEditButtonIcon: "text-primary",
          formFieldLabel: "text-foreground",
          formFieldInput: "rounded-lg border-border bg-secondary/60 text-foreground",
        },
      }}
      routing="path"
      path="/sign-in"
      signUpUrl="/sign-up"
      forceRedirectUrl="/workspace"
      fallbackRedirectUrl="/workspace"
    />
  )
}
