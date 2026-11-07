import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Tablero sin ninguna tarea (CA-01.5). */
export function EmptyBoard({ onCreate }: { onCreate?: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <ClipboardList aria-hidden className="size-10 text-muted-foreground" />
      <h2 className="text-lg font-semibold">Todavía no hay tareas</h2>
      <p className="text-sm text-muted-foreground">
        Creá la primera tarea para empezar a organizar tu trabajo.
      </p>
      <Button onClick={onCreate}>Crear la primera tarea</Button>
    </div>
  );
}
