import Link from "next/link"
import { ClerkSignIn } from "@/components/auth/clerk-sign-in"
import { clerkPublishableKeyOrNull } from "@/lib/clerk-config"

export default function SignInPage() {
  const key = clerkPublishableKeyOrNull()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0B0E14] p-6 text-center text-sm text-muted-foreground">
      {!key ? (
        <>
          <p className="max-w-md text-foreground">
            Clerk is not configured. Add keys from{" "}
            <a
              href="https://dashboard.clerk.com/"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-2"
            >
              dashboard.clerk.com
            </a>{" "}
            to{" "}
            <code className="rounded bg-secondary px-1 py-0.5 text-[11px]">
              .env.local
            </code>{" "}
            (see <code className="text-[11px]">.env.example</code>), then reload.
          </p>
          <Link
            href="/"
            className="rounded-lg border border-primary/40 px-4 py-2 text-primary"
          >
            Back to HUD
          </Link>
        </>
      ) : (
        <ClerkSignIn />
      )}
    </div>
  )
}
