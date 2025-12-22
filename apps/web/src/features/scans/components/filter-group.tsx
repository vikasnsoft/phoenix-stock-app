"use client";

import { useState } from "react";
import { Plus, Trash2, GitBranch, GitMerge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilterCondition, FilterGroup as IFilterGroup, FilterNode, defaultCondition } from "../scan-types";
import { FilterRow } from "./scan-filters";
import { cn } from "@/lib/utils";

interface FilterGroupProps {
  group: IFilterGroup;
  depth?: number;
  onUpdate: (updatedGroup: IFilterGroup) => void;
  onRemove?: () => void; // Root group cannot be removed
}

export const FilterGroup = ({ group, depth = 0, onUpdate, onRemove }: FilterGroupProps) => {

  const handleLogicChange = (logic: "AND" | "OR") => {
    onUpdate({ ...group, logic });
  };

  const handleAddFilter = () => {
    const newFilter: FilterCondition = { ...defaultCondition, id: crypto.randomUUID() };
    onUpdate({ ...group, children: [...group.children, newFilter] });
  };

  const handleAddGroup = () => {
    const newGroup: IFilterGroup = {
      id: crypto.randomUUID(),
      type: "group",
      logic: group.logic === "AND" ? "OR" : "AND", // Alternate logic for better default
      children: [{ ...defaultCondition, id: crypto.randomUUID() }] // Start with one filter
    };
    onUpdate({ ...group, children: [...group.children, newGroup] });
  };

  const updateChild = (index: number, updatedChild: FilterNode) => {
    const newChildren = [...group.children];
    newChildren[index] = updatedChild;
    onUpdate({ ...group, children: newChildren });
  };

  const removeChild = (index: number) => {
    const newChildren = group.children.filter((_, i) => i !== index);
    onUpdate({ ...group, children: newChildren });
  };

  // Visual styles for nesting
  const isRoot = depth === 0;
  
  return (
    <div className={cn(
        "flex flex-col gap-2 rounded-lg transition-all",
        !isRoot && "ml-6 border-l-2 border-border/50 pl-4 py-2 my-2 bg-muted/5 relative",
        // Logic line connector visual
        !isRoot && "before:absolute before:w-4 before:h-[2px] before:bg-border/50 before:-left-[2px] before:top-6"
    )}>
      
      {/* Header logic (ONLY if grouping, root logic handled inside) */}
      <div className="flex items-center gap-2 mb-2">
         {/* Logic Selector */}
         <div className={cn("flex items-center gap-2", isRoot ? "mb-2" : "")}>
             <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                 {isRoot ? "Stock passes" : "Passes"}
             </span>
             
             <Select value={group.logic} onValueChange={(v) => handleLogicChange(v as "AND" | "OR")}>
                <SelectTrigger className={cn("h-7 w-[70px] border-0 px-2 font-bold", 
                    group.logic === "AND" ? "bg-primary/10 text-primary" : "bg-orange-500/10 text-orange-600"
                )}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="AND">ALL</SelectItem>
                    <SelectItem value="OR">ANY</SelectItem>
                </SelectContent>
             </Select>

             <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                 of the below:
             </span>
         </div>

         {/* Remove Group Button (not for root) */}
         {!isRoot && (
             <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto text-muted-foreground hover:text-destructive" onClick={onRemove}>
                 <Trash2 className="h-3 w-3" />
             </Button>
         )}
      </div>

      {/* Children List */}
      <div className="flex flex-col gap-2">
         {group.children.length === 0 && (
             <div className="text-xs text-muted-foreground italic p-2">Empty group</div>
         )}
         
         {group.children.map((child, idx) => (
             <div key={child.id}>
                 {child.type === "group" ? (
                     <FilterGroup 
                        group={child} 
                        depth={depth + 1} 
                        onUpdate={(u) => updateChild(idx, u)}
                        onRemove={() => removeChild(idx)}
                     />
                 ) : (
                     <div className="flex items-center gap-2">
                         <div className="flex-1">
                             <FilterRow 
                                filter={child}
                                onUpdate={(u) => updateChild(idx, u)}
                                onRemove={() => removeChild(idx)}
                                onDuplicate={() => {
                                    const dup = { ...child, id: crypto.randomUUID() };
                                    onUpdate({ ...group, children: [...group.children.slice(0, idx+1), dup, ...group.children.slice(idx+1)] });
                                }}
                             />
                         </div>
                     </div>
                 )}
             </div>
         ))}
      </div>

      {/* Footer Add Buttons */}
      <div className="flex items-center gap-2 mt-2 opacity-50 hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleAddFilter}>
              <Plus className="h-3 w-3" /> Filter
          </Button>
          <Separator orientation="vertical" className="h-4" />
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleAddGroup}>
              <GitBranch className="h-3 w-3" /> Group
          </Button>
      </div>

    </div>
  );
};
