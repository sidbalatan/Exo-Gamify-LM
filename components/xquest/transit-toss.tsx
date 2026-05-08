"use client"

import { useState, useEffect, useCallback } from "react"
import { Gamepad2, Star, Zap, CheckCircle, XCircle, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { addScore, getScoutedStars, type ScoutedStar } from "@/lib/game-score"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Curve {
  points: string
  hasTransit: boolean
  depth: number
  type: "transit" | "noise" | "flare" | "trend"
}

interface RoundState {
  curves: Curve[]
  transitIndex: number | null
  isBoss: boolean
  bossHasTransit: boolean
}

// ─── Light curve generation ───────────────────────────────────────────────────

function gaussRandom(sigma: number): number {
  const u1 = Math.random() + 1e-10
  const u2 = Math.random()
  return sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

function makeCurve(hasTransit: boolean, isBoss = false): Curve {
  const N     = 200
  const sigma = isBoss ? 0.0035 : 0.002
  const depth = isBoss
    ? 0.005 + Math.random() * 0.006
    : 0.005 + Math.random() * 0.02

  const start    = Math.floor(N * (0.15 + Math.random() * 0.50))
  const duration = Math.floor(N * (0.03  + Math.random() * 0.05))

  const hasFlare = !hasTransit && Math.random() < 0.4
  const hasTrend = !hasTransit && !hasFlare && Math.random() < 0.35

  const pts: string[] = []
  for (let i = 0; i < N; i++) {
    let flux = 1.0 + gaussRandom(sigma)

    if (hasTransit && i >= start && i < start + duration) {
      const phase  = (i - start) / duration
      const window = 0.5 * (1 - Math.cos(2 * Math.PI * phase))
      flux -= depth * window
    }

    if (hasFlare && i === Math.floor(N * 0.55)) {
      flux += 0.018 + Math.random() * 0.012
    }
    if (hasFlare && i > Math.floor(N * 0.55) && i < Math.floor(N * 0.55) + 8) {
      flux += 0.006 * Math.exp(-(i - Math.floor(N * 0.55)) * 0.4)
    }
    if (hasTrend) flux += 0.005 * Math.sin((i / N) * Math.PI)

    const y = Math.max(5, Math.min(55, 30 - (flux - 1.0) * 600))
    pts.push(`${i},${y.toFixed(1)}`)
  }

  const curveType: Curve["type"] = hasTransit
    ? "transit"
    : hasFlare ? "flare"
    : hasTrend ? "trend"
    : "noise"

  return { points: pts.join(" "), hasTransit, depth, type: curveType }
}

function buildRound(roundNumber: number): RoundState {
  const isBoss = roundNumber > 0 && roundNumber % 5 === 4

  if (isBoss) {
    const hasTransit = Math.random() > 0.4
    return {
      curves: [makeCurve(hasTransit, true)],
      transitIndex: hasTransit ? 0 : null,
      isBoss: true,
      bossHasTransit: hasTransit,
    }
  }

  const transitIndex = Math.floor(Math.random() * 3)
  const curves = [0, 1, 2].map((i) => makeCurve(i === transitIndex))
  return { curves, transitIndex, isBoss: false, bossHasTransit: false }
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function rarityFromDepth(depth: number): number {
  return Math.max(1.0, Math.min(3.0, 1.0 + 2.0 * (1 - (depth - 0.005) / 0.020)))
}

function calibrationFromConfidence(confidencePct: number, wasCorrect: boolean): number {
  const c = confidencePct / 100
  return wasCorrect ? 0.5 + c : 1.5 - c
}

// ─── Light curve card (defined outside component to avoid nesting) ─────────────

interface LightCurveCardProps {
  curve: Curve
  isActive: boolean
  isResult: boolean
  onClick: () => void
  label: string
}

function LightCurveCard({ curve, isActive, isResult, onClick, label }: LightCurveCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative w-full overflow-hidden rounded-lg border-2 transition-all",
        isActive
          ? "border-primary bg-primary/5"
          : "border-border bg-secondary/20 hover:border-primary/40",
        isResult && "cursor-default",
      )}
    >
      <div className="absolute left-1 top-1 z-10 flex items-center gap-0.5">
        <span className="rounded bg-card/80 px-1 py-0.5 font-mono text-[8px] font-bold text-foreground">
          {label}
        </span>
        {isResult && (
          <span className={cn(
            "rounded px-1 py-0.5 font-mono text-[8px] font-bold",
            curve.hasTransit
              ? "bg-green-500/20 text-green-400"
              : "bg-card/80 text-muted-foreground",
          )}>
            {curve.hasTransit ? "TRANSIT" : curve.type.toUpperCase()}
          </span>
        )}
      </div>

      {isActive && !isResult && (
        <div className="absolute right-1 top-1 z-10">
          <Target className="h-3.5 w-3.5 text-primary" />
        </div>
      )}

      <svg
        viewBox="0 0 200 60"
        className="w-full"
        preserveAspectRatio="none"
        aria-label={`Light curve ${label}`}
      >
        <line
          x1="0" y1="30" x2="200" y2="30"
          stroke="currentColor" strokeOpacity="0.15" strokeDasharray="3,3"
        />
        <polyline
          points={curve.points}
          fill="none"
          stroke={
            isResult
              ? curve.hasTransit ? "#22c55e" : "#94a3b8"
              : isActive ? "#FFB300" : "#94a3b8"
          }
          strokeWidth={isActive ? "1.8" : "1.2"}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="flex items-center justify-between px-1 pb-0.5">
        <span className="font-mono text-[7px] text-muted-foreground">0d</span>
        <span className="font-mono text-[7px] text-muted-foreground">TIME →</span>
        <span className="font-mono text-[7px] text-muted-foreground">27d</span>
      </div>
    </button>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TransitToss() {
  const [round, setRound]               = useState(0)
  const [roundState, setRoundState]     = useState<RoundState | null>(null)
  const [selected, setSelected]         = useState<number | null>(null)
  const [bossAnswer, setBossAnswer]     = useState<boolean | null>(null)
  const [confidence, setConfidence]     = useState(50)
  const [phase, setPhase]               = useState<"playing" | "result">("playing")
  const [scoreAwarded, setScoreAwarded] = useState(0)
  const [wasCorrect, setWasCorrect]     = useState(false)
  const [labelCount, setLabelCount]     = useState(0)
  const [taggedStar, setTaggedStar]     = useState<string | null>(null)
  const [scoutedStars, setScoutedStars] = useState<ScoutedStar[]>([])
  const [sessionScore, setSessionScore] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)

  useEffect(() => {
    queueMicrotask(() => {
      setScoutedStars(getScoutedStars())
      setLabelCount(parseInt(localStorage.getItem("exoquest_transit_labels") ?? "0", 10))
    })
    const onUpdate = () => setScoutedStars(getScoutedStars())
    window.addEventListener("exoquest_score_updated", onUpdate)
    return () => window.removeEventListener("exoquest_score_updated", onUpdate)
  }, [])

  const newRound = useCallback((roundNum: number) => {
    queueMicrotask(() => {
      setRoundState(buildRound(roundNum))
      setSelected(null)
      setBossAnswer(null)
      setConfidence(50)
      setPhase("playing")
    })
  }, [])

  useEffect(() => {
    newRound(round)
  }, [round, newRound])

  if (!roundState) return null

  const canSubmit = roundState.isBoss ? bossAnswer !== null : selected !== null
  const isResult  = phase === "result"

  const handleSubmit = () => {
    if (!canSubmit) return

    let correct = false
    let depth   = 0

    if (roundState.isBoss) {
      correct = bossAnswer === roundState.bossHasTransit
      depth   = roundState.curves[0].depth
    } else {
      correct = selected === roundState.transitIndex
      depth   = correct && selected !== null
        ? roundState.curves[selected].depth
        : roundState.curves[roundState.transitIndex ?? 0].depth
    }

    const rarity      = rarityFromDepth(depth)
    const calibration = calibrationFromConfidence(confidence, correct)
    const accuracy    = correct ? 1.0 : 0.5
    const pts         = 200 * accuracy * rarity * calibration

    if (correct) addScore(pts)
    setScoreAwarded(Math.round(pts))
    setWasCorrect(correct)

    const next = labelCount + 1
    setLabelCount(next)
    localStorage.setItem("exoquest_transit_labels", String(next))

    setSessionTotal((t) => t + 1)
    if (correct) setSessionScore((s) => s + Math.round(pts))

    setPhase("result")
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <Gamepad2 className="h-4 w-4 text-primary" />
            Transit Toss
            {roundState.isBoss && (
              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
                BOSS FIGHT
              </span>
            )}
          </h3>
          <p className="text-[10px] text-muted-foreground">
            Round {round + 1}
            {roundState.isBoss
              ? " · Is this a planetary transit?"
              : " · Which star has a transiting planet?"}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1">
          <Star className="h-3 w-3 text-primary" />
          <span className="font-mono text-[10px] font-semibold text-primary">
            {sessionScore}/{sessionTotal > 0 ? sessionTotal * 200 : "—"}
          </span>
        </div>
      </div>

      {/* Pull-from-Game-1 chips */}
      {scoutedStars.length > 0 && !isResult && (
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          <span className="shrink-0 text-[9px] text-muted-foreground">Tag star:</span>
          {scoutedStars.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setTaggedStar(taggedStar === s.id ? null : s.id)}
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] transition-colors",
                taggedStar === s.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary/10 text-primary",
              )}
            >
              {s.name.split(" ").pop()}
            </button>
          ))}
        </div>
      )}

      {/* Boss Fight: single curve */}
      {roundState.isBoss ? (
        <div className="space-y-2">
          <div className="rounded-lg border-2 border-amber-500/30 bg-amber-500/5 p-1">
            <LightCurveCard
              curve={roundState.curves[0]}
              isActive={false}
              isResult={isResult}
              onClick={() => { /* boss uses yes/no buttons */ }}
              label="BOSS"
            />
          </div>
          {!isResult && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "border-green-500/40 hover:bg-green-500/10",
                  bossAnswer === true && "border-green-400 bg-green-500/20",
                )}
                onClick={() => setBossAnswer(true)}
              >
                <Zap className="mr-1 h-3.5 w-3.5 text-green-400" />
                Yes, Transit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "border-border",
                  bossAnswer === false && "border-primary bg-primary/10",
                )}
                onClick={() => setBossAnswer(false)}
              >
                <XCircle className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                No Signal
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* Regular: 3 curves */
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {roundState.curves.map((curve, i) => (
            <LightCurveCard
              key={i}
              curve={curve}
              isActive={selected === i}
              isResult={isResult}
              onClick={() => {
                if (!isResult) setSelected(i)
              }}
              label={String.fromCharCode(65 + i)}
            />
          ))}
        </div>
      )}

      {/* Confidence slider */}
      {!isResult && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Confidence</span>
            <span className="font-mono text-[11px] font-semibold text-primary">{confidence}%</span>
          </div>
          <Slider
            value={[confidence]}
            onValueChange={(vals) => setConfidence(vals[0] ?? 50)}
            min={0}
            max={100}
            step={5}
          />
          <p className="text-[9px] text-muted-foreground">
            {confidence < 40
              ? "Uncertain — calibration impact is moderate"
              : confidence < 70
                ? "Moderate confidence — good calibration zone"
                : "High confidence — calibration bonus or penalty amplified"}
          </p>
        </div>
      )}

      {/* Submit */}
      {!isResult && (
        <Button disabled={!canSubmit} onClick={handleSubmit} className="w-full" size="sm">
          Submit Label
        </Button>
      )}

      {/* Result */}
      {isResult && (
        <div className="space-y-2">
          <div className={cn(
            "rounded-lg border p-3 text-center",
            wasCorrect ? "border-green-500/40 bg-green-500/10" : "border-red-500/40 bg-red-500/10",
          )}>
            {wasCorrect
              ? <CheckCircle className="mx-auto mb-1 h-7 w-7 text-green-400" />
              : <XCircle    className="mx-auto mb-1 h-7 w-7 text-red-400"   />}
            <p className={cn(
              "text-sm font-bold",
              wasCorrect ? "text-green-400" : "text-red-400",
            )}>
              {wasCorrect ? `Correct! +${scoreAwarded} pts` : "Incorrect"}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {wasCorrect
                ? `Your label has been added to the training queue. Consensus needed: 2 more players.${taggedStar ? ` Tagged: ${taggedStar}.` : ""}`
                : (() => {
                    if (roundState.isBoss) {
                      const c = roundState.curves[0]
                      return `The curve ${roundState.bossHasTransit ? "did" : "did not"} contain a transit. Depth: ${(c.depth * 100).toFixed(2)}% — ${c.depth < 0.010 ? "very shallow, close to noise level" : "real dip visible above noise"}.`
                    }
                    const tidx = roundState.transitIndex ?? 0
                    const tc   = roundState.curves[tidx]
                    return `Curve ${String.fromCharCode(65 + tidx)} had the transit (depth ${(tc.depth * 100).toFixed(2)}%). ${tc.depth < 0.010 ? "It was very shallow — close to noise level." : "The dip was real but narrow."}`
                  })()
              }
            </p>
          </div>

          <Button size="sm" className="w-full" onClick={() => setRound((r) => r + 1)}>
            Next Curve →
          </Button>

          <p className="text-center text-[10px] text-muted-foreground">
            Labels contributed: {labelCount} · Next boss fight in {4 - (round % 5)} rounds
          </p>
        </div>
      )}

      <p className="text-center text-[9px] text-muted-foreground">
        Synthetic TESS-like light curves · 200 pts base · Help train our exoplanet AI
      </p>
    </div>
  )
}
