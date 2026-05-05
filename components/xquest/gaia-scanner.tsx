"use client"

import { useState } from "react"
import { Satellite, Loader2, AlertTriangle, Clock, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const scanStages = [
  "Querying Gaia DR3...",
  "Establishing Satellite Link...",
  "Filtering K-Dwarf Stars...",
  "Analyzing Transit Signals...",
  "XQuest Transit Search...",
  "Running ML Classification...",
  "Validating Candidates...",
  "Compiling Results...",
]

interface ScanResult {
  gaiaId: string
  constellation: string
  magnitude: number
  candidateLevel: number
}

export function GaiaScanner() {
  const [coordinates, setCoordinates] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [currentStage, setCurrentStage] = useState(0)
  const [progress, setProgress] = useState(0)
  const [showHighTraffic, setShowHighTraffic] = useState(false)
  const [results, setResults] = useState<ScanResult[] | null>(null)
  const [starTooltip, setStarTooltip] = useState<string | null>(null)

  const handleScan = async () => {
    const numCoords = parseInt(coordinates)
    if (isNaN(numCoords) || numCoords < 1 || numCoords > 50) {
      return
    }

    setIsScanning(true)
    setShowHighTraffic(false)
    setResults(null)
    setCurrentStage(0)
    setProgress(0)

    const startTime = Date.now()
    const totalDuration = 4000 + Math.random() * 4000 // 4-8 seconds

    // Simulate scanning process
    for (let i = 0; i < scanStages.length; i++) {
      setCurrentStage(i)
      const stageProgress = ((i + 1) / scanStages.length) * 100
      
      // Animate progress within each stage
      const stageDuration = totalDuration / scanStages.length
      const steps = 20
      for (let s = 0; s < steps; s++) {
        await new Promise(resolve => setTimeout(resolve, stageDuration / steps))
        const baseProgress = (i / scanStages.length) * 100
        const stageContribution = ((s + 1) / steps) * (100 / scanStages.length)
        setProgress(baseProgress + stageContribution)
        
        // Check if we've exceeded 7 seconds
        if (Date.now() - startTime > 7000 && !showHighTraffic) {
          setShowHighTraffic(true)
        }
      }
    }

    // Generate mock results
    const mockResults: ScanResult[] = Array.from({ length: numCoords }, (_, i) => ({
      gaiaId: `Gaia DR3 ${Math.floor(Math.random() * 9999999999)}`,
      constellation: ["Cygnus", "Lyra", "Kepler Field", "Orion", "Scorpius"][Math.floor(Math.random() * 5)],
      magnitude: 8 + Math.random() * 6,
      candidateLevel: Math.floor(Math.random() * 5) + 1,
    }))

    setResults(mockResults)
    setIsScanning(false)
  }

  const handleStarClick = () => {
    const randomTemp = (3500 + Math.random() * 1500).toFixed(0)
    const randomMass = (0.5 + Math.random() * 0.3).toFixed(2)
    setStarTooltip(`Temp: ${randomTemp}K • Mass: ${randomMass} M☉`)
    setTimeout(() => setStarTooltip(null), 3000)
  }

  const resetScan = () => {
    setIsScanning(false)
    setShowHighTraffic(false)
    setResults(null)
    setProgress(0)
    setCurrentStage(0)
  }

  return (
    <Card className="border-border bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Satellite className="h-5 w-5 text-primary" />
          Initialize Gaia Scan
        </CardTitle>
        <CardDescription>
          Enter the number of stellar coordinates to scout from the Gaia DR3 archive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isScanning && !results && (
          <>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">
                Coordinates to Fetch (1-50)
              </label>
              <Input
                type="number"
                min={1}
                max={50}
                value={coordinates}
                onChange={(e) => setCoordinates(e.target.value)}
                placeholder="Enter a number between 1 and 50"
                className="bg-input border-border font-mono"
              />
            </div>
            <Button
              onClick={handleScan}
              disabled={!coordinates || parseInt(coordinates) < 1 || parseInt(coordinates) > 50}
              className="w-full animate-pulse-glow bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-6 text-base"
            >
              <Satellite className="mr-2 h-5 w-5" />
              Scout Gaia DR3
            </Button>
          </>
        )}

        {isScanning && (
          <div className="space-y-4">
            {/* 3D Star Animation */}
            <div className="relative flex justify-center py-6">
              <button
                onClick={handleStarClick}
                className="relative cursor-pointer focus:outline-none"
                aria-label="Click for star details"
              >
                <div className="animate-rotate-star">
                  <svg
                    viewBox="0 0 100 100"
                    className="h-24 w-24 sm:h-32 sm:w-32"
                  >
                    <defs>
                      <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#FFB300" stopOpacity="1" />
                        <stop offset="50%" stopColor="#FF8C00" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#FF6600" stopOpacity="0" />
                      </radialGradient>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <circle cx="50" cy="50" r="35" fill="url(#starGlow)" filter="url(#glow)" />
                    {/* Star surface texture */}
                    <circle cx="38" cy="42" r="8" fill="#FF9500" opacity="0.6" />
                    <circle cx="62" cy="55" r="6" fill="#FFD700" opacity="0.5" />
                    <circle cx="50" cy="35" r="5" fill="#FF7700" opacity="0.4" />
                  </svg>
                </div>
                {/* Orbiting particles */}
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '8s' }}>
                  <div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-primary/60" />
                </div>
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '12s', animationDirection: 'reverse' }}>
                  <div className="absolute bottom-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-primary/40" />
                </div>
              </button>
              {starTooltip && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-secondary px-3 py-1.5 text-xs font-mono text-foreground shadow-lg animate-slide-up">
                  {starTooltip}
                </div>
              )}
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Tap the star for stellar properties
            </p>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Step {currentStage + 1} of {scanStages.length}
                </span>
                <span className="font-mono text-primary">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                {scanStages[currentStage]}
              </p>
            </div>

            {/* High Traffic Alert */}
            {showHighTraffic && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 animate-slide-up">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-destructive">
                      High Traffic Alert
                    </p>
                    <p className="text-xs text-muted-foreground">
                      The Gaia archive is experiencing high demand. Your request is still processing.
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-xs">
                        <Clock className="mr-1 h-3 w-3" />
                        Stay on Mission
                      </Button>
                      <Button size="sm" variant="ghost" onClick={resetScan} className="text-xs">
                        <RotateCcw className="mr-1 h-3 w-3" />
                        Return Later
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {results && (
          <div className="space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">
                Found {results.length} Stellar Coordinates
              </p>
              <Button size="sm" variant="outline" onClick={resetScan}>
                <RotateCcw className="mr-1 h-3 w-3" />
                New Scan
              </Button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
              {results.slice(0, 5).map((result, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-border bg-secondary/50 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs text-primary">
                        {result.gaiaId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {result.constellation} • Mag {result.magnitude.toFixed(2)}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${
                      result.candidateLevel >= 4 
                        ? 'bg-green-500/20 text-green-400' 
                        : result.candidateLevel >= 2 
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-muted text-muted-foreground'
                    }`}>
                      Level {result.candidateLevel}
                    </span>
                  </div>
                </div>
              ))}
              {results.length > 5 && (
                <p className="text-center text-xs text-muted-foreground">
                  + {results.length - 5} more results
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
