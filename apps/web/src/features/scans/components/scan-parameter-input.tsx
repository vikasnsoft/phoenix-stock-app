import * as React from "react"
import { Settings2 } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getIndicatorConfig } from "@/lib/constants/indicators"
import { Indicator } from "@/lib/types/filter.types"
import { InlineSelect } from "./scan-inline-select"
import { ALL_ATTRIBUTES } from "@/lib/constants/attributes"

interface ParameterInputProps {
  indicator: Indicator
  onChange: (newIndicator: Indicator) => void
}

export function ParameterInput({ indicator, onChange }: ParameterInputProps) {
  const config = getIndicatorConfig(indicator.type)
  const [open, setOpen] = React.useState(false)

  if (!config || !config.hasParameters) return null

  const handleParamChange = (index: number, value: string | number) => {
    const newParams = [...indicator.parameters]
    newParams[index] = value
    onChange({
      ...indicator,
      parameters: newParams
    })
  }

  // Generate display text for the trigger (e.g., "(14)" or "(12, 26, 9)")
  const paramText = `(${indicator.parameters.join(", ")})`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-auto p-1 px-1 text-muted-foreground hover:text-foreground font-normal"
        >
          {paramText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4">
        <div className="space-y-4">
          <h4 className="font-medium leading-none mb-2">{config.label} Parameters</h4>
          
          {config.parameters.map((param, index) => (
            <div key={param.name} className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor={`param-${index}`} className="text-right">
                {param.name}
              </Label>
              <div className="col-span-2">
                {param.type === 'measure' ? (
                  <InlineSelect
                    value={String(indicator.parameters[index] || param.default)}
                    options={ALL_ATTRIBUTES} // For now, only picking attributes as measure params
                    onChange={(val) => handleParamChange(index, val)}
                    placeholder={param.placeholder || "Select..."}
                    className="w-full justify-start font-normal border rounded px-3 py-1"
                  />
                ) : (
                  <Input
                    id={`param-${index}`}
                    type="number"
                    value={indicator.parameters[index] || ''}
                    placeholder={String(param.default)}
                    className="h-8"
                    onChange={(e) => handleParamChange(index, parseFloat(e.target.value) || 0)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
