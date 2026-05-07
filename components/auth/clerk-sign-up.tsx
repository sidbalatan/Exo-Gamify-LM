"use client"

import { SignUp } from "@clerk/nextjs"

export function ClerkSignUp() {
  return (
    <SignUp
      appearance={{
        variables: { colorPrimary: "#FFB300" },
      }}
      routing="path"
      path="/sign-up"
      signInUrl="/sign-in"
    />
  )
}
