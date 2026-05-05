"use client"

import { Star, Globe, Brain, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"

const stats = [
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

export function MissionHUD() {
  const [currentFact, setCurrentFact] = useState(0)
  const [animatedStats, setAnimatedStats] = useState(stats.map(() => 0))

  useEffect(() => {
    // Animate stats on mount
    const duration = 2000
    const steps = 60
    const interval = duration / steps

    let step = 0
    const timer = setInterval(() => {
      step++
      setAnimatedStats(
        stats.map((stat) => {
          const progress = Math.min(step / steps, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          return stat.value * eased
        })
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
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          const value = animatedStats[index]
          const displayValue = stat.suffix === "%" 
            ? value.toFixed(1)
            : value >= 1000000 
              ? `${(value / 1000000).toFixed(1)}M`
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
                <p className="font-mono text-lg sm:text-2xl font-bold text-primary">
                  {displayValue}{stat.suffix}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">
                  {stat.label}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Did You Know Ticker */}
      <div className="relative overflow-hidden rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <span className="shrink-0 text-xs font-semibold text-primary">
            DID YOU KNOW?
          </span>
        </div>
        <div className="mt-1 overflow-hidden">
          <p 
            key={currentFact}
            className="animate-slide-up text-xs sm:text-sm text-muted-foreground leading-relaxed"
          >
            {facts[currentFact]}
          </p>
        </div>
      </div>
    </div>
  )
}
