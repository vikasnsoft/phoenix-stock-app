"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export interface ScanResult {
  symbol: string
  close: number
  volume: number | null
  date: string
  matched_filters: number
  total_filters: number
  filter_details: any[]
}

export const columns: ColumnDef<ScanResult>[] = [
  {
    accessorKey: "symbol",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Symbol
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="font-bold text-primary">{row.getValue("symbol")}</div>,
  },
  {
    accessorKey: "close",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Close
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("close"))
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount)
 
      return <div className="font-medium">{formatted}</div>
    },
  },
  {
    accessorKey: "volume",
    header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Volume
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
    cell: ({ row }) => {
        const vol = row.getValue("volume") as number
        if (!vol) return <div className="text-muted-foreground">-</div>
        return <div className="text-foreground">{vol.toLocaleString()}</div>
    },
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => <div className="text-muted-foreground">{row.getValue("date")}</div>,
  },
    {
    accessorKey: "matched_filters",
    header: "Matches",
    cell: ({ row }) => {
       const matched = row.original.matched_filters
       const total = row.original.total_filters
       const details = row.original.filter_details

       return (
        <div className="flex items-center gap-2">
            <span className={matched === total ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}>
                {matched}/{total}
            </span>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent className="p-3 max-w-sm">
                        <div className="flex flex-col gap-2 text-xs">
                            {details.map((d, i) => (
                                <div key={i} className="flex gap-2">
                                    <span className={d.passed ? "text-green-600 dark:text-green-400" : "text-destructive"}>
                                        {d.passed ? "✓" : "✗"}
                                    </span>
                                    <span>
                                        {d.type === 'indicator' ? `${d.field} ${d.operator} ${d.compare_value}` : 
                                         d.type === 'price' ? `${d.field} ${d.operator} ${d.value}` :
                                         JSON.stringify(d)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
       )
    }
  },
]
