import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Falla de carga: mensaje comprensible (sin detalles técnicos) y "Reintentar" (CA-01.4). */
export function BoardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center"
    >
      <TriangleAlert aria-hidden className="size-8 text-destructive" />
      <h2 className="text-lg font-semibold">No pudimos cargar el tablero</h2>
      <p className="text-sm text-muted-foreground">
        Hubo un problema al obtener tus tareas. Revisá tu conexión e intentá
        nuevamente.
      </p>
      <Button onClick={onRetry}>Reintentar</Button>
    </div>
  );
}
