import Link from "next/link"
import { ClerkSignUp } from "@/components/auth/clerk-sign-up"
import { AuthShell } from "@/components/auth/auth-shell"
import { clerkPublishableKeyOrNull } from "@/lib/clerk-config"

export default function SignUpPage() {
  const key = clerkPublishableKeyOrNull()

  if (!key) {
    return (
      <AuthShell
        title="Create account unavailable"
        subtitle="Clerk is not configured yet."
      >
        <p className="text-center text-sm text-muted-foreground">
          Copy{" "}
          <code className="rounded bg-secondary px-1 py-0.5 text-[11px]">
            .env.example
          </code>{" "}
          to <code className="text-[11px]">.env.local</code> and paste your Clerk
          keys, then reload.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex justify-center rounded-lg border border-primary/40 px-4 py-2 text-center text-primary"
        >
          Back to HUD
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Join the mission" subtitle="Create your personal workspace to track targets.">
      <ClerkSignUp />
      <div className="mt-10 text-center text-xs text-muted-foreground">
        <p>Already have an account?</p>
        <Link
          href="/sign-in"
          className="mt-2 inline-block font-medium text-primary hover:text-primary/90"
        >
          Sign in →
        </Link>
      </div>
    </AuthShell>
  )
}
