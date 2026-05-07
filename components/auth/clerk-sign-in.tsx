"use client"

import { SignIn } from "@clerk/nextjs"

export function ClerkSignIn() {
  return (
    <SignIn
      appearance={{
        variables: { colorPrimary: "#FFB300" },
      }}
      routing="path"
      path="/sign-in"
      signUpUrl="/sign-up"
    />
  )
}
