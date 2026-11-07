"use client";

import { ChevronDown } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface FilterOption<T extends string> {
  value: T;
  label: string;
}

interface MultiSelectFilterProps<T extends string> {
  label: string;
  options: ReadonlyArray<FilterOption<T>>;
  selected: T[];
  onChange: (selected: T[]) => void;
  emptyText?: string;
}

/** Filtro de selección múltiple: lista de casillas accesibles dentro de un popover. */
export function MultiSelectFilter<T extends string>({
  label,
  options,
  selected,
  onChange,
  emptyText = "No hay opciones",
}: MultiSelectFilterProps<T>) {
  const groupId = useId();

  function toggle(value: T) {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            aria-label={
              selected.length
                ? `${label}: ${selected.length} seleccionados`
                : label
            }
          >
            {label}
            {selected.length > 0 && (
              <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                {selected.length}
              </span>
            )}
            <ChevronDown aria-hidden className="size-4" />
          </Button>
        }
      />
      <PopoverContent align="start" className="w-56 p-2">
        <fieldset
          aria-labelledby={groupId}
          className="flex max-h-64 flex-col gap-1 overflow-y-auto"
        >
          <legend id={groupId} className="sr-only">
            {label}
          </legend>
          {options.length === 0 && (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">
              {emptyText}
            </p>
          )}
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                className="size-4 accent-primary"
              />
              <span className="truncate">{opt.label}</span>
            </label>
          ))}
        </fieldset>
      </PopoverContent>
    </Popover>
  );
}
