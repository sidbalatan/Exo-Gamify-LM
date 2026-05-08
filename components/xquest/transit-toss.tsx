"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Gamepad2, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Generate a light curve with optional transit dip
function generateLightCurve(hasTransit: boolean) {
  const points = 50
  const data = []
  const transitStart = 15 + Math.floor(Math.random() * 10)
  const transitWidth = 3 + Math.floor(Math.random() * 4)
  const transitDepth = 0.02 + Math.random() * 0.03

  for (let i = 0; i < points; i++) {
    let y = 1 + (Math.random() - 0.5) * 0.005 // Base noise
    
    if (hasTransit && i >= transitStart && i <= transitStart + transitWidth) {
      // Create transit dip
      const transitProgress = (i - transitStart) / transitWidth
      const dipFactor = Math.sin(transitProgress * Math.PI)
      y -= transitDepth * dipFactor
    }
    
    data.push({ x: i, y })
  }
  return data
}

function freshCurve() {
  const hasTransit = Math.random() > 0.5
  return {
    data: generateLightCurve(hasTransit),
    hasTransit,
    id: Date.now(),
  }
}

export function TransitToss() {
  const [currentCurve, setCurrentCurve] = useState<{
    data: { x: number; y: number }[]
    hasTransit: boolean
    id: number
  } | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    queueMicrotask(() => setCurrentCurve(freshCurve()))
  }, [])

  const handleVet = (isTransit: boolean) => {
    if (!currentCurve) return
    const wasCorrect = isTransit === currentCurve.hasTransit
    setScore(prev => ({
      correct: prev.correct + (wasCorrect ? 1 : 0),
      total: prev.total + 1
    }))
    setFeedback(wasCorrect ? "Correct! 🎯" : "Not quite! 📊")
    
    setTimeout(() => {
      setFeedback(null)
      setCurrentCurve(freshCurve())
    }, 1000)
  }

  // Convert data to SVG path
  const width = 300
  const height = 100
  const padding = 10
  const pathData = (currentCurve?.data ?? []).map((point, i) => {
    const x = padding + (point.x / 50) * (width - 2 * padding)
    const y = padding + ((1.02 - point.y) / 0.1) * (height - 2 * padding)
    return `${i === 0 ? "M" : "L"} ${x} ${y}`
  }).join(" ")

  return (
    <Card className="border-border bg-card/80 backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Gamepad2 className="h-5 w-5 text-primary" />
              Transit Toss
            </CardTitle>
            <CardDescription>
              Train the ML by identifying transit signals
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1">
            <Star className="h-4 w-4 text-primary" />
            <span className="font-mono text-sm font-semibold text-primary">
              {score.correct}/{score.total}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Light Curve Chart */}
        <div className="relative rounded-lg border border-border bg-secondary/30 p-2">
          <div className="absolute left-2 top-2 text-[10px] font-mono text-muted-foreground">
            FLUX
          </div>
          <div className="absolute bottom-2 right-2 text-[10px] font-mono text-muted-foreground">
            TIME →
          </div>
          <svg 
            key={currentCurve?.id ?? 0}
            viewBox={`0 0 ${width} ${height}`} 
            className="w-full h-auto"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Grid lines */}
            <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} 
                  stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4" />
            
            {/* Light curve */}
            <path
              d={pathData}
              fill="none"
              stroke="#FFB300"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-slide-up"
            />
            
            {/* Data points */}
            {(currentCurve?.data ?? []).filter((_, i) => i % 3 === 0).map((point, i) => {
              const x = padding + (point.x / 50) * (width - 2 * padding)
              const y = padding + ((1.02 - point.y) / 0.1) * (height - 2 * padding)
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="2"
                  fill="#FFB300"
                  opacity="0.6"
                />
              )
            })}
          </svg>
          
          {/* Feedback overlay */}
          {feedback && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg animate-slide-up">
              <p className="text-lg font-semibold">{feedback}</p>
            </div>
          )}
        </div>

        {/* Swipe/Vote Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleVet(false)}
            className="flex-1 py-6 border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
          >
            <ChevronLeft className="mr-1 h-5 w-5" />
            No Transit
          </Button>
          <Button
            variant="outline"
            onClick={() => handleVet(true)}
            className="flex-1 py-6 border-green-500/50 hover:bg-green-500/10 hover:text-green-400"
          >
            Transit!
            <ChevronRight className="ml-1 h-5 w-5" />
          </Button>
        </div>
        
        <p className="text-center text-xs text-muted-foreground">
          Swipe to classify • Help train our exoplanet detection AI
        </p>
      </CardContent>
    </Card>
  )
}
