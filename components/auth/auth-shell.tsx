import Link from "next/link"
import { Rocket } from "lucide-react"

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#0B0E14] px-6 pb-12 pt-10">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <Link
            href="/"
            className="group flex flex-col items-center gap-3 text-foreground hover:opacity-90"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary transition-transform group-hover:scale-[1.02]">
              <Rocket className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
                XQuest
              </p>
              <h1 className="mt-1 text-xl font-bold tracking-tight">{title}</h1>
              {subtitle ? (
                <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
          </Link>
        </div>
        <div className="flex w-full flex-col">{children}</div>
      </div>
    </div>
  )
}
