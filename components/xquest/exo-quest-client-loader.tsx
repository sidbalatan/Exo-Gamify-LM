"use client"

import dynamic from "next/dynamic"

const ExoQuestPage = dynamic(() => import("@/components/xquest/exo-quest-page"), {
  ssr: false,
  loading: () => (
    <main
      className="min-h-screen bg-background pb-24"
      aria-busy="true"
      aria-label="Loading ExoQuest"
    />
  ),
})

export function ExoQuestClientLoader() {
  return <ExoQuestPage />
}
