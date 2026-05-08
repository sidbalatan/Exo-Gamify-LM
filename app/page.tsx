"use client"

import { useState } from "react"
import { Rocket } from "lucide-react"
import { MissionHUD } from "@/components/xquest/mission-hud"
import { GaiaScanner } from "@/components/xquest/gaia-scanner"
import { TransitToss } from "@/components/xquest/transit-toss"
import { DiscoveryFeed } from "@/components/xquest/discovery-feed"
import { ExoRegSearch } from "@/components/xquest/exoreg-search"
import { MissionProgress } from "@/components/xquest/mission-progress"
import { BottomNav } from "@/components/xquest/bottom-nav"

const tabProgress: Record<string, number> = {
  scout: 12,
  pipeline: 45,
  leaderboard: 60,
  exoreg: 85,
}

export default function XQuestPage() {
  const [activeTab, setActiveTab] = useState("scout")

  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Mission Progress Bar */}
      <MissionProgress progress={tabProgress[activeTab]} />

      {/* Header */}
      <header className="sticky top-1 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Rocket className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                XQuest
              </h1>
              <p className="text-[10px] text-muted-foreground">
                Citizen Space Exploration
              </p>
            </div>
          </div>
          <div className="rounded-full bg-primary/10 px-3 py-1">
            <span className="font-mono text-xs font-semibold text-primary">
              v1.0
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-lg space-y-6 px-4 py-6">
        {activeTab === "scout" && (
          <>
            {/* Mission Status HUD */}
            <section aria-label="Mission Status">
              <MissionHUD />
            </section>

            {/* Gaia Scanner */}
            <section aria-label="Gaia Scanner">
              <GaiaScanner />
            </section>

            {/* Transit Toss Mini-Game */}
            <section aria-label="Transit Toss Game">
              <TransitToss />
            </section>

            {/* ExoReg Search */}
            <section aria-label="ExoReg Search">
              <ExoRegSearch />
            </section>

            {/* Discovery Feed */}
            <section aria-label="Discovery Feed">
              <DiscoveryFeed />
            </section>
          </>
        )}

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

        {activeTab === "leaderboard" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Global Rankings</h2>
            <div className="space-y-2">
              {[
                { rank: 1, user: "Stellar-42", score: 15847, badge: "=ƒÅå" },
                { rank: 2, user: "Nova-23", score: 12453, badge: "=ƒÑê" },
                { rank: 3, user: "Cosmos-7", score: 11290, badge: "=ƒÑë" },
                { rank: 4, user: "Quasar-1", score: 9876, badge: "" },
                { rank: 5, user: "Pulsar-3", score: 8754, badge: "" },
              ].map((entry) => (
                <div
                  key={entry.rank}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                    entry.rank <= 3 
                      ? 'border-primary/30 bg-primary/5' 
                      : 'border-border bg-card/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-lg font-bold ${
                      entry.rank === 1 ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                      #{entry.rank}
                    </span>
                    <span className="font-medium text-foreground">
                      {entry.user}
                    </span>
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

        {activeTab === "exoreg" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-foreground">ExoReg Archive</h2>
              <p className="text-sm text-muted-foreground">
                Search and explore the exoplanet candidate registry
              </p>
            </div>
            <ExoRegSearch />
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Recent Searches
              </h3>
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
                    <span className="font-mono text-xs text-foreground">
                      {item.id}
                    </span>
                    <span className={`text-[10px] font-medium ${
                      item.status.includes('Level') 
                        ? 'text-green-400'
                        : item.status.includes('Review')
                          ? 'text-yellow-400'
                          : 'text-muted-foreground'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </main>
  )
}
