import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

export const dynamic = "force-dynamic"

function upstreamBase(): string {
  return (
    process.env.WORKSPACE_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    "http://localhost:8787"
  ).replace(/\/$/, "")
}

type RouteCtx = { params: Promise<{ path?: string[] }> }

async function proxy(request: NextRequest, context: RouteCtx): Promise<Response> {
  const { userId, getToken } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const token = await getToken()
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { path: segments } = await context.params
  const tail = (segments ?? []).filter(Boolean).join("/")
  const u = new URL(request.url)

  const pathPart = tail ? `/${tail}` : ""
  const downstream = `${upstreamBase()}/v1/workspace${pathPart}${u.search}`

  const headers = new Headers()
  headers.set("Authorization", `Bearer ${token}`)
  const accept = request.headers.get("accept")
  if (accept) headers.set("accept", accept)

  let body: ArrayBuffer | undefined
  if (request.method !== "GET" && request.method !== "HEAD") {
    const ct = request.headers.get("content-type")
    if (ct) headers.set("content-type", ct)
    body = await request.arrayBuffer()
  }

  const res = await fetch(downstream, {
    method: request.method,
    headers,
    body: body && body.byteLength > 0 ? body : undefined,
    cache: "no-store",
  })

  const outHeaders = new Headers()
  const outCt = res.headers.get("content-type")
  if (outCt) outHeaders.set("content-type", outCt)

  return new NextResponse(await res.arrayBuffer(), {
    status: res.status,
    headers: outHeaders,
  })
}

export function GET(request: NextRequest, context: RouteCtx) {
  return proxy(request, context)
}

export function POST(request: NextRequest, context: RouteCtx) {
  return proxy(request, context)
}

export function PUT(request: NextRequest, context: RouteCtx) {
  return proxy(request, context)
}

export function PATCH(request: NextRequest, context: RouteCtx) {
  return proxy(request, context)
}

export function DELETE(request: NextRequest, context: RouteCtx) {
  return proxy(request, context)
}
