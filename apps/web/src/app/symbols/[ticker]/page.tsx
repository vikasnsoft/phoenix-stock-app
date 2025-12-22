"use client"

import { useParams } from "next/navigation"
import { TradingViewWidget } from "@/components/charts/TradingViewWidget"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Globe, Building2, TrendingUp } from "lucide-react"
import Link from "next/link"
import { useSymbolDetails } from "@/hooks/use-stocks"
import { useSocketSubscription } from "@/hooks/use-socket-subscription"

export default function SymbolPage() {
  const params = useParams()
  const ticker = params.ticker as string
  const { data: details, isLoading } = useSymbolDetails(ticker)
  const { data: tradeData, isConnected } = useSocketSubscription(ticker)


  if (isLoading) {
    return <div className="container py-6">Loading...</div>
  }

  if (!details) {
    return <div className="container py-6">Symbol not found</div>
  }

  return (
    <div className="container py-6 space-y-6 h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center space-x-4">
        <Link href="/screener">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {details.ticker} 
            <span className="text-muted-foreground font-normal text-lg">
              {details.name}
            </span>
          </h1>
          <div className="flex items-center gap-3 mt-1 mb-1">
             <span className="text-3xl font-bold font-mono">
               ${tradeData?.p?.toFixed(2) ?? "---"}
             </span>
             {isConnected && <span className="flex items-center text-xs text-green-500 font-medium"><span className="w-2 h-2 rounded-full bg-green-500 mr-1 animate-pulse"></span>Live</span>}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {details.exchange}
            </span>
            <span>{details.sector}</span>
            <span>{details.industry}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-3 h-full min-h-[500px]">
          <Card className="h-full flex flex-col">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Technical Chart
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 relative">
              <div className="absolute inset-0">
                <TradingViewWidget symbol={details.ticker} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 overflow-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Company Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Market Cap</div>
                <div className="text-lg font-semibold">
                  ${details.marketCap ? (parseFloat(details.marketCap) / 1000000).toFixed(2) : "0.00"}M
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-muted-foreground">Currency</div>
                <div>{details.currency}</div>
              </div>

              {details.website && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Website</div>
                  <a 
                    href={details.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    <Globe className="h-3 w-3" />
                    Visit Website
                  </a>
                </div>
              )}

              {details.description && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">About</div>
                  <p className="text-sm text-muted-foreground line-clamp-6">
                    {details.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
