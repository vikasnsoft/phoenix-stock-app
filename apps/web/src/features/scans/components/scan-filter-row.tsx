"use client";

import { useFilterStore } from "@/lib/store/filter-store";
import { Filter } from "@/lib/types/filter.types";
import { InlineFilterEditor } from "./unified/inline-filter-editor";

interface FilterRowProps {
  filter: Filter;
  index: number;
}

export function ScanFilterRow({ filter, index }: FilterRowProps) {
  const { updateFilter, deleteFilter, duplicateFilter } = useFilterStore();

  return (
    <InlineFilterEditor
      filter={filter}
      onUpdate={(updatedFilter) => {
        // updatedFilter is the whole filter object.
        // updateFilter store action takes (id, updates).
        updateFilter(filter.id, updatedFilter.expression);
      }}
      onDelete={deleteFilter}
      onDuplicate={duplicateFilter}
    />
  );
}
