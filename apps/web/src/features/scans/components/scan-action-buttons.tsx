import { Button } from "@/components/ui/button"
import { Copy, X, Power, PowerOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface ActionButtonsProps {
  onDuplicate: () => void
  onDelete: () => void
  onToggle: () => void
  enabled: boolean
}

export function ActionButtons({ 
  onDuplicate, 
  onDelete, 
  onToggle, 
  enabled 
}: ActionButtonsProps) {
  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-foreground"
        onClick={onToggle}
        title={enabled ? "Disable filter" : "Enable filter"}
      >
        {enabled ? <Power className="h-3 w-3" /> : <PowerOff className="h-3 w-3 text-red-500" />}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-foreground"
        onClick={onDuplicate}
        title="Duplicate filter"
      >
        <Copy className="h-3 w-3" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-red-600"
        onClick={onDelete}
        title="Delete filter"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}
