"use client"

import { useState, useEffect } from "react"
import { useSymbols } from "@/hooks/use-stocks"
import { SymbolsControllerFindAllParams, SymbolsControllerFindAllExchange } from "@/lib/api/generated/index.schemas"
import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"
import { Loader2 } from "lucide-react"
import { PaginationState, Updater } from "@tanstack/react-table"

interface ScreenerResultsProps {
  filters: {
    search?: string;
    sector?: string;
    exchange?: string;
  };
}

export function ScreenerResults({ filters }: ScreenerResultsProps) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })

  // Cast string exchange to enum if valid, otherwise undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exchangeParam = Object.values(SymbolsControllerFindAllExchange).includes(filters.exchange as any)
    ? (filters.exchange as SymbolsControllerFindAllExchange)
    : undefined;

  const queryParams: SymbolsControllerFindAllParams = {
    search: filters.search,
    sector: filters.sector,
    exchange: exchangeParam,
    skip: pagination.pageIndex * pagination.pageSize,
    take: pagination.pageSize,
  };

  const { data, isLoading, isError } = useSymbols(queryParams)

  // Reset page when filters change
  useEffect(() => {
    if (pagination.pageIndex !== 0) {
      setPagination(prev => ({ ...prev, pageIndex: 0 }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  const total = data?.total || 0
  const symbols = data?.symbols || []
  const totalPages = Math.ceil(total / pagination.pageSize)

  const handlePaginationChange = (updaterOrValue: Updater<PaginationState>) => {
    setPagination(prev => {
      const newPagination = typeof updaterOrValue === 'function'
        ? updaterOrValue(prev)
        : updaterOrValue
      return newPagination
    })
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex h-64 items-center justify-center text-red-500">
        Failed to load symbols. Please try again.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <DataTable 
        columns={columns} 
        data={symbols} 
        pageCount={totalPages}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
      />
    </div>
  )
}
