import type { ReactNode } from "react";

/**
 * Estructura de la pantalla: cabecera (nombre, filtros, acción principal) y
 * tablero ocupando el resto del alto. Solo el tablero scrollea horizontalmente.
 */
export function AppShell({
  filters,
  actions,
  children,
}: {
  filters?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b bg-background px-4 py-3 sm:px-6">
        <h1 className="text-lg font-semibold tracking-tight">TaskFlow</h1>
        <div className="order-last w-full min-w-0 sm:order-none sm:w-auto sm:flex-1">
          {filters}
        </div>
        <div className="ml-auto sm:ml-0">{actions}</div>
      </header>
      <main className="min-h-0 flex-1 px-4 py-4 sm:px-6">{children}</main>
    </div>
  );
}
