"use client"

import { useState } from "react"
import { Search, ExternalLink } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function ExoRegSearch() {
  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)

  const handleSearch = () => {
    if (!query.trim()) return
    setSearching(true)
    // Simulate search
    setTimeout(() => setSearching(false), 1000)
  }

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center gap-2">
        <Search className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          Query the Archive
        </h3>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Paste a Gaia ID to view its ExoQuest Lifecycle
      </p>
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Gaia DR3 1234567890"
          className="bg-input border-border font-mono text-sm"
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button 
          size="icon" 
          onClick={handleSearch}
          disabled={!query.trim() || searching}
          className="shrink-0"
        >
          {searching ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          ) : (
            <ExternalLink className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
