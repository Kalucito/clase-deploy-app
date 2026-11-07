import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Hay tareas pero ninguna coincide con los filtros (CA-08.7). Distinto de EmptyBoard. */
export function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <SearchX aria-hidden className="size-10 text-muted-foreground" />
      <h2 className="text-lg font-semibold">Sin resultados</h2>
      <p className="text-sm text-muted-foreground">
        Ninguna tarea coincide con la búsqueda o los filtros aplicados.
      </p>
      <Button variant="outline" onClick={onClear}>
        Limpiar filtros
      </Button>
    </div>
  );
}
