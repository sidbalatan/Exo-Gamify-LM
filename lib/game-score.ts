// localStorage key: "exoquest_score"
// Persists player progress across sessions.

const STORAGE_KEY = "exoquest_score"

export interface ExoRegEntry {
  id: string
  type: "certified_kdwarf" | "null_kdwarf" | "transit_candidate" | "null_transit" | "habitable_candidate"
  starName: string
  note?: string
  timestamp: number
  gaia_id?: string
  esi?: number
}

export interface ScoutedStar {
  id: string
  name: string
  teff: number
  sector: string
  timestamp: number
  gaia_id?: string
}

interface ScoreState {
  total: number
  exoregEntries: ExoRegEntry[]
  scoutedStars: ScoutedStar[]
}

const RANK_THRESHOLDS: [number, string][] = [
  [25000, "Architect"],
  [8000,  "ModelAuditor"],
  [2000,  "Validator"],
  [500,   "Classifier"],
  [0,     "Observer"],
]

export function getRank(score: number): string {
  for (const [threshold, rank] of RANK_THRESHOLDS) {
    if (score >= threshold) return rank
  }
  return "Observer"
}

function _load(): ScoreState {
  if (typeof window === "undefined") {
    return { total: 0, exoregEntries: [], scoutedStars: [] }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { total: 0, exoregEntries: [], scoutedStars: [] }
    const parsed = JSON.parse(raw) as Partial<ScoreState>
    return {
      total: parsed.total ?? 0,
      exoregEntries: parsed.exoregEntries ?? [],
      scoutedStars: parsed.scoutedStars ?? [],
    }
  } catch {
    return { total: 0, exoregEntries: [], scoutedStars: [] }
  }
}

function _save(state: ScoreState): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  window.dispatchEvent(new CustomEvent("exoquest_score_updated"))
}

export function addScore(points: number): { total: number; rank: string } {
  const state = _load()
  state.total = Math.round(state.total + points)
  _save(state)
  return { total: state.total, rank: getRank(state.total) }
}

export function getScore(): number {
  return _load().total
}

export function addExoRegEntry(entry: ExoRegEntry): void {
  const state = _load()
  state.exoregEntries = [entry, ...state.exoregEntries].slice(0, 100)
  _save(state)
}

export function getExoRegEntries(): ExoRegEntry[] {
  return _load().exoregEntries
}

export function getCertifiedCount(): number {
  return _load().exoregEntries.filter((e) => e.type === "certified_kdwarf").length
}

export function getNullCount(): number {
  return _load().exoregEntries.filter((e) => e.type === "null_kdwarf").length
}

export function addScoutedStar(star: ScoutedStar): void {
  const state = _load()
  const exists = state.scoutedStars.some((s) => s.id === star.id)
  if (!exists) {
    state.scoutedStars = [star, ...state.scoutedStars].slice(0, 7)
    _save(state)
  }
}

export function getScoutedStars(): ScoutedStar[] {
  return _load().scoutedStars
}
