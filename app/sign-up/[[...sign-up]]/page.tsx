import Link from "next/link"
import { ClerkSignUp } from "@/components/auth/clerk-sign-up"
import { clerkPublishableKeyOrNull } from "@/lib/clerk-config"

export default function SignUpPage() {
  const key = clerkPublishableKeyOrNull()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0B0E14] p-6 text-center text-sm text-muted-foreground">
      {!key ? (
        <>
          <p className="max-w-md text-foreground">
            Clerk is not configured. Copy{" "}
            <code className="text-[11px]">.env.example</code> to{" "}
            <code className="text-[11px]">.env.local</code> and paste your Clerk
            keys from the Clerk Dashboard.
          </p>
          <Link
            href="/"
            className="rounded-lg border border-primary/40 px-4 py-2 text-primary"
          >
            Back to HUD
          </Link>
        </>
      ) : (
        <ClerkSignUp />
      )}
    </div>
  )
}
