"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

interface SearchInputProps {
  onChange: (value: string) => void;
  /** Espera tras la última tecla antes de filtrar. */
  debounceMs?: number;
  initialValue?: string;
}

/** Búsqueda con debounce (CA-08.1). El filtrado es local: no hay peticiones por tecla. */
export function SearchInput({
  onChange,
  debounceMs = 250,
  initialValue = "",
}: SearchInputProps) {
  const [text, setText] = useState(initialValue);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = setTimeout(() => onChangeRef.current(text), debounceMs);
    return () => clearTimeout(timer);
  }, [text, debounceMs]);

  return (
    <div className="relative w-full sm:w-64">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Buscar tareas…"
        aria-label="Buscar tareas"
        className="pl-8"
      />
    </div>
  );
}
