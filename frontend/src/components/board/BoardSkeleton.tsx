import { Skeleton } from "@/components/ui/skeleton";
import { COLUMNS } from "@/lib/constants";

/** Esqueleto de las 4 columnas mientras carga (CA-01.3). */
export function BoardSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Cargando tablero"
      className="flex h-full snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-1 lg:snap-none lg:overflow-visible"
    >
      {COLUMNS.map(({ status, title }) => (
        <div
          key={status}
          className="flex h-full min-w-[85%] snap-start flex-col gap-2 rounded-xl bg-muted/50 p-2 sm:min-w-[45%] lg:min-w-0 lg:flex-1"
        >
          <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
            {title}
          </div>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ))}
      <span className="sr-only">Cargando tablero…</span>
    </div>
  );
}
