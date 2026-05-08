"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Rocket, ArrowRight, Star, Globe } from "lucide-react"
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs"
import { clerkPublishableKeyOrNull } from "@/lib/clerk-config"
import { MissionHUD } from "@/components/xquest/mission-hud"
import { GaiaScanner } from "@/components/xquest/gaia-scanner"
import { TransitToss } from "@/components/xquest/transit-toss"
import { DiscoveryFeed } from "@/components/xquest/discovery-feed"
import { ExoRegSearch } from "@/components/xquest/exoreg-search"
import { MissionProgress } from "@/components/xquest/mission-progress"
import { BottomNav } from "@/components/xquest/bottom-nav"
import { KDwarfScout } from "@/components/xquest/games/game1-kdwarf-scout"
import { HabitabilityOracle } from "@/components/xquest/games/game3-habitability-oracle"
import {
  getRank,
  getScore,
  getScoutedStars,
  getCertifiedCount,
  getNullCount,
  getExoRegEntries,
  type ExoRegEntry,
  type ScoutedStar,
} from "@/lib/game-score"

const tabProgress: Record<string, number> = {
  scout:       12,
  pipeline:    45,
  leaderboard: 60,
  exoreg:      85,
}

// ─── Score banner (reads localStorage) ───────────────────────────────────────

function ScoreBanner() {
  const [score, setScore] = useState(0)

  useEffect(() => {
    const read = () => setScore(getScore())
    read()
    window.addEventListener("exoquest_score_updated", read)
    return () => window.removeEventListener("exoquest_score_updated", read)
  }, [])

  const rank = getRank(score)

  return (
    <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          Total Score
        </span>
        <span className="font-mono text-sm font-bold text-primary">
          {score.toLocaleString()}
        </span>
      </div>
      <div className="rounded-full bg-primary/10 px-2.5 py-0.5">
        <span className="text-[10px] font-bold text-primary">{rank}</span>
      </div>
    </div>
  )
}

// ─── Pipeline chips (scouted K dwarfs from Game 1) ───────────────────────────

function PipelineChips() {
  const [stars, setStars] = useState<ScoutedStar[]>([])

  useEffect(() => {
    const read = () => setStars(getScoutedStars())
    read()
    window.addEventListener("exoquest_score_updated", read)
    return () => window.removeEventListener("exoquest_score_updated", read)
  }, [])

  if (stars.length === 0) return null

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
      <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wide text-primary">
        Scouted K Dwarfs pipeline input → Game 2
      </p>
      <div className="flex flex-wrap gap-1">
        {stars.map((s) => (
          <span
            key={s.id}
            className="rounded-full bg-primary/20 px-2 py-0.5 font-mono text-[9px] text-primary"
            title={`${s.name} · Teff ${s.teff} K · ${s.sector}`}
          >
            {s.name.split(" ").pop()}
          </span>
        ))}
      </div>
      <p className="mt-1 text-[8px] text-muted-foreground">
        {stars.length}/7 stars saved · Tagged in Transit Toss for training context
      </p>
    </div>
  )
}

// ─── ExoReg tab content ────────────────────────────────────────────────────────

function ExoRegTab() {
  const [certified, setCertified]   = useState(0)
  const [nullCount, setNullCount]   = useState(0)
  const [entries, setEntries]       = useState<ExoRegEntry[]>([])

  useEffect(() => {
    const read = () => {
      setCertified(getCertifiedCount())
      setNullCount(getNullCount())
      setEntries(getExoRegEntries().slice(0, 10))
    }
    read()
    window.addEventListener("exoquest_score_updated", read)
    return () => window.removeEventListener("exoquest_score_updated", read)
  }, [])

  const typeLabel: Record<ExoRegEntry["type"], string> = {
    certified_kdwarf:    "Certified K Dwarf",
    null_kdwarf:         "Null K Dwarf",
    habitable_candidate: "HZ Candidate",
    transit_candidate:   "Transit Candidate",
    null_transit:        "Null Transit",
  }

  const typeBadge: Record<ExoRegEntry["type"], string> = {
    certified_kdwarf:    "text-green-400",
    null_kdwarf:         "text-muted-foreground",
    habitable_candidate: "text-amber-400",
    transit_candidate:   "text-blue-400",
    null_transit:        "text-muted-foreground",
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">ExoReg Archive</h2>
        <p className="text-sm text-muted-foreground">
          Search and explore the exoplanet candidate registry
        </p>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Star className="h-4 w-4 text-green-400" />
            <span className="text-[10px] font-bold uppercase text-green-400">Certified K Dwarfs</span>
          </div>
          <p className="font-mono text-2xl font-bold text-green-400">{certified}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/50 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Null K Dwarfs</span>
          </div>
          <p className="font-mono text-2xl font-bold text-foreground">{nullCount}</p>
        </div>
      </div>

      {/* Recent entries */}
      {entries.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Recent Classifications</h3>
          <div className="space-y-1.5">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between rounded-lg border border-border bg-card/50 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-foreground truncate">
                      {entry.starName}
                    </span>
                    <span className={cn("text-[9px] font-semibold shrink-0", typeBadge[entry.type])}>
                      {typeLabel[entry.type]}
                    </span>
                  </div>
                  {entry.note && (
                    <p className="mt-0.5 text-[9px] text-muted-foreground truncate">{entry.note}</p>
                  )}
                </div>
                <span className="ml-2 shrink-0 font-mono text-[9px] text-muted-foreground">
                  {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ExoRegSearch />

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Recent Searches</h3>
        <div className="space-y-2">
          {[
            { id: "Gaia DR3 4567891234", status: "Level 4 Candidate" },
            { id: "Gaia DR3 8912345678", status: "Under Review" },
            { id: "Gaia DR3 2345678901", status: "Confirmed False Positive" },
          ].map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card/50 px-3 py-2"
            >
              <span className="font-mono text-xs text-foreground">{item.id}</span>
              <span className={`text-[10px] font-medium ${
                item.status.includes("Level")
                  ? "text-green-400"
                  : item.status.includes("Review")
                    ? "text-yellow-400"
                    : "text-muted-foreground"
              }`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

// cn helper needed inline for ExoRegTab (avoids extra import in small inline component)
function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ")
}

export default function XQuestPage() {
  const [activeTab, setActiveTab] = useState("scout")
  const clerkEnabled = clerkPublishableKeyOrNull() !== null

  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Mission Progress Bar */}
      <MissionProgress progress={tabProgress[activeTab] ?? 0} />

      {/* Header */}
      <header className="sticky top-1 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Rocket className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">ExoQuest</h1>
              <p className="text-[10px] text-muted-foreground">
                Community Quest for K Dwarfs and Exoplanets
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-primary/10 px-3 py-1">
              <span className="font-mono text-xs font-semibold text-primary">v1.0</span>
            </div>
            {clerkEnabled && (
              <>
                <SignedIn>
                  <Link
                    href="/workspace"
                    className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/10"
                  >
                    Workspace
                  </Link>
                  <UserButton
                    afterSignOutUrl="/sign-in"
                    appearance={{
                      elements: { avatarBox: "h-9 w-9 rounded-lg ring-1 ring-primary/30" },
                    }}
                  />
                </SignedIn>
                <SignedOut>
                  <SignInButton mode="redirect">
                    <button className="rounded-lg border border-primary/40 px-3 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/10">
                      Sign in
                    </button>
                  </SignInButton>
                </SignedOut>
              </>
            )}
          </div>
        </div>

        {/* Score banner */}
        <div className="border-t border-border/50">
          <ScoreBanner />
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-lg space-y-6 px-4 py-6">
        {/* ── SCOUT TAB ──────────────────────────────────────────────────────── */}
        {activeTab === "scout" && (
          <>
            {/* Mission Status HUD */}
            <section aria-label="Mission Status">
              <MissionHUD />
            </section>

            {/* Pipeline flow indicator */}
            <section aria-label="Game Pipeline">
              <div className="flex items-center justify-center gap-1 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                <span className="text-[10px] font-semibold text-primary">Scout K Dwarfs</span>
                <ArrowRight className="h-3 w-3 text-primary/60" />
                <span className="text-[10px] font-semibold text-primary">Label Light Curves</span>
                <ArrowRight className="h-3 w-3 text-primary/60" />
                <span className="text-[10px] font-semibold text-primary">Score Habitability</span>
              </div>
            </section>

            {/* Game 1: K-Dwarf Scout */}
            <section aria-label="K-Dwarf Scout Game">
              <div className="rounded-xl border border-border bg-card/80 p-4 backdrop-blur-sm">
                <KDwarfScout />
              </div>
            </section>

            {/* Pipeline chips: scouted K dwarfs */}
            <section aria-label="Scouted Stars Pipeline">
              <PipelineChips />
            </section>

            {/* Game 2: Transit Toss */}
            <section aria-label="Transit Toss Game">
              <div className="rounded-xl border border-border bg-card/80 p-4 backdrop-blur-sm">
                <TransitToss />
              </div>
            </section>

            {/* Game 3: Habitability Oracle */}
            <section aria-label="Habitability Oracle Game">
              <div className="rounded-xl border border-border bg-card/80 p-4 backdrop-blur-sm">
                <HabitabilityOracle />
              </div>
            </section>

            {/* Gaia Scanner */}
            <section aria-label="Gaia Scanner">
              <GaiaScanner />
            </section>

            {/* Discovery Feed */}
            <section aria-label="Discovery Feed">
              <DiscoveryFeed />
            </section>
          </>
        )}

        {/* ── PIPELINE TAB ───────────────────────────────────────────────────── */}
        {activeTab === "pipeline" && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-6">
              <Rocket className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">ExoQuest Pipeline</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Track your discoveries through the 8-stage validation process
            </p>
            <p className="mt-4 rounded-lg border border-border bg-card/50 px-4 py-2 text-xs text-muted-foreground">
              Coming soon in v1.1
            </p>
          </div>
        )}

        {/* ── LEADERBOARD TAB ────────────────────────────────────────────────── */}
        {activeTab === "leaderboard" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Global Rankings</h2>
            <div className="space-y-2">
              {[
                { rank: 1, user: "Stellar-42", score: 15847, badge: "🏆" },
                { rank: 2, user: "Nova-23",    score: 12453, badge: "🥈" },
                { rank: 3, user: "Cosmos-7",   score: 11290, badge: "🥉" },
                { rank: 4, user: "Quasar-1",   score:  9876, badge: ""   },
                { rank: 5, user: "Pulsar-3",   score:  8754, badge: ""   },
              ].map((entry) => (
                <div
                  key={entry.rank}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                    entry.rank <= 3
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-card/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-lg font-bold ${
                      entry.rank === 1 ? "text-primary" : "text-muted-foreground"
                    }`}>
                      #{entry.rank}
                    </span>
                    <span className="font-medium text-foreground">{entry.user}</span>
                    {entry.badge && <span>{entry.badge}</span>}
                  </div>
                  <span className="font-mono text-sm text-primary">
                    {entry.score.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground">
              You are ranked #1,247 globally
            </p>
          </div>
        )}

        {/* ── EXOREG TAB ─────────────────────────────────────────────────────── */}
        {activeTab === "exoreg" && <ExoRegTab />}
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </main>
  )
}
