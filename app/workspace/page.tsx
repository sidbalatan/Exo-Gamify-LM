"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { Layers, Rocket } from "lucide-react"
import { clerkPublishableKeyOrNull } from "@/lib/clerk-config"

type ProfileWire = {
  user_id: string
  email: string | null
  display_name: string | null
  created_at: string
}

type MeWire = { profile: ProfileWire; target_count: number }

type TargetWire = {
  user_id: string
  id: string
  kind: string
  gaia_source_id: string | null
  ra_deg: number | null
  dec_deg: number | null
  label: string | null
  created_at: string
}

type TargetsWire = { items: TargetWire[] }

type AssetWire = {
  id: string
  asset_type: string
  title: string | null
  content_type: string
  byte_size: number
  sha256_hex: string | null
  created_at: string
}

type AssetsWire = { items: AssetWire[] }

function isoShort(iso: string) {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
  } catch {
    return iso
  }
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

async function parseErrorMessage(res: Response): Promise<string> {
  const raw = await res.text()
  try {
    const data = JSON.parse(raw) as {
      detail?: unknown
      error?: string
    }
    if (typeof data?.detail === "string") return data.detail
    if (Array.isArray(data?.detail))
      return data.detail.map((d: unknown) => JSON.stringify(d)).join("; ")
    if (data?.detail != null) return JSON.stringify(data.detail)
    if (typeof data?.error === "string") return data.error
    return `${res.status} ${res.statusText}`
  } catch {
    return raw?.slice(0, 280) || `${res.status} ${res.statusText}`
  }
}

// Inner component — only rendered inside ClerkProvider, so useAuth() is safe
function WorkspaceContent() {
  const { isLoaded } = useAuth()

  const [me, setMe] = useState<MeWire | null>(null)
  const [targets, setTargets] = useState<TargetWire[] | null>(null)
  const [assets, setAssets] = useState<AssetWire[] | null>(null)
  const [assetsNotice, setAssetsNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [gaiaInput, setGaiaInput] = useState("")
  const [labelInput, setLabelInput] = useState("")
  const [saving, setSaving] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const [assetTitle, setAssetTitle] = useState("")
  const [assetKind, setAssetKind] = useState("")
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [meRes, tRes, aRes] = await Promise.all([
        fetch("/api/workspace/me"),
        fetch("/api/workspace/targets"),
        fetch("/api/workspace/assets"),
      ])

      if (meRes.status === 401 || tRes.status === 401 || aRes.status === 401) {
        setMe(null)
        setTargets([])
        setAssets([])
        setError("Session expired — sign in again.")
        return
      }

      if (!meRes.ok) {
        setMe(null)
        setTargets(null)
        setAssets(null)
        setError(await parseErrorMessage(meRes))
        return
      }

      const meJson = (await meRes.json()) as MeWire

      if (!tRes.ok) {
        setMe(meJson)
        setTargets(null)
        setAssets(null)
        setError(await parseErrorMessage(tRes))
        return
      }

      setMe(meJson)
      setTargets(((await tRes.json()) as TargetsWire).items)

      if (aRes.ok) {
        setAssets(((await aRes.json()) as AssetsWire).items)
        setAssetsNotice(null)
      } else {
        setAssets([])
        setAssetsNotice(await parseErrorMessage(aRes))
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load workspace."
      setMe(null)
      setTargets(null)
      setAssets(null)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    queueMicrotask(() => {
      void refresh()
    })
  }, [isLoaded, refresh])

  const onAddTarget = async (e: React.FormEvent) => {
    e.preventDefault()
    const id = gaiaInput.trim()
    if (!id) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/workspace/targets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "GAIA_DR3_SOURCE_ID",
          gaia_source_id: id,
          label: labelInput.trim() || null,
          notes: null,
        }),
      })
      if (!res.ok) {
        setError(await parseErrorMessage(res))
        return
      }
      setGaiaInput("")
      setLabelInput("")
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add target.")
    } finally {
      setSaving(false)
    }
  }

  const onUploadAsset = async (e: React.FormEvent) => {
    e.preventDefault()
    const input = fileRef.current
    const file = input?.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      if (assetTitle.trim()) fd.append("title", assetTitle.trim())
      if (assetKind) fd.append("asset_type_override", assetKind)
      const res = await fetch("/api/workspace/assets/upload", {
        method: "POST",
        body: fd,
      })
      if (!res.ok) {
        setError(await parseErrorMessage(res))
        return
      }
      setAssetTitle("")
      if (input) input.value = ""
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.")
    } finally {
      setUploading(false)
    }
  }

  const onDeleteAsset = async (id: string) => {
    setDeletingId(id)
    setError(null)
    try {
      const res = await fetch(`/api/workspace/assets/${id}`, { method: "DELETE" })
      if (!res.ok && res.status !== 204) {
        setError(await parseErrorMessage(res))
        return
      }
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.")
    } finally {
      setDeletingId(null)
    }
  }

  if (!isLoaded) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center bg-background text-muted-foreground">
        Opening workspace…
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Layers className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                Personal Workspace
              </p>
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                Mission roster
              </h1>
            </div>
          </div>
          <Link href="/">
            <span className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary/70">
              <Rocket className="h-4 w-4 text-primary" />
              HUD
            </span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-6 px-4 py-6">
        <section aria-label="Account">
          <div className="rounded-2xl border border-border bg-card/45 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Workspace profile
            </h2>
            {loading && !me ? (
              <p className="mt-3 text-sm text-muted-foreground">Loading …</p>
            ) : me ? (
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[11px] text-muted-foreground">User id</dt>
                  <dd className="break-all font-mono text-[12px] text-foreground">
                    {me.profile.user_id}
                  </dd>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <div>
                    <dt className="text-[11px] text-muted-foreground">Email</dt>
                    <dd className="text-foreground">{me.profile.email ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-muted-foreground">Display name</dt>
                    <dd className="text-foreground">{me.profile.display_name ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-muted-foreground">Targets</dt>
                    <dd className="font-mono text-foreground">{me.target_count}</dd>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Member since{" "}
                  <span className="text-foreground">{isoShort(me.profile.created_at)}</span>
                </p>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Could not load profile.</p>
            )}
          </div>
        </section>

        <section aria-label="Saved files">
          <div className="rounded-2xl border border-border bg-card/45 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Files &amp; plots
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Upload images, CSV, PDF, JSON, or text (max 25&nbsp;MiB). Binaries are stored on disk
              under <code className="font-mono text-[10px]">WORKSPACE_BLOB_ROOT</code> with metadata
              in Postgres.
            </p>
            {assetsNotice ? (
              <p className="mt-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-[12px] text-yellow-200">
                Files unavailable: {assetsNotice}
              </p>
            ) : null}
            <form className="mt-4 space-y-3" onSubmit={onUploadAsset}>
              <div className="space-y-1">
                <label htmlFor="asset-file" className="text-[11px] font-medium text-foreground">
                  File
                </label>
                <input
                  id="asset-file"
                  ref={fileRef}
                  type="file"
                  accept=".csv,.pdf,.png,.jpg,.jpeg,.gif,.webp,.svg,.json,.txt,text/csv,image/*,application/pdf"
                  className="w-full text-xs text-foreground file:mr-3 file:rounded-lg file:border file:border-border file:bg-secondary file:px-3 file:py-1.5"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="asset-title" className="text-[11px] font-medium text-foreground">
                  Title (optional)
                </label>
                <input
                  id="asset-title"
                  placeholder="Kepler field scan plot"
                  className="w-full rounded-xl border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60"
                  value={assetTitle}
                  onChange={(evt) => setAssetTitle(evt.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="asset-kind" className="text-[11px] font-medium text-foreground">
                  Category override (optional)
                </label>
                <select
                  id="asset-kind"
                  className="w-full rounded-xl border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60"
                  value={assetKind}
                  onChange={(evt) => setAssetKind(evt.target.value)}
                >
                  <option value="">Auto (from MIME)</option>
                  <option value="IMAGE">IMAGE</option>
                  <option value="PLOT">PLOT</option>
                  <option value="ARCHIVE_OTHER">ARCHIVE_OTHER (docs, CSV, etc.)</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={uploading}
                className="w-full rounded-xl bg-primary py-2.5 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Upload file"}
              </button>
            </form>
            {assets && assets.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {assets.map((a) => (
                  <li key={a.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-secondary/30 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {a.title ?? a.id}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {a.asset_type} · {a.content_type} · {formatBytes(a.byte_size)} ·{" "}
                          {isoShort(a.created_at)}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <a
                          href={`/api/workspace/assets/${a.id}/download`}
                          className="rounded-lg border border-primary/40 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10"
                        >
                          Download
                        </a>
                        <button
                          type="button"
                          disabled={deletingId === a.id}
                          onClick={() => void onDeleteAsset(a.id)}
                          className="rounded-lg border border-destructive/40 px-2 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                        >
                          {deletingId === a.id ? "…" : "Delete"}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : !assetsNotice && assets && assets.length === 0 ? (
              <p className="mt-4 text-center text-sm text-muted-foreground">No files yet.</p>
            ) : null}
          </div>
        </section>

        <section aria-label="Add Gaia target">
          <div className="rounded-2xl border border-primary/35 bg-primary/5 p-4">
            <h2 className="text-sm font-semibold text-foreground">Add Gaia DR3 source</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Values are persisted as BIGINT in Postgres and returned as decimal strings for
              JavaScript-safe precision.
            </p>
            <form className="mt-4 space-y-3" onSubmit={onAddTarget}>
              <div className="space-y-1">
                <label htmlFor="gaia-id" className="text-[11px] font-medium text-foreground">
                  Gaia source_id (string)
                </label>
                <input
                  id="gaia-id"
                  autoComplete="off"
                  placeholder="6123456789012345678"
                  className="w-full rounded-xl border border-border bg-secondary/60 px-3 py-2 text-sm font-mono text-foreground outline-none ring-0 focus:border-primary/60"
                  value={gaiaInput}
                  onChange={(evt) => setGaiaInput(evt.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="label" className="text-[11px] font-medium text-foreground">
                  Label (optional)
                </label>
                <input
                  id="label"
                  placeholder="Nearby K dwarf candidate"
                  className="w-full rounded-xl border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary/60"
                  value={labelInput}
                  onChange={(evt) => setLabelInput(evt.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={saving || !gaiaInput.trim()}
                className="w-full rounded-xl bg-primary py-2.5 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
              >
                {saving ? "Saving…" : "Add to workspace"}
              </button>
            </form>
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <p className="font-semibold">
              {error.includes("DATABASE_URL") ||
              error.includes("database pool") ||
              error.includes("WORKSPACE_BLOB_ROOT") ||
              error.includes("503")
                ? "Backend / database offline"
                : "Request failed"}
            </p>
            <p className="mt-2 text-[13px] leading-relaxed">{error}</p>
            {(error.includes("DATABASE_URL") || error.includes("database pool")) && (
              <ul className="mt-3 list-disc space-y-1 pl-4 text-[12px] text-destructive/90">
                <li>
                  Set{" "}
                  <code className="font-mono text-[11px]">DATABASE_URL</code> in{" "}
                  <code className="font-mono text-[11px]">backend/.env</code> and restart uvicorn.
                </li>
                <li>
                  Apply{" "}
                  <code className="font-mono text-[11px]">database/workspace_ddl.sql</code>{" "}
                  (Docker script helps).
                </li>
                <li>
                  Keep Next.js pointing at FastAPI (
                  <code className="font-mono text-[11px]">WORKSPACE_API_URL</code>).
                </li>
              </ul>
            )}
            {error.includes("WORKSPACE_BLOB_ROOT") || error.includes("blob") ? (
              <p className="mt-3 text-[12px] text-destructive/90">
                Set <code className="font-mono">WORKSPACE_BLOB_ROOT</code> in{" "}
                <code className="font-mono">backend/.env</code> (e.g.{" "}
                <code className="font-mono">./data/blob</code>
                ) so uploads have a directory on the API server.
              </p>
            ) : null}
          </div>
        ) : null}

        <section aria-label="Targets">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Targets
            </h2>
            <button
              type="button"
              onClick={() => void refresh()}
              className="text-[11px] font-semibold text-primary hover:text-primary/90"
            >
              Refresh
            </button>
          </div>
          {loading && targets === null ? (
            <p className="mt-3 text-sm text-muted-foreground">Loading targets …</p>
          ) : !targets?.length ? (
            <div className="mt-4 rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No targets yet. Add a Gaia source above — it appears partitioned by your Clerk user
              id in Postgres.
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {targets.map((t) => (
                <li key={t.id}>
                  <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card/40 px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                          {t.kind.replaceAll("_", " ")}
                        </p>
                        {t.gaia_source_id ? (
                          <p className="mt-1 font-mono text-sm text-foreground">
                            Gaia source_id · {t.gaia_source_id}
                          </p>
                        ) : (
                          <p className="mt-1 font-mono text-sm text-muted-foreground">
                            No Gaia ID (coords / alias)
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {isoShort(t.created_at)}
                      </span>
                    </div>
                    {t.label ? <p className="text-sm text-foreground">{t.label}</p> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}

// Outer export — safe to render without ClerkProvider
export default function WorkspacePage() {
  const clerkKey = clerkPublishableKeyOrNull()

  if (!clerkKey) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 bg-background px-4 py-10 text-muted-foreground">
        <Link href="/" className="text-sm font-medium text-primary hover:text-primary/90">
          ← Back to HUD
        </Link>
        <div className="rounded-2xl border border-border bg-card/40 p-6 text-sm leading-relaxed text-foreground">
          <p>Workspace needs Clerk to map your Postgres rows to `profiles.user_id`.</p>
          <p className="mt-3 text-muted-foreground">
            Configure{" "}
            <code className="rounded bg-secondary px-1 py-0.5 text-[11px]">
              NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
            </code>
            {" + "}
            <code className="rounded bg-secondary px-1 py-0.5 text-[11px]">CLERK_SECRET_KEY</code>
            , then revisit this route.
          </p>
        </div>
      </main>
    )
  }

  return <WorkspaceContent />
}
