"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COLUMNS, PRIORITIES, PRIORITY_LABELS } from "@/lib/constants";
import { hasActiveFilters, type Filters } from "@/lib/filters";
import { MultiSelectFilter } from "./MultiSelectFilter";
import { SearchInput } from "./SearchInput";

interface FilterBarProps {
  filters: Filters;
  /** Etiquetas existentes en el tablero (CA-08.3). */
  availableLabels: string[];
  clearCount: number;
  onSearchChange: (search: string) => void;
  onPrioritiesChange: (priorities: Filters["priorities"]) => void;
  onLabelsChange: (labels: string[]) => void;
  onStatusesChange: (statuses: Filters["statuses"]) => void;
  onClear: () => void;
  debounceMs?: number;
}

const PRIORITY_OPTIONS = PRIORITIES.map((p) => ({
  value: p,
  label: PRIORITY_LABELS[p],
}));
const STATUS_OPTIONS = COLUMNS.map((c) => ({
  value: c.status,
  label: c.title,
}));

export function FilterBar({
  filters,
  availableLabels,
  clearCount,
  onSearchChange,
  onPrioritiesChange,
  onLabelsChange,
  onStatusesChange,
  onClear,
  debounceMs,
}: FilterBarProps) {
  const active = hasActiveFilters(filters);
  return (
    <div
      role="search"
      aria-label="Búsqueda y filtros"
      className="flex flex-wrap items-center gap-2"
    >
      <SearchInput
        key={clearCount}
        onChange={onSearchChange}
        debounceMs={debounceMs}
      />
      <MultiSelectFilter
        label="Prioridad"
        options={PRIORITY_OPTIONS}
        selected={filters.priorities}
        onChange={onPrioritiesChange}
      />
      <MultiSelectFilter
        label="Etiqueta"
        options={availableLabels.map((l) => ({ value: l, label: l }))}
        selected={filters.labels}
        onChange={onLabelsChange}
        emptyText="Todavía no hay etiquetas"
      />
      <MultiSelectFilter
        label="Estado"
        options={STATUS_OPTIONS}
        selected={filters.statuses}
        onChange={onStatusesChange}
      />
      {active && (
        <Button variant="ghost" onClick={onClear}>
          <X aria-hidden /> Limpiar filtros
        </Button>
      )}
    </div>
  );
}
