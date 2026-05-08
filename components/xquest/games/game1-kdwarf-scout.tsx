"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Award, CheckCircle, HelpCircle, Star, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { addExoRegEntry, addScore, addScoutedStar } from "@/lib/game-score"

// ─── K-Dwarf Gold Standard criteria ──────────────────────────────────────────

interface StarParams {
  teff: number
  logg: number
  feh: number
  luminosity: number
  bprp: number
  absGmag: number
}

interface StarCard extends StarParams {
  id: string
  name: string
  isKDwarf: boolean
  failReasons: string[]
}

const CRITERIA = [
  { key: "teff",       label: "Teff (K)",      min: 3900, max: 5300, unit: "K"     },
  { key: "logg",       label: "log g",         min: 4.0,  max: 5.0,  unit: ""      },
  { key: "feh",        label: "[Fe/H]",        min: -0.5, max: 0.5,  unit: ""      },
  { key: "luminosity", label: "Luminosity",    min: 0.08, max: 0.6,  unit: " L☉"   },
  { key: "bprp",       label: "BP−RP",         min: 1.0,  max: 2.5,  unit: " mag"  },
  { key: "absGmag",    label: "Abs G mag",     min: 5.5,  max: 9.0,  unit: " mag"  },
] as const

const HINTS = [
  "K dwarfs are orange stars cooler than the Sun (Teff 3900–5300 K). They make excellent exoplanet hosts.",
  "log g 4.0–5.0 confirms main-sequence status. Giant stars have lower log g and inflate radius measurements.",
  "Near-solar metallicity ([Fe/H] −0.5 to +0.5) is key. Metal-poor stars rarely form rocky planets.",
  "K dwarfs are 8–60% as luminous as the Sun. This places them firmly on the cool main sequence.",
  "BP−RP colour 1.0–2.5 mag places a star in the orange K-dwarf region of the HR diagram.",
  "Absolute G magnitude 5.5–9.0 separates K dwarfs from brighter G and fainter M stars.",
]

function randBetween(a: number, b: number): number {
  return a + Math.random() * (b - a)
}

function fmt(v: number, dp: number): string {
  return v.toFixed(dp)
}

function _makeKDwarf(id: string, name: string): StarCard {
  const teff       = randBetween(3950, 5250)
  const logg       = randBetween(4.05, 4.95)
  const feh        = randBetween(-0.45, 0.45)
  const luminosity = randBetween(0.09, 0.58)
  const bprp       = randBetween(1.05, 2.45)
  const absGmag    = randBetween(5.6, 8.9)
  return { id, name, teff, logg, feh, luminosity, bprp, absGmag, isKDwarf: true, failReasons: [] }
}

function _makeNonKDwarf(id: string, name: string): StarCard {
  const base = _makeKDwarf(id, name)
  const failures: (keyof StarParams)[] = []
  const allKeys: (keyof StarParams)[] = ["teff", "logg", "feh", "luminosity", "bprp", "absGmag"]
  const numFails = 1 + Math.floor(Math.random() * 2)
  const shuffled = [...allKeys].sort(() => Math.random() - 0.5).slice(0, numFails)
  shuffled.forEach((k) => failures.push(k))

  const star: StarCard = { ...base, isKDwarf: false, failReasons: [] }

  failures.forEach((k) => {
    const c = CRITERIA.find((cr) => cr.key === k)!
    if (k === "teff") {
      star.teff = Math.random() < 0.5
        ? randBetween(3300, 3850)
        : randBetween(5350, 6200)
    } else if (k === "logg") {
      star.logg = Math.random() < 0.5
        ? randBetween(3.0, 3.95)
        : randBetween(5.05, 5.5)
    } else if (k === "feh") {
      star.feh = Math.random() < 0.5
        ? randBetween(-1.2, -0.55)
        : randBetween(0.55, 0.9)
    } else if (k === "luminosity") {
      star.luminosity = Math.random() < 0.5
        ? randBetween(0.01, 0.07)
        : randBetween(0.62, 1.5)
    } else if (k === "bprp") {
      star.bprp = Math.random() < 0.5
        ? randBetween(0.3, 0.95)
        : randBetween(2.55, 3.2)
    } else if (k === "absGmag") {
      star.absGmag = Math.random() < 0.5
        ? randBetween(3.5, 5.4)
        : randBetween(9.1, 11.5)
    }
    star.failReasons.push(c.label)
  })

  return star
}

const STAR_NAMES = [
  "Gaia DR3 6123456789012348928", "Gaia DR3 4987654321098765432",
  "Gaia DR3 3141592653589793238", "Gaia DR3 2718281828459045235",
  "Gaia DR3 1414213562373095048", "Gaia DR3 5772156649015328606",
  "Gaia DR3 8314159265358979323", "Gaia DR3 7071067811865475244",
  "Gaia DR3 6022140762081121327", "Gaia DR3 9999999999999999999",
]

function buildRound(roundNumber: number): StarCard[] {
  const certIndex = Math.floor(Math.random() * 3)
  const namePool = [...STAR_NAMES].sort(() => Math.random() - 0.5)
  return [0, 1, 2].map((i) => {
    const name = namePool[i + roundNumber * 3] ?? namePool[i]
    const id   = `${roundNumber}-${i}`
    return i === certIndex
      ? _makeKDwarf(id, name)
      : _makeNonKDwarf(id, name)
  })
}

// ─── Star card display ────────────────────────────────────────────────────────

function CriterionRow({ label, value, unit, pass }: {
  label: string; value: string; unit: string; pass: boolean
}) {
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-mono font-semibold", pass ? "text-green-400" : "text-red-400")}>
        {value}{unit}
      </span>
    </div>
  )
}

function StarCardDisplay({
  card, revealed, dragging, selected, onSelect,
  onDragStart, onDragEnd,
}: {
  card: StarCard
  revealed: boolean
  dragging: boolean
  selected: boolean
  onSelect: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
}) {
  const passesCriteria: Record<string, boolean> = {
    teff:       card.teff >= 3900 && card.teff <= 5300,
    logg:       card.logg >= 4.0  && card.logg <= 5.0,
    feh:        card.feh  >= -0.5 && card.feh  <= 0.5,
    luminosity: card.luminosity >= 0.08 && card.luminosity <= 0.6,
    bprp:       card.bprp >= 1.0  && card.bprp <= 2.5,
    absGmag:    card.absGmag >= 5.5 && card.absGmag <= 9.0,
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      className={cn(
        "cursor-grab select-none rounded-lg border p-3 transition-all active:cursor-grabbing",
        selected
          ? "border-primary bg-primary/10 ring-1 ring-primary"
          : "border-border bg-card/60 hover:border-primary/50",
        dragging && "opacity-50 scale-95",
      )}
    >
      <p className="mb-2 truncate font-mono text-[9px] font-bold text-foreground">
        {card.name.split(" ").pop()}
      </p>
      <div className="space-y-1">
        <CriterionRow label="Teff"        value={fmt(card.teff, 0)}       unit=" K"   pass={passesCriteria.teff} />
        <CriterionRow label="log g"       value={fmt(card.logg, 2)}       unit=""     pass={passesCriteria.logg} />
        <CriterionRow label="[Fe/H]"      value={fmt(card.feh,  2)}       unit=""     pass={passesCriteria.feh}  />
        <CriterionRow label="Luminosity"  value={fmt(card.luminosity, 3)} unit=" L☉"  pass={passesCriteria.luminosity} />
        <CriterionRow label="BP−RP"       value={fmt(card.bprp, 2)}       unit=" mag" pass={passesCriteria.bprp} />
        <CriterionRow label="Abs G mag"   value={fmt(card.absGmag, 2)}    unit=" mag" pass={passesCriteria.absGmag} />
      </div>
      {revealed && !card.isKDwarf && (
        <div className="mt-2 rounded bg-red-500/10 px-1.5 py-1">
          <p className="text-[8px] text-red-400">
            Fails: {card.failReasons.join(", ")}
          </p>
        </div>
      )}
      {revealed && card.isKDwarf && (
        <div className="mt-2 rounded bg-green-500/10 px-1.5 py-1">
          <p className="text-[8px] text-green-400">All criteria pass ✓</p>
        </div>
      )}
    </div>
  )
}

// ─── Drop zone ────────────────────────────────────────────────────────────────

function DropZone({
  label, accept, over, onDragOver, onDragLeave, onDrop, onTapDrop,
}: {
  label: string; accept: boolean; over: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onTapDrop: () => void
}) {
  return (
    <button
      type="button"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onTapDrop}
      className={cn(
        "flex flex-1 flex-col items-center justify-center rounded-lg border-2 border-dashed py-4 transition-all",
        over
          ? accept
            ? "border-green-400 bg-green-500/10"
            : "border-red-400 bg-red-500/10"
          : accept
            ? "border-green-500/40 hover:border-green-400"
            : "border-border hover:border-primary/40",
      )}
    >
      {accept
        ? <CheckCircle className="mb-1 h-5 w-5 text-green-400" />
        : <XCircle     className="mb-1 h-5 w-5 text-muted-foreground" />}
      <span className={cn(
        "text-[10px] font-semibold",
        accept ? "text-green-400" : "text-muted-foreground",
      )}>
        {label}
      </span>
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function KDwarfScout() {
  const [round, setRound]             = useState(0)
  const [cards, setCards]             = useState<StarCard[]>([])
  const [selected, setSelected]       = useState<string | null>(null)
  const [draggingId, setDraggingId]   = useState<string | null>(null)
  const [overZone, setOverZone]       = useState<"cert" | "null" | null>(null)
  const [phase, setPhase]             = useState<"playing" | "result">("playing")
  const [wasCorrect, setWasCorrect]   = useState(false)
  const [scoreAwarded, setScoreAwarded] = useState(0)
  const [retryMode, setRetryMode]     = useState(false)
  const [streak, setStreak]           = useState(0)
  const [showBadge, setShowBadge]     = useState(false)
  const [hintIdx, setHintIdx]         = useState(0)
  const dragCardId = useRef<string | null>(null)

  useEffect(() => {
    queueMicrotask(() => {
      setCards(buildRound(round))
      setSelected(null)
      setDraggingId(null)
      setPhase("playing")
      setRetryMode(false)
      setHintIdx(round % HINTS.length)
    })
  }, [round])

  const classify = useCallback((cardId: string, asKDwarf: boolean) => {
    if (phase !== "playing") return
    const card = cards.find((c) => c.id === cardId)
    if (!card) return

    const correct = card.isKDwarf === asKDwarf
    const accuracy = retryMode ? 0.5 : 1.0
    const pts = Math.round(100 * accuracy * 1.0)

    setWasCorrect(correct)
    setScoreAwarded(correct ? pts : 0)
    setPhase("result")

    if (correct) {
      addScore(pts)

      if (asKDwarf) {
        addScoutedStar({
          id: card.id,
          name: card.name,
          teff: Math.round(card.teff),
          sector: `Teff ${Math.round(card.teff)} K`,
          timestamp: Date.now(),
          gaia_id: card.name,
        })
        addExoRegEntry({
          id: `cert-${card.id}`,
          type: "certified_kdwarf",
          starName: card.name.split(" ").pop() ?? card.name,
          note: `Teff ${Math.round(card.teff)} K · log g ${card.logg.toFixed(2)}`,
          timestamp: Date.now(),
          gaia_id: card.name,
        })
      }

      cards
        .filter((c) => c.id !== cardId)
        .forEach((c) => {
          addExoRegEntry({
            id: `null-${c.id}`,
            type: "null_kdwarf",
            starName: c.name.split(" ").pop() ?? c.name,
            note: c.failReasons.length > 0 ? `Fails: ${c.failReasons.join(", ")}` : undefined,
            timestamp: Date.now(),
          })
        })

      const newStreak = streak + 1
      setStreak(newStreak)
      if (newStreak % 3 === 0) setShowBadge(true)
    } else {
      setStreak(0)
    }
  }, [phase, cards, retryMode, streak])

  const handleDragStart = (e: React.DragEvent, id: string) => {
    dragCardId.current = id
    setDraggingId(id)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setOverZone(null)
  }

  const handleDrop = (asKDwarf: boolean) => {
    if (dragCardId.current) classify(dragCardId.current, asKDwarf)
    setDraggingId(null)
    setOverZone(null)
  }

  const handleTapDrop = (asKDwarf: boolean) => {
    if (selected) classify(selected, asKDwarf)
  }

  const handleRetry = () => {
    setRetryMode(true)
    setPhase("playing")
    setSelected(null)
    setWasCorrect(false)
  }

  const handleNext = () => {
    setShowBadge(false)
    setRound((r) => r + 1)
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <Star className="h-4 w-4 text-primary" />
            K-Dwarf Scout
          </h3>
          <p className="text-[10px] text-muted-foreground">
            Round {round + 1} · {retryMode ? "Retry at 0.5×" : "Drag or tap to classify"}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1">
          <Award className="h-3 w-3 text-primary" />
          <span className="font-mono text-[10px] font-semibold text-primary">
            Streak: {streak}
          </span>
        </div>
      </div>

      {/* Badge notification */}
      {showBadge && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-center">
          <p className="text-xs font-bold text-amber-400">
            Scout Badge earned! {streak} correct in a row.
          </p>
        </div>
      )}

      {/* Star cards */}
      <div className="grid grid-cols-3 gap-2">
        {cards.map((card) => (
          <StarCardDisplay
            key={card.id}
            card={card}
            revealed={phase === "result"}
            dragging={draggingId === card.id}
            selected={selected === card.id}
            onSelect={() => {
              if (phase === "playing") setSelected(selected === card.id ? null : card.id)
            }}
            onDragStart={(e) => handleDragStart(e, card.id)}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>

      {/* Drop zones */}
      {phase === "playing" && (
        <div className="flex gap-2">
          <DropZone
            label="Certified K Dwarf"
            accept
            over={overZone === "cert"}
            onDragOver={(e) => { e.preventDefault(); setOverZone("cert") }}
            onDragLeave={() => setOverZone(null)}
            onDrop={(e) => { e.preventDefault(); handleDrop(true) }}
            onTapDrop={() => handleTapDrop(true)}
          />
          <DropZone
            label="Null K Dwarf"
            accept={false}
            over={overZone === "null"}
            onDragOver={(e) => { e.preventDefault(); setOverZone("null") }}
            onDragLeave={() => setOverZone(null)}
            onDrop={(e) => { e.preventDefault(); handleDrop(false) }}
            onTapDrop={() => handleTapDrop(false)}
          />
        </div>
      )}

      {/* Result */}
      {phase === "result" && (
        <div className={cn(
          "rounded-lg border p-3 text-center",
          wasCorrect ? "border-green-500/40 bg-green-500/10" : "border-red-500/40 bg-red-500/10",
        )}>
          {wasCorrect
            ? <CheckCircle className="mx-auto mb-1 h-6 w-6 text-green-400" />
            : <XCircle     className="mx-auto mb-1 h-6 w-6 text-red-400"   />}
          <p className={cn("text-sm font-bold", wasCorrect ? "text-green-400" : "text-red-400")}>
            {wasCorrect ? `Correct! +${scoreAwarded} pts` : "Incorrect — check the failures above"}
          </p>
          <div className="mt-2 flex justify-center gap-2">
            {!wasCorrect && !retryMode && (
              <Button size="sm" variant="outline" onClick={handleRetry}>
                Retry (0.5×)
              </Button>
            )}
            <Button size="sm" onClick={handleNext}>
              Next Round →
            </Button>
          </div>
        </div>
      )}

      {/* Hint panel */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="h-3.5 w-3.5 text-primary" />
          <span className="text-[9px] font-semibold text-primary">Did you know?</span>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">{HINTS[hintIdx]}</p>
      </div>

      <p className="text-center text-[9px] text-muted-foreground">
        Classify K dwarfs · Certified stars feed the Transit Toss pipeline
      </p>
    </div>
  )
}
