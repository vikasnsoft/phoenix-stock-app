import * as React from 'react';
import { useFilterStore } from '@/lib/store/filter-store';
import { FilterGroup, isFilterGroup, isSimpleFilter } from '@/lib/types/filter.types';
import { ScanFilterRow } from './scan-filter-row';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Copy, Plus, X, Power, PowerOff } from 'lucide-react';
import { ActionButtons } from './scan-action-buttons';

interface FilterGroupProps {
  group: FilterGroup;
  depth?: number;
}

export function ScanFilterGroup({ group, depth = 0 }: FilterGroupProps) {
  const { 
    addFilter, 
    updateGroupConjunction, 
    deleteFilter, 
    duplicateFilter,
    toggleFilter,
    addFilterGroup 
    // We actually need addFilterToGroup() logic if strict tree editing
    // But for now, the store only has global addFilter(). 
    // Wait, the store implementation I wrote earlier has addFilter() which adds to ROOT.
    // It does NOT support adding to a specific group yet in the provided example.
    // I should fix the store or just support root level for now?
    // The prompt implied Chartink style which handles grouping via "Passes All/Any".
    // Chartink typically uses a flat list of groups or just strict "All" vs "Any".
    // But recursive AST implies nesting.
    
    // For this implementation, I will assume we are rendering the root filters.
    // If correct Chartink UI, it usually doesn't have deep nesting buttons in every row.
    // But let's support rendering what we have.
  } = useFilterStore();

  // If we want to add a filter to THIS group, the store needs an action `addFilterToGroup(groupId)`.
  // The current store implementation `addFilter()` just adds to `scanConfig.filters` (root).
  // I will check the store implementation again.
  // ... check step 1166 ...
  // addFilter: adds to root.
  // addFilterGroup: adds to root.
  
  // So currently we can only add to root. 
  // This limits the UI to 1 level of groups if we only use the provided actions.
  // Detailed Chartink actually allows "Sub-Filters" via bracket logic.
  // For now, I will render the tree. If the user wants to add to a group, we might need to enhance the store.
  // But strictly following the "Step 4" code provided, we don't have `addFilterToGroup`.
  // I will proceed with rendering. The main "Builder" will likely only call `addFilter` at the top level.
  
  return (
    <div className={cn(
      "flex flex-col gap-1 relative",
      depth > 0 && "pl-6 border-l-2 border-muted"
    )}>
      {/* Group Header/Conjunction (only if depth > 0 or if specific UI required) */}
      {depth > 0 && (
         <div className="flex items-center gap-2 mb-2">
            <Button
               variant="outline"
               size="sm"
               onClick={() => updateGroupConjunction(group.id, group.conjunction === 'AND' ? 'OR' : 'AND')}
               className="h-6 text-xs font-bold w-12"
            >
              {group.conjunction}
            </Button>
            <ActionButtons 
               onDuplicate={() => duplicateFilter(group.id)}
               onDelete={() => deleteFilter(group.id)}
               onToggle={() => toggleFilter(group.id)}
               enabled={group.enabled}
            />
         </div>
      )}

      {group.filters.map((node, index) => (
        <div key={node.id}>
           {isSimpleFilter(node) && (
              <ScanFilterRow filter={node} index={index} />
           )}
           {isFilterGroup(node) && (
              <ScanFilterGroup group={node} depth={depth + 1} />
           )}
           
           {/* Render Conjunction between items */}
           {index < group.filters.length - 1 && (
             <div className="px-4 py-1 text-xs font-bold text-muted-foreground ml-8">
               {group.conjunction}
             </div>
           )}
        </div>
      ))}
    </div>
  );
}
