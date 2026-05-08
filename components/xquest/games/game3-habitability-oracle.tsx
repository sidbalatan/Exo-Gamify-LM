"use client"

import { useEffect, useState } from "react"
import { Globe, Sparkles, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { addExoRegEntry, addScore } from "@/lib/game-score"

// ─── ESI calculation (Schulze-Makuch et al. 2011) ────────────────────────────

interface ESIParams {
  radius: number       // R⊕
  density: number      // g/cm³
  escapeVel: number    // km/s
  surfaceTemp: number  // K
}

const EARTH_REF: ESIParams = {
  radius:      1.0,
  density:     5.51,
  escapeVel:   11.19,
  surfaceTemp: 288,
}

const WEIGHTS: Record<keyof ESIParams, number> = {
  radius:      0.57,
  density:     1.07,
  escapeVel:   0.70,
  surfaceTemp: 5.58,
}

const N_PARAMS = 4

function calcESI(p: ESIParams): number {
  const keys: (keyof ESIParams)[] = ["radius", "density", "escapeVel", "surfaceTemp"]
  let esi = 1.0
  for (const k of keys) {
    const xi   = p[k]
    const xref = EARTH_REF[k]
    const wi   = WEIGHTS[k]
    const term = (1 - Math.abs((xi - xref) / (xi + xref))) ** (wi / N_PARAMS)
    esi *= term
  }
  return esi
}

interface Planet extends ESIParams {
  id: string
  name: string
  esi: number
}

const PLANET_NAMES = [
  "Aethon-7b", "Calore-3c", "Durandal-9b", "Elysium-2d", "Ferox-5c",
  "Gryphon-4b", "Helion-6d", "Irene-8b",   "Janus-1c",  "Kelex-0b",
]

function generatePlanet(roundNumber: number): Planet {
  const radius      = 0.5 + Math.random() * 2.0
  const density     = 2.0 + Math.random() * 10.0
  const escapeVel   = 5.0 + Math.random() * 20.0
  const surfaceTemp = 200 + Math.random() * 200
  const params: ESIParams = { radius, density, escapeVel, surfaceTemp }
  const esi = calcESI(params)
  const name = PLANET_NAMES[roundNumber % PLANET_NAMES.length]
  return { id: `planet-${roundNumber}-${Date.now()}`, name, esi, ...params }
}

// ─── Per-parameter similarity bar ─────────────────────────────────────────────

function SimilarityBar({ label, value, refValue, unit }: {
  label: string; value: number; refValue: number; unit: string
}) {
  const sim = 1 - Math.abs((value - refValue) / (value + refValue))
  const pct = Math.round(sim * 100)
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">
          {value.toFixed(2)}{unit}
          <span className="text-muted-foreground"> / {refValue}{unit}</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            pct >= 80 ? "bg-green-400" : pct >= 50 ? "bg-amber-400" : "bg-red-400",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-right text-[8px] text-muted-foreground">{pct}% similarity</p>
    </div>
  )
}

// ─── SVG Radar chart ──────────────────────────────────────────────────────────

function RadarChart({ planet }: { planet: Planet }) {
  const size   = 100
  const cx     = size / 2
  const cy     = size / 2
  const r      = 40
  const keys: (keyof ESIParams)[] = ["radius", "density", "escapeVel", "surfaceTemp"]
  const labels = ["R", "ρ", "Vesc", "T"]

  const angles = keys.map((_, i) => (i / keys.length) * 2 * Math.PI - Math.PI / 2)

  const earthPts = keys.map((_, i) => {
    const a = angles[i]
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`
  }).join(" ")

  const planetPts = keys.map((k, i) => {
    const a = angles[i]
    const sim = 1 - Math.abs((planet[k] - EARTH_REF[k]) / (planet[k] + EARTH_REF[k]))
    const rr = r * sim
    return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`
  }).join(" ")

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-28 w-28">
      {/* Axis lines */}
      {keys.map((_, i) => {
        const a = angles[i]
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={(cx + r * Math.cos(a)).toFixed(1)}
            y2={(cy + r * Math.sin(a)).toFixed(1)}
            stroke="currentColor" strokeOpacity="0.2" strokeWidth="1"
          />
        )
      })}
      {/* Earth reference */}
      <polygon
        points={earthPts}
        fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1"
        strokeDasharray="3,2"
      />
      {/* Planet */}
      <polygon
        points={planetPts}
        fill="#FFB300" fillOpacity="0.15" stroke="#FFB300" strokeWidth="1.5"
      />
      {/* Labels */}
      {keys.map((_, i) => {
        const a = angles[i]
        const lx = cx + (r + 12) * Math.cos(a)
        const ly = cy + (r + 12) * Math.sin(a)
        return (
          <text
            key={i}
            x={lx.toFixed(1)} y={ly.toFixed(1)}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="6" fill="currentColor" opacity="0.6"
          >
            {labels[i]}
          </text>
        )
      })}
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HabitabilityOracle() {
  const [round, setRound]                 = useState(0)
  const [planet, setPlanet]               = useState<Planet | null>(null)
  const [prediction, setPrediction]       = useState(50)
  const [phase, setPhase]                 = useState<"playing" | "result">("playing")
  const [scoreAwarded, setScoreAwarded]   = useState(0)
  const [wasHabitable, setWasHabitable]   = useState(false)
  const [sessionScore, setSessionScore]   = useState(0)

  useEffect(() => {
    queueMicrotask(() => {
      setPlanet(generatePlanet(round))
      setPrediction(50)
      setPhase("playing")
    })
  }, [round])

  if (!planet) return null

  const handleSubmit = () => {
    const predDecimal = prediction / 100
    const rarity      = planet.esi > 0.8 ? 3.0 : 1.0
    const error       = Math.abs(predDecimal - planet.esi)
    const pts         = Math.round(150 * (1 - error) * rarity)
    const habitable   = planet.esi > 0.8

    setScoreAwarded(pts)
    setWasHabitable(habitable)
    setPhase("result")
    addScore(pts)
    setSessionScore((s) => s + pts)

    if (habitable) {
      addExoRegEntry({
        id: `habitable-${planet.id}`,
        type: "habitable_candidate",
        starName: planet.name,
        note: `ESI ${planet.esi.toFixed(3)} · T=${Math.round(planet.surfaceTemp)} K`,
        timestamp: Date.now(),
        esi: planet.esi,
      })
    }
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <Globe className="h-4 w-4 text-primary" />
            Habitability Oracle
          </h3>
          <p className="text-[10px] text-muted-foreground">
            Round {round + 1} · Predict the Earth Similarity Index
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1">
          <Target className="h-3 w-3 text-primary" />
          <span className="font-mono text-[10px] font-semibold text-primary">
            +{sessionScore}
          </span>
        </div>
      </div>

      {/* Planet name + radar */}
      <div className="flex items-center gap-4 rounded-lg border border-border bg-card/50 p-3">
        <RadarChart planet={planet} />
        <div className="min-w-0 flex-1">
          <p className="mb-1 font-mono text-xs font-bold text-foreground">{planet.name}</p>
          <div className="space-y-2">
            <SimilarityBar label="Radius"      value={planet.radius}      refValue={1.0}   unit=" R⊕" />
            <SimilarityBar label="Density"     value={planet.density}     refValue={5.51}  unit=" g/cm³" />
            <SimilarityBar label="Escape vel"  value={planet.escapeVel}   refValue={11.19} unit=" km/s" />
            <SimilarityBar label="Surface T"   value={planet.surfaceTemp} refValue={288}   unit=" K" />
          </div>
        </div>
      </div>

      {/* ESI prediction slider */}
      {phase === "playing" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Your ESI prediction</span>
            <span className="font-mono text-sm font-bold text-primary">
              {(prediction / 100).toFixed(2)}
            </span>
          </div>
          <Slider
            value={[prediction]}
            onValueChange={(vals) => setPrediction(vals[0] ?? 50)}
            min={0} max={100} step={1}
          />
          <div className="flex justify-between text-[8px] text-muted-foreground">
            <span>0.00 — No similarity</span>
            <span>0.80 — HZ Candidate</span>
            <span>1.00 — Earth twin</span>
          </div>
          <Button onClick={handleSubmit} className="w-full" size="sm">
            Submit Prediction
          </Button>
        </div>
      )}

      {/* Result */}
      {phase === "result" && (
        <div className={cn(
          "rounded-lg border p-3 text-center",
          wasHabitable
            ? "border-green-500/40 bg-green-500/10"
            : "border-border bg-card/50",
        )}>
          {wasHabitable && <Sparkles className="mx-auto mb-1 h-6 w-6 text-amber-400" />}
          <p className="text-sm font-bold text-foreground">
            Real ESI: <span className="text-primary">{planet.esi.toFixed(3)}</span>
            {wasHabitable && (
              <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
                HZ CANDIDATE
              </span>
            )}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Your prediction: {(prediction / 100).toFixed(2)} · Error: {Math.abs(prediction / 100 - planet.esi).toFixed(3)}
          </p>
          <p className="mt-0.5 font-mono text-sm font-bold text-primary">+{scoreAwarded} pts</p>
          {wasHabitable && (
            <p className="mt-1 text-[10px] text-amber-400">
              Added to ExoReg as Habitable Zone Candidate!
            </p>
          )}
          <Button size="sm" className="mt-2 w-full" onClick={() => setRound((r) => r + 1)}>
            Next Planet →
          </Button>
        </div>
      )}

      <p className="text-center text-[9px] text-muted-foreground">
        ESI (Schulze-Makuch 2011) · ESI &gt; 0.80 = Habitable Zone Candidate · 3× rarity bonus
      </p>
    </div>
  )
}
