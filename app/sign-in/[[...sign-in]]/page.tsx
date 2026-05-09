import Link from "next/link"
import { ClerkSignIn } from "@/components/auth/clerk-sign-in"
import { AuthShell } from "@/components/auth/auth-shell"
import { clerkPublishableKeyOrNull } from "@/lib/clerk-config"

export default function SignInPage() {
  const key = clerkPublishableKeyOrNull()

  if (!key) {
    return (
      <AuthShell
        title="Sign in unavailable"
        subtitle="Add Clerk keys to enable authenticated sessions."
      >
        <p className="text-center text-sm text-muted-foreground">
          Copy keys from{" "}
          <a
            href="https://dashboard.clerk.com/"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline underline-offset-2"
          >
            Clerk Dashboard
          </a>
          {" → "}
          <code className="rounded bg-secondary px-1 py-0.5 text-[11px]">
            .env.local
          </code>{" "}
          (<code className="text-[11px]">.env.example</code> describes each
          variable), then reload.
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
    <AuthShell title="Welcome back" subtitle="Sign in to open your workspace.">
      <ClerkSignIn />
      <div className="mt-10 text-center text-xs text-muted-foreground">
        <p>New here?</p>
        <Link
          href="/sign-up"
          className="mt-2 inline-block font-medium text-primary hover:text-primary/90"
        >
          Create an account →
        </Link>
      </div>
    </AuthShell>
  )
}
