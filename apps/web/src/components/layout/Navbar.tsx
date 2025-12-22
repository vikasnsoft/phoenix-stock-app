import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BarChart3, Search, List, Settings } from "lucide-react"

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <BarChart3 className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">
              Phoenix
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/screener"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Screener
            </Link>
            <Link
              href="/watchlists"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Watchlists
            </Link>
            <Link
              href="/scans"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Scan Builder
            </Link>
            <Link
              href="/saved-scans"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Saved Scans
            </Link>
            <Link
              href="/admin/ingestion"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Admin
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <Button variant="outline" className="w-full justify-start text-muted-foreground sm:w-[300px] lg:w-[400px]">
              <Search className="mr-2 h-4 w-4" />
              Search symbols...
            </Button>
          </div>
          <nav className="flex items-center">
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
              <span className="sr-only">Settings</span>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  )
}
