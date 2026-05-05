"use client"

interface MissionProgressProps {
  progress: number // 0-100
}

export function MissionProgress({ progress }: MissionProgressProps) {
  return (
    <div className="fixed left-0 right-0 top-0 z-50 h-1 bg-secondary">
      <div 
        className="h-full bg-primary transition-all duration-500 ease-out"
        style={{ width: `${progress}%` }}
      >
        <div className="absolute right-0 top-0 h-full w-8 bg-gradient-to-r from-transparent to-primary/50 blur-sm" />
      </div>
    </div>
  )
}
