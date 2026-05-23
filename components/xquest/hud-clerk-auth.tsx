"use client"

import Link from "next/link"
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs"
import { FolderOpen } from "lucide-react"
import { clerkPublishableKeyOrNull } from "@/lib/clerk-config"

export function HudClerkAuth() {
  if (!clerkPublishableKeyOrNull()) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <SignedOut>
        <SignInButton mode="modal">
          <button
            type="button"
            className="rounded-full border border-border bg-secondary/60 px-3 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary"
          >
            Sign in
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <Link
          href="/workspace"
          className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/15"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          Workspace
        </Link>
        <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
      </SignedIn>
    </div>
  )
}
