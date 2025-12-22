"use client";

import { useForm, UseFormReturn, Control } from "react-hook-form";
import { 
  X, 
  Check, 
  Copy, 
  Trash2, 
  MoreHorizontal,
  ChevronsUpDown,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useState, useRef, useEffect } from "react";
import { SCANNER_MEASURES, MEASURE_GROUPS, MeasureOption } from "@/lib/scanner-measures";
import { FilterCondition } from "../scan-types";

// --- Inline UI Components ---

export const InlineSelect = ({
  value,
  onChange,
  options,
  className
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("h-auto p-0 border-0 bg-transparent shadow-none focus:ring-0 w-auto gap-1 hover:underline", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export const InlineMeasureSelect = ({ 
  value, 
  onChange, 
  placeholder = "Select Indicator",
  className
}: { 
  value: string; 
  onChange: (val: string, measure?: MeasureOption) => void; 
  placeholder?: string;
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  const selectedLabel = value ? SCANNER_MEASURES.find((m) => m.value === value)?.label || value : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button 
           className={cn("bg-transparent border-0 p-0 text-left font-medium hover:underline focus:outline-none flex items-center gap-1", className)}
           role="combobox"
        >
          {selectedLabel}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search indicators..." />
          <CommandList className="max-h-[300px]">
             <CommandEmpty>No measure found.</CommandEmpty>
             {MEASURE_GROUPS.map((group) => {
               const items = SCANNER_MEASURES.filter(m => m.group === group);
               if (!items.length) return null;
               return (
                 <CommandGroup key={group} heading={group}>
                   {items.map((m) => (
                     <CommandItem
                       key={m.value}
                       value={m.label}
                       onSelect={() => {
                         onChange(m.value, m);
                         setOpen(false);
                       }}
                     >
                       <Check className={cn("mr-2 h-4 w-4", value === m.value ? "opacity-100" : "opacity-0")} />
                       {m.label}
                     </CommandItem>
                   ))}
                 </CommandGroup>
               );
             })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export const InlineParameter = ({
  value,
  onChange,
  className
}: {
  value: number;
  onChange: (val: number) => void;
  className?: string;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
    }
  }, [isEditing]);

  if (isEditing) {
      return (
          <input
            ref={inputRef}
            type="number"
            className={cn("w-[40px] h-5 px-0.5 text-center text-xs bg-transparent border-b border-primary focus:outline-none", className)}
            value={value}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => {
                if(e.key === 'Enter') setIsEditing(false);
            }}
            onChange={(e) => onChange(Number(e.target.value))}
          />
      )
  }

  return (
    <span 
      className={cn("cursor-pointer hover:underline text-xs text-muted-foreground ml-0.5", className)} 
      onClick={() => setIsEditing(true)}
      title="Click to edit period"
    >
      ({value})
    </span>
  );
};


// Constants for FilterRow
const operatorOptions = {
  numeric: [
    { value: "gt", label: "Greater than" },
    { value: "gte", label: "Greater than equal" },
    { value: "lt", label: "Less than" },
    { value: "lte", label: "Less than equal" },
    { value: "eq", label: "Equal to" },
    { value: "ne", label: "Not equal to" },
    { value: "crossed_above", label: "Crossed above" },
    { value: "crossed_below", label: "Crossed below" },
  ],
  gap: [
    { value: "gap_up", label: "Gap up" },
    { value: "gap_down", label: "Gap down" },
  ],
};


export const FilterRow = ({ 
  filter,
  onUpdate,
  onRemove,
  onDuplicate
}: { 
  filter: FilterCondition; 
  onUpdate: (updated: FilterCondition) => void;
  onRemove: () => void;
  onDuplicate?: () => void;
}) => {
  // Use local derived state for rendering, update parent on change
  
  const currentType = filter.filterType || 'price'; // Use filterType from generic schema
  const valueType = filter.valueType || 'number';
  const currentTimeframe = filter.timeframe || 'daily';
  const currentOperator = filter.operator || 'gt';

  const updateField = (key: keyof FilterCondition, val: any) => {
      onUpdate({ ...filter, [key]: val });
  };

  const handleValueTypeChange = (type: 'number' | 'indicator') => {
     if (type === 'number') {
        onUpdate({ ...filter, valueType: 'number', value: 0 });
     } else {
        onUpdate({
            ...filter,
            valueType: 'indicator',
            value: { type: 'indicator', field: 'rsi_14', time_period: 14 }
        });
     }
  };

  // Ensure default time_period for LHS
  useEffect(() => {
     if(filter.filterType === 'indicator' && !filter.time_period) {
         // Try to extract from field (e.g. rsi_14 -> 14)
         const match = filter.field?.match(/_(\d+)$/);
         if(match) {
             updateField('time_period', parseInt(match[1]));
         } else {
             updateField('time_period', 14);
         }
     }
  }, [filter.filterType, filter.field]);

  // Styles - System Theme
  const styles = {
    timeframe: "text-muted-foreground font-medium hover:text-foreground transition-colors",
    attribute: "text-foreground font-semibold text-[15px] hover:text-primary transition-colors",
    operator: "text-muted-foreground font-medium hover:text-foreground transition-colors",
    // PILL STYLE: border, rounded-full, distinct background
    valueNumber: "bg-background text-foreground border border-input shadow-sm px-3 py-0.5 rounded-full font-bold min-w-[50px] text-center text-sm outline-none focus:ring-1 focus:ring-ring focus:border-primary transition-all hover:border-primary/50",
    valueIndicator: "text-foreground font-semibold",
    offset: "text-muted-foreground text-xs",
  };

  const supportsPeriod = (field: string) => {
      // Include min/max for rolling window functions
      return ['rsi', 'sma', 'ema', 'wma', 'tema', 'hma', 'adx', 'cci', 'stoch', 'min', 'max'].some(k => field?.toLowerCase().includes(k));
  };

  return (
    <div className="group flex flex-wrap items-baseline gap-2 p-2 hover:bg-muted/50 rounded-lg transition-colors border border-transparent hover:border-border/30">
      
      {/* 1. Timeframe (LHS) */}
      <InlineSelect
        value={currentTimeframe}
        onChange={(val) => updateField('timeframe', val)}
        options={['daily', 'weekly', 'monthly', '5min', '15min', '60min'].map(t => ({ value: t, label: t }))}
        className={styles.timeframe}
      />

      {/* 2. Attribute (LHS) */}
      <div className="flex items-baseline">
          <InlineMeasureSelect 
            value={filter.field || ''} 
            onChange={(val, m) => {
              // Logic for updating type based on measure
              let newType = filter.filterType;
              let newOp = filter.operator;
              
              if (m?.filterType) {
                  newType = m.filterType as any;
                  if(m.filterType === 'pattern') {
                      newOp = 'eq';
                  }
              }
              onUpdate({
                  ...filter,
                  field: val,
                  filterType: newType, // Important mapping
                  // Maintain operator if not pattern
                  operator: newOp
              });
            }}
            className={styles.attribute}
          />
          {/* Parameter Edit (LHS) */}
          {supportsPeriod(filter.field || '') && (
              <InlineParameter
                 value={filter.time_period || 14}
                 onChange={(val) => updateField('time_period', val)}
              />
          )}
      </div>

      {/* 3. Offset (LHS) */}
      {['price', 'indicator', 'function'].includes(currentType) && (
         <div className="flex items-baseline gap-1">
             <span className={styles.offset}>ago</span>
             <input
              type="number"
              className="w-6 bg-transparent text-center text-xs text-muted-foreground focus:text-foreground focus:outline-none border-b border-transparent focus:border-muted-foreground"
              placeholder="0"
              value={filter.offset || 0}
              onChange={(e) => updateField('offset', parseInt(e.target.value) || 0)}
             />
         </div>
      )}

      {/* 4. Operator */}
       {currentType !== 'pattern' && (
          <InlineSelect
            value={currentOperator || 'gt'}
            onChange={(val) => updateField('operator', val)}
            options={(currentType === 'gap' ? operatorOptions.gap : operatorOptions.numeric)}
            className={styles.operator}
          />
       )}
      
      {/* 5. Value (RHS) */}
       {currentType !== 'pattern' && (
          <div className="flex items-baseline gap-2">
              {valueType === 'number' ? (
                <div className="flex items-center gap-1">
                   {/* <span className="text-sm font-semibold text-muted-foreground/50">num</span> */}
                   <input
                      type="number"
                      className={styles.valueNumber}
                      step="any"
                      value={typeof filter.value === 'number' && !Number.isNaN(filter.value) ? filter.value : ''}
                      onChange={(e) => updateField('value', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                   />
                </div>
              ) : (
                <div className="flex items-baseline gap-2">
                   <span className={styles.timeframe}>{currentTimeframe}</span> 
                   <div className="flex items-baseline">
                       <InlineMeasureSelect 
                         value={(filter.value as any)?.field || ''} 
                         onChange={(val) => {
                            // Update RHS structure
                            onUpdate({
                                ...filter,
                                value: { 
                                    type: 'indicator', 
                                    field: val, 
                                    time_period: (filter.value as any)?.time_period || 14 
                                }
                            });
                         }}
                         className={styles.attribute}
                         placeholder="Select Indicator"
                       />
                        {/* Parameter Edit (RHS) */}
                        {supportsPeriod((filter.value as any)?.field || '') && (
                            <InlineParameter
                               value={(filter.value as any)?.time_period || 14}
                               onChange={(val) => {
                                   const curVal = filter.value as any;
                                   updateField('value', { ...curVal, time_period: val });
                               }}
                            />
                        )}
                   </div>
                </div>
              )}


              {/* Type Switcher */}
              <Popover>
                 <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                       <MoreHorizontal className="h-3 w-3" />
                    </Button>
                 </PopoverTrigger>
                 <PopoverContent className="w-40 p-1">
                    <div className="grid gap-1">
                       <Button variant="ghost" size="sm" onClick={() => handleValueTypeChange('number')} className="justify-start h-7 px-2 text-xs">
                          Compare with Number
                       </Button>
                       <Button variant="ghost" size="sm" onClick={() => handleValueTypeChange('indicator')} className="justify-start h-7 px-2 text-xs">
                          Compare with Indicator
                       </Button>
                       <div className="h-px bg-border my-1" />
                        {/* Arithmetic Toggle */}
                        <Button 
                            variant={filter.arithmetic ? "secondary" : "ghost"} 
                            size="sm" 
                            onClick={() => {
                                if (filter.arithmetic) {
                                    onUpdate({ ...filter, arithmetic: undefined });
                                } else {
                                    onUpdate({ ...filter, arithmetic: { operator: '*', value: 1.0 } });
                                }
                            }} 
                            className="justify-start h-7 px-2 text-xs"
                        >
                          {filter.arithmetic ? "Remove Operations" : "Add Operations"}
                       </Button>
                    </div>
                 </PopoverContent>
              </Popover>

              {/* Arithmetic Modifier UI */}
              {filter.arithmetic && (
                 <div className="flex items-center gap-1 ml-1 bg-muted/30 px-1.5 py-0.5 rounded border border-border/50">
                    <InlineSelect 
                        value={filter.arithmetic.operator}
                        onChange={(val) => onUpdate({ ...filter, arithmetic: { ...filter.arithmetic!, operator: val as any } })}
                        options={[{value:'*', label:'*'}, {value:'/', label:'/'}, {value:'+', label:'+'}, {value:'-', label:'-'}]}
                        className="font-bold text-muted-foreground"
                    />
                    <input
                       type="number"
                       className={styles.valueNumber}
                       step="any"
                       value={filter.arithmetic.value}
                       onChange={(e) => onUpdate({ ...filter, arithmetic: { ...filter.arithmetic!, value: parseFloat(e.target.value) } })}
                    />
                 </div>
              )}
          </div>
       )}

      {/* Actions */}
      <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Explain Button */}
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" title="Explain">
                    <Sparkles className="h-3.5 w-3.5" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 text-sm">
                <p className="font-semibold mb-1 text-primary">Explanation</p>
                <p className="text-muted-foreground leading-relaxed">
                   Filter checks if 
                   <span className="font-medium text-foreground"> {currentTimeframe} {filter.field?.toUpperCase() || 'Attribute'} </span>
                   {filter.offset ? `(${filter.offset} days ago) ` : ''} 
                   is 
                   <span className="font-medium text-foreground"> {currentOperator.replace(/_/g, ' ')} </span> 
                   {valueType === 'number' ? (
                       <span className="font-medium text-foreground"> {filter.value as number} </span>
                   ) : (
                       <span className="font-medium text-foreground"> {(filter.value as any)?.field?.toUpperCase()} </span>
                   )}
                   {filter.arithmetic && ` (modified by ${filter.arithmetic.operator} ${filter.arithmetic.value})`}.
                </p>
            </PopoverContent>
        </Popover>

        {/* Only show duplicate if onDuplicate is provided */}
        {onDuplicate && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onDuplicate} title="Duplicate">
            <Copy className="h-3.5 w-3.5" />
            </Button>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onRemove} title="Delete">
           <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

    </div>
  );
};
