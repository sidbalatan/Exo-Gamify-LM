"use client"

import { Telescope, Activity, Trophy, Search, Layers } from "lucide-react"
import { useRouter } from "next/navigation"

interface BottomNavProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const tabs = [
  { id: "scout", label: "Scout", icon: Telescope },
  { id: "pipeline", label: "Pipeline", icon: Activity },
  { id: "leaderboard", label: "Ranks", icon: Trophy },
  { id: "exoreg", label: "ExoReg", icon: Search },
  { id: "workspace", label: "Workspace", icon: Layers },
]

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const router = useRouter()

  const handleTab = (id: string) => {
    if (id === "workspace") {
      router.push("/workspace")
      return
    }
    onTabChange(id)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md safe-area-pb">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => handleTab(tab.id)}
              className={`relative flex flex-1 flex-col items-center gap-1 rounded-lg py-2 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div
                className={`rounded-lg p-1.5 transition-colors ${isActive ? "bg-primary/10" : ""}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
              {isActive && (
                <div className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
