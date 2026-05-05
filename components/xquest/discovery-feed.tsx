"use client"

import { useEffect, useState } from "react"
import { Radio, Sparkles } from "lucide-react"

const usernames = [
  "Alpha-9", "Stellar-42", "Nebula-X", "Cosmos-7", "Nova-23",
  "Photon-8", "Quasar-1", "Orbit-99", "Pulsar-3", "Galaxy-K"
]

const sectors = [
  "Sector 42", "Kepler Zone", "Cygnus Arm", "Orion Spur", 
  "Lyra Field", "Scorpius Region", "Centauri Cluster"
]

const actions = [
  { template: (u: string, s: string, l: number) => `${u} found a Level ${l} Candidate in ${s}`, isHighlight: true },
  { template: (u: string, s: string) => `${u} scouted 50 stars in ${s}`, isHighlight: false },
  { template: (u: string) => `${u} achieved 95% accuracy in Transit Toss`, isHighlight: true },
  { template: (u: string, s: string) => `${u} validated a transit signal in ${s}`, isHighlight: false },
  { template: (u: string) => `${u} completed Module 3: Habitability`, isHighlight: false },
  { template: (u: string, s: string, l: number) => `${u} discovered Level ${l} candidate — pending review`, isHighlight: true },
]

function generateDiscovery() {
  const user = usernames[Math.floor(Math.random() * usernames.length)]
  const sector = sectors[Math.floor(Math.random() * sectors.length)]
  const level = Math.floor(Math.random() * 5) + 1
  const action = actions[Math.floor(Math.random() * actions.length)]
  
  return {
    id: Date.now() + Math.random(),
    message: action.template(user, sector, level),
    isHighlight: action.isHighlight && level >= 3,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
}

export function DiscoveryFeed() {
  const [discoveries, setDiscoveries] = useState(() => 
    Array.from({ length: 3 }, generateDiscovery)
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setDiscoveries(prev => {
        const newDiscovery = generateDiscovery()
        return [newDiscovery, ...prev.slice(0, 4)]
      })
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Radio className="h-4 w-4 text-primary animate-pulse" />
        <h3 className="text-sm font-semibold text-foreground">
          Global Discovery Feed
        </h3>
        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">
          LIVE
        </span>
      </div>
      
      <div className="space-y-2">
        {discoveries.map((discovery, index) => (
          <div
            key={discovery.id}
            className={`rounded-lg border px-3 py-2 transition-all ${
              index === 0 ? 'animate-slide-up' : ''
            } ${
              discovery.isHighlight
                ? 'border-primary/30 bg-primary/5'
                : 'border-border bg-card/50'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                {discovery.isHighlight && (
                  <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                )}
                <p className={`text-xs leading-relaxed ${
                  discovery.isHighlight ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {discovery.message}
                </p>
              </div>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                {discovery.timestamp}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
