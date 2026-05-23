export interface ExoRegVotePayload {
  gaia_source_id: string
  vote: "validated_kdwarf" | "null_kdwarf"
  display_label?: string
  ra_deg?: number | null
  dec_deg?: number | null
}

/**
 * Submit K-dwarf votes to ExoReg via Next.js proxy (Clerk session cookie).
 * No-op if not signed in (caller should check before await).
 */
export async function submitExoRegClassify(
  votes: ExoRegVotePayload[],
  clientRoundId?: string,
): Promise<void> {
  if (votes.length === 0) return
  const res = await fetch("/api/exoreg/classify", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      votes,
      client_round_id: clientRoundId ?? null,
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    console.warn("ExoReg classify failed", res.status, text)
  }
}

export function gaiaSourceIdFromCardName(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts[parts.length - 1] ?? name.trim()
}
