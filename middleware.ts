import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import type { NextFetchEvent, NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { isClerkMiddlewareEnabled } from "@/lib/clerk-config"

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"])

const clerk = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export default function middleware(
  request: NextRequest,
  event: NextFetchEvent,
) {
  if (!isClerkMiddlewareEnabled()) {
    return NextResponse.next()
  }
  return clerk(request, event)
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
