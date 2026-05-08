import type { Metadata } from "next"
import type { ReactNode } from "react"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Workspace | XQuest",
  description: "Your partitioned personal workspace targets and Gaia scouts.",
}

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return children
}
