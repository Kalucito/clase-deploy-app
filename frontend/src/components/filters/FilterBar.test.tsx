import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { afterEach, beforeEach, vi } from "vitest";
import { useFilters } from "@/hooks/useFilters";
import type { Filters } from "@/lib/filters";
import { FilterBar } from "./FilterBar";

let latest: Filters;

function Harness({ labels = ["bug", "front"] }: { labels?: string[] }) {
  const f = useFilters();
  useEffect(() => {
    latest = f.filters;
  });
  return (
    <FilterBar
      filters={f.filters}
      availableLabels={labels}
      clearCount={f.clearCount}
      onSearchChange={f.setSearch}
      onPrioritiesChange={f.setPriorities}
      onLabelsChange={f.setLabels}
      onStatusesChange={f.setStatuses}
      onClear={f.clear}
    />
  );
}

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

const setup = () => ({
  user: userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) }),
});

describe("FilterBar", () => {
  it("la búsqueda se aplica tras el debounce, no por tecla (CA-08.1)", async () => {
    const { user } = setup();
    render(<Harness />);
    const input = screen.getByRole("searchbox", { name: "Buscar tareas" });
    await user.type(input, "acc");
    expect(latest.search).toBe("");
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(latest.search).toBe("acc");
  });

  it("seguir escribiendo reinicia la espera", async () => {
    const { user } = setup();
    render(<Harness />);
    const input = screen.getByRole("searchbox");
    await user.type(input, "a");
    act(() => {
      vi.advanceTimersByTime(200);
    });
    await user.type(input, "b");
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(latest.search).toBe("");
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(latest.search).toBe("ab");
  });

  it("filtro de prioridad con selección múltiple (CA-08.2)", async () => {
    const { user } = setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Prioridad" }));
    await user.click(await screen.findByRole("checkbox", { name: "Alta" }));
    await user.click(screen.getByRole("checkbox", { name: "Media" }));
    expect(latest.priorities).toEqual(["alta", "media"]);
    await user.click(screen.getByRole("checkbox", { name: "Alta" }));
    expect(latest.priorities).toEqual(["media"]);
  });

  it("filtro de etiquetas usa las etiquetas existentes (CA-08.3)", async () => {
    const { user } = setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Etiqueta" }));
    expect(
      await screen.findByRole("checkbox", { name: "bug" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "front" }));
    expect(latest.labels).toEqual(["front"]);
  });

  it("sin etiquetas muestra el mensaje vacío", async () => {
    const { user } = setup();
    render(<Harness labels={[]} />);
    await user.click(screen.getByRole("button", { name: "Etiqueta" }));
    expect(
      await screen.findByText("Todavía no hay etiquetas"),
    ).toBeInTheDocument();
  });

  it("filtro de estado con las 4 columnas (CA-08.4)", async () => {
    const { user } = setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Estado" }));
    for (const name of ["Pendiente", "En progreso", "En revisión", "Hecho"]) {
      expect(await screen.findByRole("checkbox", { name })).toBeInTheDocument();
    }
    await user.click(screen.getByRole("checkbox", { name: "Hecho" }));
    expect(latest.statuses).toEqual(["hecho"]);
  });

  it('"Limpiar filtros" solo aparece con filtros activos y restablece todo (CA-08.6)', async () => {
    const { user } = setup();
    render(<Harness />);
    expect(
      screen.queryByRole("button", { name: "Limpiar filtros" }),
    ).not.toBeInTheDocument();

    await user.type(screen.getByRole("searchbox"), "x");
    act(() => {
      vi.advanceTimersByTime(300);
    });
    await user.click(screen.getByRole("button", { name: "Prioridad" }));
    await user.click(await screen.findByRole("checkbox", { name: "Alta" }));
    await user.keyboard("{Escape}");

    await user.click(
      await screen.findByRole("button", { name: "Limpiar filtros" }),
    );
    expect(latest).toEqual({
      search: "",
      priorities: [],
      labels: [],
      statuses: [],
    });
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(
      screen.queryByRole("button", { name: "Limpiar filtros" }),
    ).not.toBeInTheDocument();
  });

  it("un texto de solo espacios no cuenta como filtro activo (CL-20)", async () => {
    const { user } = setup();
    render(<Harness />);
    await user.type(screen.getByRole("searchbox"), "   ");
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(
      screen.queryByRole("button", { name: "Limpiar filtros" }),
    ).not.toBeInTheDocument();
  });
});
