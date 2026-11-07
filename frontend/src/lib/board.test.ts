import type { Task, TaskStatus } from "@/types/task";
import { applyMove, groupByStatus } from "./board";
import { STATUSES } from "./constants";

function task(title: string, status: TaskStatus, position: number): Task {
  return {
    id: title,
    title,
    description: null,
    status,
    priority: "media",
    dueDate: null,
    labels: [],
    position,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const column = (status: TaskStatus, n: number, prefix: string): Task[] =>
  Array.from({ length: n }, (_, i) => task(`${prefix}${i}`, status, i));

const titles = (tasks: Task[], status: TaskStatus) =>
  groupByStatus(tasks)[status].map((t) => t.title);

function expectContiguous(tasks: Task[]) {
  const groups = groupByStatus(tasks);
  for (const s of STATUSES) {
    expect(groups[s].map((t) => t.position)).toEqual(
      groups[s].map((_, i) => i),
    );
  }
}

describe("groupByStatus", () => {
  it("agrupa por estado y ordena por position", () => {
    const g = groupByStatus([
      task("b", "hecho", 1),
      task("a", "hecho", 0),
      task("x", "pendiente", 0),
    ]);
    expect(g.hecho.map((t) => t.title)).toEqual(["a", "b"]);
    expect(g.pendiente).toHaveLength(1);
    expect(g.en_progreso).toEqual([]);
    expect(Object.keys(g)).toEqual([...STATUSES]);
  });
});

describe("applyMove — misma columna (casos de T-16)", () => {
  const pairs: [number, number][] = [];
  for (let a = 0; a < 5; a++) for (let b = 0; b < 5; b++) pairs.push([a, b]);

  it.each(pairs)("posición %i → %i", (a, b) => {
    const tasks = [
      ...column("en_progreso", 5, "t"),
      ...column("hecho", 2, "h"),
    ];
    const expected = tasks
      .filter((t) => t.status === "en_progreso")
      .map((t) => t.title);
    const [moved] = expected.splice(a, 1);
    expected.splice(b, 0, moved);

    const result = applyMove(tasks, `t${a}`, "en_progreso", b);
    expect(titles(result, "en_progreso")).toEqual(expected);
    expect(titles(result, "hecho")).toEqual(["h0", "h1"]);
    expectContiguous(result);
  });
});

describe("applyMove — entre columnas", () => {
  const cross: [number, number][] = [];
  for (let a = 0; a < 5; a++) for (let b = 0; b <= 3; b++) cross.push([a, b]);

  it.each(cross)("origen %i → destino %i", (a, b) => {
    const tasks = [
      ...column("pendiente", 5, "s"),
      ...column("en_revision", 3, "d"),
    ];
    const src = tasks
      .filter((t) => t.status === "pendiente")
      .map((t) => t.title);
    const [moved] = src.splice(a, 1);
    const dst = ["d0", "d1", "d2"];
    dst.splice(b, 0, moved);

    const result = applyMove(tasks, `s${a}`, "en_revision", b);
    expect(titles(result, "pendiente")).toEqual(src);
    expect(titles(result, "en_revision")).toEqual(dst);
    expect(result.find((t) => t.id === `s${a}`)?.status).toBe("en_revision");
    expectContiguous(result);
  });

  it("a una columna vacía", () => {
    const tasks = column("pendiente", 2, "s");
    const result = applyMove(tasks, "s0", "hecho", 0);
    expect(titles(result, "hecho")).toEqual(["s0"]);
    expect(titles(result, "pendiente")).toEqual(["s1"]);
    expectContiguous(result);
  });

  it("no toca las columnas no involucradas (misma referencia)", () => {
    const tasks = [...column("pendiente", 2, "s"), ...column("hecho", 2, "h")];
    const result = applyMove(tasks, "s0", "en_progreso", 0);
    for (const id of ["h0", "h1"]) {
      expect(result.find((t) => t.id === id)).toBe(
        tasks.find((t) => t.id === id),
      );
    }
  });
});

describe("applyMove — límites y no-ops", () => {
  it("posición fuera de rango se acota al final (CL-14)", () => {
    const tasks = [...column("pendiente", 3, "s"), ...column("hecho", 2, "h")];
    const same = applyMove(tasks, "s0", "pendiente", 999);
    expect(titles(same, "pendiente")).toEqual(["s1", "s2", "s0"]);
    const cross = applyMove(tasks, "s1", "hecho", 999);
    expect(titles(cross, "hecho")).toEqual(["h0", "h1", "s1"]);
    expectContiguous(cross);
  });

  it("posición negativa se acota a 0", () => {
    const tasks = column("pendiente", 3, "s");
    expect(
      titles(applyMove(tasks, "s2", "pendiente", -5), "pendiente"),
    ).toEqual(["s2", "s0", "s1"]);
  });

  it("misma posición y estado devuelve la misma lista", () => {
    const tasks = column("pendiente", 3, "s");
    expect(applyMove(tasks, "s1", "pendiente", 1)).toBe(tasks);
    expect(applyMove(tasks, "s2", "pendiente", 50)).toBe(tasks);
  });

  it("id inexistente devuelve la misma lista", () => {
    const tasks = column("pendiente", 2, "s");
    expect(applyMove(tasks, "zzz", "hecho", 0)).toBe(tasks);
  });

  it("no muta la entrada", () => {
    const tasks = column("pendiente", 3, "s");
    const snapshot = JSON.stringify(tasks);
    applyMove(tasks, "s0", "hecho", 0);
    expect(JSON.stringify(tasks)).toBe(snapshot);
  });

  it("tolera una lista con tareas desordenadas", () => {
    const tasks = [task("b", "pendiente", 1), task("a", "pendiente", 0)];
    expect(titles(applyMove(tasks, "b", "pendiente", 0), "pendiente")).toEqual([
      "b",
      "a",
    ]);
  });
});
