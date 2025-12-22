"use client"

import { ColumnDef } from "@tanstack/react-table"
import { SymbolDto } from "@/lib/api/generated/index.schemas"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"

export const columns: ColumnDef<SymbolDto>[] = [
  {
    accessorKey: "ticker",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Symbol" />
    ),
    cell: ({ row }) => <div className="font-medium">{row.getValue("ticker")}</div>,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <div className="max-w-[200px] truncate" title={row.getValue("name")}>
        {row.getValue("name")}
      </div>
    ),
  },
  {
    accessorKey: "sector",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Sector" />
    ),
    cell: ({ row }) => <div>{row.getValue("sector") || "-"}</div>,
  },
  {
    accessorKey: "industry",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Industry" />
    ),
    cell: ({ row }) => (
      <div className="max-w-[200px] truncate" title={row.getValue("industry")}>
        {row.getValue("industry") || "-"}
      </div>
    ),
  },
  {
    accessorKey: "lastPrice",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Price" className="justify-end" />
    ),
    cell: ({ row }) => {
      const priceVal = row.getValue("lastPrice")
      const price = typeof priceVal === 'number' ? priceVal : 0
      
      if (!priceVal && priceVal !== 0) return <div className="text-right font-medium">-</div>

      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(price)

      return <div className="text-right font-medium">{formatted}</div>
    },
  },
  {
    accessorKey: "changePercent",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Change %" className="justify-end" />
    ),
    cell: ({ row }) => {
      const changeVal = row.getValue("changePercent")
      const change = typeof changeVal === 'number' ? changeVal : 0
      
      if (!changeVal && changeVal !== 0) return <div className="text-right">-</div>

      const formatted = `${change > 0 ? "+" : ""}${change.toFixed(2)}%`
      
      return (
        <div className={`text-right ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
          {formatted}
        </div>
      )
    },
  },
  {
    accessorKey: "volume",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Volume" className="justify-end" />
    ),
    cell: ({ row }) => {
      const volumeVal = row.getValue("volume")
      const volume = typeof volumeVal === 'number' ? volumeVal : 0
      return <div className="text-right">{volume ? volume.toLocaleString() : "-"}</div>
    },
  },
]
