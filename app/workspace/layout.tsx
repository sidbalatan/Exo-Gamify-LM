import type { Metadata } from "next"
import type { ReactNode } from "react"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Workspace | ExoQuest",
  description: "Your personal ExoQuest workspace — partitioned Gaia targets and K-Dwarf scouts.",
}

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return children
}
