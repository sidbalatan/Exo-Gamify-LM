"use client"

import { Star, Globe, Brain, Sparkles, Layers } from "lucide-react"
import { useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import Link from "next/link"
import { clerkPublishableKeyOrNull } from "@/lib/clerk-config"

const globalStats = [
  { label: "Stars Scouted", value: 2847392, icon: Star, suffix: "" },
  { label: "Earth 2.0 Candidates", value: 1247, icon: Globe, suffix: "" },
  { label: "ML Accuracy", value: 94.7, icon: Brain, suffix: "%" },
]

const facts = [
  "K-Dwarf stars are 70% smaller than our Sun but can host habitable planets for up to 45 billion years.",
  "Climate change could make Earth uninhabitable in the next 1,000 years — finding alternatives is critical.",
  "An asteroid impact remains one of humanity's greatest existential threats. Multi-planetary survival is key.",
  "Nuclear winter from conflict could block sunlight for decades. Backup habitats ensure survival.",
  "The Gaia telescope has mapped over 1.8 billion stars with unprecedented precision.",
  "Exoplanets in the habitable zone may contain liquid water — the foundation of life as we know it.",
]

// Rendered only inside ClerkProvider — safe to call useAuth()
function PersonalTargetStat() {
  const { isSignedIn } = useAuth()
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    if (!isSignedIn) return
    let cancelled = false
    queueMicrotask(async () => {
      try {
        const res = await fetch("/api/workspace/me")
        if (!res.ok || cancelled) return
        const data = (await res.json()) as { target_count: number }
        if (!cancelled) setCount(data.target_count)
      } catch {
        // non-fatal — stat simply won't show
      }
    })
    return () => { cancelled = true }
  }, [isSignedIn])

  if (!isSignedIn) {
    return (
      <Link href="/sign-in">
        <div className="relative overflow-hidden rounded-lg border border-primary/30 bg-primary/5 p-3 sm:p-4 backdrop-blur-sm transition-colors hover:bg-primary/10">
          <div className="absolute -right-2 -top-2 opacity-10">
            <Layers className="h-12 w-12 sm:h-16 sm:w-16 text-primary" />
          </div>
          <div className="relative">
            <Layers className="mb-1 h-4 w-4 text-primary" />
            <p className="font-mono text-lg font-bold sm:text-2xl text-primary">—</p>
            <p className="text-[10px] sm:text-xs leading-tight text-muted-foreground">
              My Targets
            </p>
            <p className="mt-1 text-[9px] text-primary/70">Sign in →</p>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link href="/workspace">
      <div className="relative overflow-hidden rounded-lg border border-primary/30 bg-primary/5 p-3 sm:p-4 backdrop-blur-sm transition-colors hover:bg-primary/10">
        <div className="absolute -right-2 -top-2 opacity-10">
          <Layers className="h-12 w-12 sm:h-16 sm:w-16 text-primary" />
        </div>
        <div className="relative">
          <Layers className="mb-1 h-4 w-4 text-primary" />
          <p className="font-mono text-lg font-bold sm:text-2xl text-primary">
            {count === null ? "…" : count}
          </p>
          <p className="text-[10px] sm:text-xs leading-tight text-muted-foreground">
            My Targets
          </p>
          <p className="mt-1 text-[9px] text-primary/70">Open workspace →</p>
        </div>
      </div>
    </Link>
  )
}

export function MissionHUD() {
  const clerkEnabled = clerkPublishableKeyOrNull() !== null
  const [currentFact, setCurrentFact] = useState(0)
  const [animatedStats, setAnimatedStats] = useState(globalStats.map(() => 0))

  useEffect(() => {
    const duration = 2000
    const steps = 60
    const interval = duration / steps
    let step = 0
    const timer = setInterval(() => {
      step++
      setAnimatedStats(
        globalStats.map((stat) => {
          const progress = Math.min(step / steps, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          return stat.value * eased
        }),
      )
      if (step >= steps) clearInterval(timer)
    }, interval)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const factTimer = setInterval(() => {
      setCurrentFact((prev) => (prev + 1) % facts.length)
    }, 6000)
    return () => clearInterval(factTimer)
  }, [])

  return (
    <div className="space-y-4">
      <div className={`grid gap-2 sm:gap-4 ${clerkEnabled ? "grid-cols-4" : "grid-cols-3"}`}>
        {globalStats.map((stat, index) => {
          const Icon = stat.icon
          const value = animatedStats[index]
          const displayValue =
            stat.suffix === "%"
              ? value.toFixed(1)
              : value >= 1_000_000
                ? `${(value / 1_000_000).toFixed(1)}M`
                : value >= 1000
                  ? `${(value / 1000).toFixed(1)}K`
                  : Math.floor(value)

          return (
            <div
              key={stat.label}
              className="relative overflow-hidden rounded-lg border border-border bg-card/50 p-3 sm:p-4 backdrop-blur-sm"
            >
              <div className="absolute -right-2 -top-2 opacity-10">
                <Icon className="h-12 w-12 sm:h-16 sm:w-16 text-primary" />
              </div>
              <div className="relative">
                <Icon className="mb-1 h-4 w-4 text-primary" />
                <p className="font-mono text-lg font-bold sm:text-2xl text-primary">
                  {displayValue}
                  {stat.suffix}
                </p>
                <p className="text-[10px] sm:text-xs leading-tight text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            </div>
          )
        })}

        {clerkEnabled && <PersonalTargetStat />}
      </div>

      <div className="relative overflow-hidden rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <span className="shrink-0 text-xs font-semibold text-primary">DID YOU KNOW?</span>
        </div>
        <div className="mt-1 overflow-hidden">
          <p
            key={currentFact}
            className="animate-slide-up text-xs leading-relaxed text-muted-foreground sm:text-sm"
          >
            {facts[currentFact]}
          </p>
        </div>
      </div>
    </div>
  )
}
