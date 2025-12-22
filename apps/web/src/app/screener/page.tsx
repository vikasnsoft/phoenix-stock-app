"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, RefreshCw } from "lucide-react"
import { ScreenerResults } from "@/components/screener/ScreenerResults"

export default function ScreenerPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [sector, setSector] = useState("all")
  const [exchange, setExchange] = useState("all")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)
  const [availableSectors, setAvailableSectors] = useState<string[]>([])

  // Fetch valid sectors on mount
  useEffect(() => {
    fetch('http://localhost:4001/api/symbols/sectors')
      .then(res => res.json())
      .then(data => setAvailableSectors(data))
      .catch(err => console.error("Failed to fetch sectors", err));
  }, []);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  // Construct filters object
  const filters = {
    search: searchQuery || undefined,
    sector: sector !== "all" ? sector : undefined,
    exchange: exchange !== "all" ? exchange : undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Screener</h1>
          <p className="text-muted-foreground">
            Filter and analyze stocks based on technical and fundamental criteria.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={handleRefresh}>Run Scan</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Symbol or name..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Exchange</label>
              <Select value={exchange} onValueChange={setExchange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exchange" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Exchanges</SelectItem>
                  <SelectItem value="US">US Market</SelectItem>
                  <SelectItem value="NYSE">NYSE</SelectItem>
                  <SelectItem value="NASDAQ">NASDAQ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sector</label>
              <Select value={sector} onValueChange={setSector}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sector" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sectors</SelectItem>
                  {availableSectors.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Price Range</label>
              <div className="flex items-center space-x-2">
                <Input 
                  placeholder="Min" 
                  type="number" 
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
                <span className="text-muted-foreground">-</span>
                <Input 
                  placeholder="Max" 
                  type="number" 
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <ScreenerResults filters={filters} key={refreshKey} />
        </CardContent>
      </Card>
    </div>
  )
}
