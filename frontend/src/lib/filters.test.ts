import type { Priority, Task, TaskStatus } from "@/types/task";
import {
  applyFilters,
  columnCounts,
  EMPTY_FILTERS,
  hasActiveFilters,
  normalizeText,
  pruneLabels,
  visibleStatuses,
  type Filters,
} from "./filters";

function task(
  id: string,
  over: Partial<Task> & { status?: TaskStatus; priority?: Priority } = {},
): Task {
  return {
    id,
    title: id,
    description: null,
    status: "pendiente",
    priority: "media",
    dueDate: null,
    labels: [],
    position: 0,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    ...over,
  };
}
const f = (over: Partial<Filters>): Filters => ({ ...EMPTY_FILTERS, ...over });
const ids = (tasks: Task[]) => tasks.map((t) => t.id);

describe("normalizeText", () => {
  it("quita acentos y pasa a minúsculas", () => {
    expect(normalizeText("Acción ÁÉÍÓÚ ñandú")).toBe("accion aeiou nandu");
  });
});

describe("búsqueda (RN-11)", () => {
  const tasks = [
    task("a", { title: "Acción urgente" }),
    task("b", { title: "otra", description: "Revisar la ACCIÓN" }),
    task("c", { title: "nada", description: null }),
  ];
  it('"accion" encuentra "Acción" en título y en descripción', () => {
    expect(ids(applyFilters(tasks, f({ search: "accion" })))).toEqual([
      "a",
      "b",
    ]);
  });
  it("es por subcadena", () => {
    expect(ids(applyFilters(tasks, f({ search: "ccio" })))).toEqual(["a", "b"]);
  });
  it("tolera descripción nula", () => {
    expect(ids(applyFilters(tasks, f({ search: "nada" })))).toEqual(["c"]);
  });
  it("solo espacios equivale a sin búsqueda (CL-20)", () => {
    expect(applyFilters(tasks, f({ search: "   " }))).toHaveLength(3);
    expect(hasActiveFilters(f({ search: "   " }))).toBe(false);
  });
  it("el texto de búsqueda se recorta", () => {
    expect(ids(applyFilters(tasks, f({ search: "  accion  " })))).toEqual([
      "a",
      "b",
    ]);
  });
  it("sin resultados → lista vacía", () => {
    expect(applyFilters(tasks, f({ search: "zzz" }))).toEqual([]);
  });
});

describe("prioridad, estado y etiquetas (RN-12, D3)", () => {
  const tasks = [
    task("1", { priority: "alta", labels: ["Bug"], status: "pendiente" }),
    task("2", { priority: "media", labels: ["front"], status: "en_progreso" }),
    task("3", { priority: "baja", labels: ["bug", "front"], status: "hecho" }),
    task("4", { priority: "alta", labels: [], status: "hecho" }),
  ];
  it("prioridad [alta, media] es OR", () => {
    expect(
      ids(applyFilters(tasks, f({ priorities: ["alta", "media"] }))),
    ).toEqual(["1", "2", "4"]);
  });
  it("estado es OR", () => {
    expect(
      ids(applyFilters(tasks, f({ statuses: ["pendiente", "hecho"] }))),
    ).toEqual(["1", "3", "4"]);
  });
  it('etiqueta "BUG" encuentra "bug" y "Bug" (sin distinguir mayúsculas)', () => {
    expect(ids(applyFilters(tasks, f({ labels: ["BUG"] })))).toEqual([
      "1",
      "3",
    ]);
  });
  it("etiquetas es OR: al menos una", () => {
    expect(ids(applyFilters(tasks, f({ labels: ["bug", "front"] })))).toEqual([
      "1",
      "2",
      "3",
    ]);
  });
  it("etiqueta + prioridad es AND", () => {
    expect(
      ids(applyFilters(tasks, f({ labels: ["bug"], priorities: ["alta"] }))),
    ).toEqual(["1"]);
  });
  it("los cuatro tipos combinados son AND", () => {
    expect(
      ids(
        applyFilters(
          tasks,
          f({
            search: "3",
            labels: ["front"],
            priorities: ["baja"],
            statuses: ["hecho"],
          }),
        ),
      ),
    ).toEqual(["3"]);
    expect(
      applyFilters(tasks, f({ labels: ["front"], priorities: ["alta"] })),
    ).toEqual([]);
  });
  it("sin filtros devuelve todo y conserva el orden", () => {
    expect(ids(applyFilters(tasks, EMPTY_FILTERS))).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
  });
  it("no muta la entrada", () => {
    const copy = JSON.stringify(tasks);
    applyFilters(tasks, f({ priorities: ["alta"] }));
    expect(JSON.stringify(tasks)).toBe(copy);
  });
});

describe("hasActiveFilters", () => {
  it("false sin filtros; true con cualquiera", () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters(f({ search: "x" }))).toBe(true);
    expect(hasActiveFilters(f({ priorities: ["alta"] }))).toBe(true);
    expect(hasActiveFilters(f({ labels: ["x"] }))).toBe(true);
    expect(hasActiveFilters(f({ statuses: ["hecho"] }))).toBe(true);
  });
});

describe("visibleStatuses (D2)", () => {
  it("sin selección: las 4 columnas", () => {
    expect(visibleStatuses(EMPTY_FILTERS)).toEqual([
      "pendiente",
      "en_progreso",
      "en_revision",
      "hecho",
    ]);
  });
  it("con selección: solo esas, en el orden fijo", () => {
    expect(visibleStatuses(f({ statuses: ["hecho", "pendiente"] }))).toEqual([
      "pendiente",
      "hecho",
    ]);
  });
});

describe("pruneLabels (CA-08.8)", () => {
  it("quita etiquetas inexistentes", () => {
    expect(pruneLabels(f({ labels: ["a", "b"] }), ["a"]).labels).toEqual(["a"]);
  });
  it("compara sin distinguir mayúsculas", () => {
    expect(pruneLabels(f({ labels: ["Bug"] }), ["bug"]).labels).toEqual([
      "Bug",
    ]);
  });
  it("devuelve el mismo objeto si no hay cambios", () => {
    const filters = f({ labels: ["a"] });
    expect(pruneLabels(filters, ["a", "b"])).toBe(filters);
  });
  it("sin etiquetas disponibles las quita todas", () => {
    expect(pruneLabels(f({ labels: ["a"] }), []).labels).toEqual([]);
  });
});

describe("columnCounts (RN-13)", () => {
  it('cuenta visibles y total real por columna ("2 de 7")', () => {
    const all = [
      ...Array.from({ length: 7 }, (_, i) =>
        task(`p${i}`, { priority: i < 2 ? "alta" : "baja" }),
      ),
      task("h", { status: "hecho" }),
    ];
    const filtered = applyFilters(all, f({ priorities: ["alta"] }));
    const counts = columnCounts(all, filtered);
    expect(counts.pendiente).toEqual({ visible: 2, total: 7 });
    expect(counts.hecho).toEqual({ visible: 0, total: 1 });
    expect(counts.en_progreso).toEqual({ visible: 0, total: 0 });
  });
});
