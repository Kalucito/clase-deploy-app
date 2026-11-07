import { useCallback, useState } from "react";
import { EMPTY_FILTERS, type Filters } from "@/lib/filters";

/**
 * Estado de búsqueda y filtros: vive en la UI y NO se persiste (RN-16): recargar
 * la página los limpia.
 */
export function useFilters() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  // Se incrementa al limpiar para reiniciar el campo de búsqueda (que tiene estado propio por el debounce).
  const [clearCount, setClearCount] = useState(0);

  const setSearch = useCallback(
    (search: string) => setFilters((f) => ({ ...f, search })),
    [],
  );
  const setPriorities = useCallback(
    (priorities: Filters["priorities"]) =>
      setFilters((f) => ({ ...f, priorities })),
    [],
  );
  const setLabels = useCallback(
    (labels: string[]) => setFilters((f) => ({ ...f, labels })),
    [],
  );
  const setStatuses = useCallback(
    (statuses: Filters["statuses"]) => setFilters((f) => ({ ...f, statuses })),
    [],
  );
  const clear = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setClearCount((c) => c + 1);
  }, []);

  return {
    filters,
    setFilters,
    setSearch,
    setPriorities,
    setLabels,
    setStatuses,
    clear,
    clearCount,
  };
}
