# 🗄️ Step 4: State Management with Zustand

## Overview

Set up Zustand store for managing filter state. Zustand is lightweight, already installed, and perfect for this use case.

## File Location

Create: `src/lib/store/filter-store.ts`

## Complete Implementation

```typescript
// src/lib/store/filter-store.ts

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { 
  ScanConfig, 
  Filter, 
  FilterNode, 
  FilterExpression,
  FilterGroup,
  SegmentType 
} from '@/lib/types/filter.types';

/**
 * Filter Store State Interface
 */
interface FilterStoreState {
  // State
  scanConfig: ScanConfig;

  // Scan Header Actions
  setScanBehavior: (behavior: 'passes' | 'fails') => void;
  setScanConjunction: (conjunction: 'all' | 'any') => void;
  setSegment: (segment: SegmentType) => void;

  // Filter Actions
  addFilter: () => void;
  updateFilter: (id: string, updates: Partial<FilterExpression>) => void;
  deleteFilter: (id: string) => void;
  duplicateFilter: (id: string) => void;
  toggleFilter: (id: string) => void;

  // Group Actions
  addFilterGroup: () => void;
  updateGroupConjunction: (groupId: string, conjunction: 'AND' | 'OR') => void;

  // Bulk Actions
  clearAllFilters: () => void;
  loadScan: (config: ScanConfig) => void;
  reorderFilters: (startIndex: number, endIndex: number) => void;

  // Utility
  getFilterById: (id: string) => FilterNode | undefined;
  getFilterCount: () => number;
  isValid: () => boolean;
}

/**
 * Create default filter with sensible defaults
 */
const createDefaultFilter = (): Filter => ({
  id: uuidv4(),
  type: 'simple',
  enabled: true,
  expression: {
    offset: 'latest',
    measure: 'close',
    operator: '>',
    valueType: 'number',
    compareToNumber: 0
  }
});

/**
 * Create default filter group
 */
const createDefaultFilterGroup = (): FilterGroup => ({
  id: uuidv4(),
  type: 'group',
  conjunction: 'AND',
  enabled: true,
  filters: [createDefaultFilter()]
});

/**
 * Zustand Store
 */
export const useFilterStore = create<FilterStoreState>()(
  devtools(
    (set, get) => ({
      // Initial State
      scanConfig: {
        behavior: 'passes',
        conjunction: 'all',
        segment: 'cash',
        filters: []
      },

      // Scan Header Actions
      setScanBehavior: (behavior) =>
        set((state) => ({
          scanConfig: { ...state.scanConfig, behavior }
        }), false, 'setScanBehavior'),

      setScanConjunction: (conjunction) =>
        set((state) => ({
          scanConfig: { ...state.scanConfig, conjunction }
        }), false, 'setScanConjunction'),

      setSegment: (segment) =>
        set((state) => ({
          scanConfig: { ...state.scanConfig, segment }
        }), false, 'setSegment'),

      // Filter Actions
      addFilter: () =>
        set((state) => ({
          scanConfig: {
            ...state.scanConfig,
            filters: [...state.scanConfig.filters, createDefaultFilter()]
          }
        }), false, 'addFilter'),

      updateFilter: (id, updates) =>
        set((state) => {
          const updateFilterRecursive = (filters: FilterNode[]): FilterNode[] => {
            return filters.map(filter => {
              if (filter.type === 'simple' && filter.id === id) {
                return {
                  ...filter,
                  expression: { ...filter.expression, ...updates }
                };
              }
              if (filter.type === 'group') {
                return {
                  ...filter,
                  filters: updateFilterRecursive(filter.filters)
                };
              }
              return filter;
            });
          };

          return {
            scanConfig: {
              ...state.scanConfig,
              filters: updateFilterRecursive(state.scanConfig.filters)
            }
          };
        }, false, 'updateFilter'),

      deleteFilter: (id) =>
        set((state) => {
          const deleteFilterRecursive = (filters: FilterNode[]): FilterNode[] => {
            return filters.filter(filter => {
              if (filter.id === id) return false;
              if (filter.type === 'group') {
                filter.filters = deleteFilterRecursive(filter.filters);
              }
              return true;
            });
          };

          return {
            scanConfig: {
              ...state.scanConfig,
              filters: deleteFilterRecursive(state.scanConfig.filters)
            }
          };
        }, false, 'deleteFilter'),

      duplicateFilter: (id) =>
        set((state) => {
          const findAndDuplicate = (filters: FilterNode[]): FilterNode[] => {
            const result: FilterNode[] = [];
            filters.forEach(filter => {
              result.push(filter);
              if (filter.id === id) {
                if (filter.type === 'simple') {
                  result.push({
                    ...filter,
                    id: uuidv4()
                  });
                } else {
                  // Deep clone group
                  result.push({
                    ...filter,
                    id: uuidv4(),
                    filters: filter.filters.map(f => ({
                      ...f,
                      id: uuidv4()
                    }))
                  });
                }
              }
            });
            return result;
          };

          return {
            scanConfig: {
              ...state.scanConfig,
              filters: findAndDuplicate(state.scanConfig.filters)
            }
          };
        }, false, 'duplicateFilter'),

      toggleFilter: (id) =>
        set((state) => {
          const toggleRecursive = (filters: FilterNode[]): FilterNode[] => {
            return filters.map(filter => {
              if (filter.id === id) {
                return { ...filter, enabled: !filter.enabled };
              }
              if (filter.type === 'group') {
                return {
                  ...filter,
                  filters: toggleRecursive(filter.filters)
                };
              }
              return filter;
            });
          };

          return {
            scanConfig: {
              ...state.scanConfig,
              filters: toggleRecursive(state.scanConfig.filters)
            }
          };
        }, false, 'toggleFilter'),

      // Group Actions
      addFilterGroup: () =>
        set((state) => ({
          scanConfig: {
            ...state.scanConfig,
            filters: [...state.scanConfig.filters, createDefaultFilterGroup()]
          }
        }), false, 'addFilterGroup'),

      updateGroupConjunction: (groupId, conjunction) =>
        set((state) => {
          const updateConjunction = (filters: FilterNode[]): FilterNode[] => {
            return filters.map(filter => {
              if (filter.type === 'group' && filter.id === groupId) {
                return { ...filter, conjunction };
              }
              if (filter.type === 'group') {
                return {
                  ...filter,
                  filters: updateConjunction(filter.filters)
                };
              }
              return filter;
            });
          };

          return {
            scanConfig: {
              ...state.scanConfig,
              filters: updateConjunction(state.scanConfig.filters)
            }
          };
        }, false, 'updateGroupConjunction'),

      // Bulk Actions
      clearAllFilters: () =>
        set((state) => ({
          scanConfig: { ...state.scanConfig, filters: [] }
        }), false, 'clearAllFilters'),

      loadScan: (config) =>
        set({ scanConfig: config }, false, 'loadScan'),

      reorderFilters: (startIndex, endIndex) =>
        set((state) => {
          const filters = Array.from(state.scanConfig.filters);
          const [removed] = filters.splice(startIndex, 1);
          filters.splice(endIndex, 0, removed);

          return {
            scanConfig: {
              ...state.scanConfig,
              filters
            }
          };
        }, false, 'reorderFilters'),

      // Utility Functions
      getFilterById: (id) => {
        const findFilter = (filters: FilterNode[]): FilterNode | undefined => {
          for (const filter of filters) {
            if (filter.id === id) return filter;
            if (filter.type === 'group') {
              const found = findFilter(filter.filters);
              if (found) return found;
            }
          }
          return undefined;
        };

        return findFilter(get().scanConfig.filters);
      },

      getFilterCount: () => {
        const countFilters = (filters: FilterNode[]): number => {
          return filters.reduce((count, filter) => {
            if (filter.type === 'simple') return count + 1;
            return count + countFilters(filter.filters);
          }, 0);
        };

        return countFilters(get().scanConfig.filters);
      },

      isValid: () => {
        const { filters } = get().scanConfig;
        return filters.length > 0 && filters.every(f => f.enabled);
      }
    }),
    { name: 'FilterStore' }
  )
);

// Selector hooks for performance
export const useFilterCount = () => useFilterStore(state => state.getFilterCount());
export const useScanConfig = () => useFilterStore(state => state.scanConfig);
export const useFilters = () => useFilterStore(state => state.scanConfig.filters);
```

## Usage Examples

### Example 1: Add a Filter

```typescript
import { useFilterStore } from '@/lib/store/filter-store';

function AddFilterButton() {
  const addFilter = useFilterStore(state => state.addFilter);

  return (
    <button onClick={addFilter}>
      Add Filter
    </button>
  );
}
```

### Example 2: Update Filter

```typescript
function FilterRow({ filterId }: { filterId: string }) {
  const updateFilter = useFilterStore(state => state.updateFilter);

  const handleOperatorChange = (operator: OperatorType) => {
    updateFilter(filterId, { operator });
  };

  return (
    <select onChange={(e) => handleOperatorChange(e.target.value as OperatorType)}>
      <option value=">">Greater than</option>
      <option value="<">Less than</option>
    </select>
  );
}
```

### Example 3: Use Selectors

```typescript
import { useFilterCount, useScanConfig } from '@/lib/store/filter-store';

function ScanStats() {
  const count = useFilterCount();
  const scanConfig = useScanConfig();

  return (
    <div>
      <p>{count} filters in {scanConfig.segment} segment</p>
    </div>
  );
}
```

## Testing the Store

Create a temporary test component:

```typescript
// Test component
import { useFilterStore } from '@/lib/store/filter-store';

export default function StoreTest() {
  const { scanConfig, addFilter, clearAllFilters } = useFilterStore();

  return (
    <div className="p-8">
      <h1>Store Test</h1>
      <p>Filters: {scanConfig.filters.length}</p>

      <button onClick={addFilter} className="px-4 py-2 bg-blue-500">
        Add Filter
      </button>

      <button onClick={clearAllFilters} className="px-4 py-2 bg-red-500">
        Clear All
      </button>

      <pre>{JSON.stringify(scanConfig, null, 2)}</pre>
    </div>
  );
}
```

## Zustand DevTools

Already configured! Open Redux DevTools in browser to see:
- All actions
- State changes
- Time travel debugging

## Checklist

- [ ] Store file created at `src/lib/store/filter-store.ts`
- [ ] All actions work (add, update, delete, etc.)
- [ ] Selector hooks defined
- [ ] DevTools show actions
- [ ] No TypeScript errors

👉 **Next**: [05-REUSABLE-COMPONENTS.md](./05-REUSABLE-COMPONENTS.md)
