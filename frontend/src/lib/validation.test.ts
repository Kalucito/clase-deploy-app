import type { Task } from "@/types/task";
import {
  emptyFormValues,
  taskFormSchema,
  toCreateInput,
  toUpdateInput,
  valuesFromTask,
} from "./validation";

const valid = { ...emptyFormValues, title: "Hola" };
const errorsFor = (input: unknown) => {
  const r = taskFormSchema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => i.path.join("."));
};

describe("taskFormSchema", () => {
  it("acepta un formulario mínimo con defaults", () => {
    expect(taskFormSchema.safeParse(valid).success).toBe(true);
  });

  it("título: 1, 100 válido; 101, vacío y solo espacios inválido (CL-01..03)", () => {
    expect(errorsFor({ ...valid, title: "a" })).toEqual([]);
    expect(errorsFor({ ...valid, title: "a".repeat(100) })).toEqual([]);
    expect(errorsFor({ ...valid, title: "a".repeat(101) })).toContain("title");
    expect(errorsFor({ ...valid, title: "" })).toContain("title");
    expect(errorsFor({ ...valid, title: "     " })).toContain("title");
  });

  it("el título se evalúa con trim", () => {
    expect(errorsFor({ ...valid, title: ` ${"a".repeat(100)} ` })).toEqual([]);
  });

  it("descripción: 1000 válida, 1001 inválida (CL-01/02)", () => {
    expect(errorsFor({ ...valid, description: "a".repeat(1000) })).toEqual([]);
    expect(errorsFor({ ...valid, description: "a".repeat(1001) })).toContain(
      "description",
    );
  });

  it("etiquetas: 10 válidas, 11 inválidas (CL-06)", () => {
    const mk = (n: number) => Array.from({ length: n }, (_, i) => `t${i}`);
    expect(errorsFor({ ...valid, labels: mk(10) })).toEqual([]);
    expect(errorsFor({ ...valid, labels: mk(11) })).toContain("labels");
  });

  it("etiqueta: 20 válida, 21 inválida, vacía inválida (CL-06)", () => {
    expect(errorsFor({ ...valid, labels: ["a".repeat(20)] })).toEqual([]);
    expect(errorsFor({ ...valid, labels: ["a".repeat(21)] })).toContain(
      "labels.0",
    );
    expect(errorsFor({ ...valid, labels: ["  "] })).toContain("labels.0");
  });

  it('"Bug" y "bug" no pueden coexistir (CL-05)', () => {
    expect(errorsFor({ ...valid, labels: ["Bug", "bug"] })).toContain("labels");
    expect(errorsFor({ ...valid, labels: ["Bug", "Fix"] })).toEqual([]);
  });

  it("estado y prioridad inválidos (CL-15)", () => {
    expect(errorsFor({ ...valid, status: "otro" })).toContain("status");
    expect(errorsFor({ ...valid, priority: "urgente" })).toContain("priority");
  });

  it("fecha: vacía y válidas OK; inexistente o mal formada inválida (CL-16)", () => {
    expect(errorsFor({ ...valid, dueDate: "" })).toEqual([]);
    expect(errorsFor({ ...valid, dueDate: "2028-02-29" })).toEqual([]);
    expect(errorsFor({ ...valid, dueDate: "2026-02-31" })).toContain("dueDate");
    expect(errorsFor({ ...valid, dueDate: "20-11-2026" })).toContain("dueDate");
  });
});

describe("conversión a payloads", () => {
  const original: Task = {
    id: "1",
    title: "Orig",
    description: "desc",
    status: "pendiente",
    priority: "media",
    dueDate: "2026-12-01",
    labels: ["a", "b"],
    position: 0,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
  };

  it("toCreateInput: vacíos → null y con trim", () => {
    expect(
      toCreateInput({ ...valid, title: "  Hola  ", labels: [" x "] }),
    ).toEqual({
      title: "Hola",
      description: null,
      status: "pendiente",
      priority: "media",
      dueDate: null,
      labels: ["x"],
    });
  });

  it("toUpdateInput: sin cambios → parche vacío", () => {
    expect(toUpdateInput(valuesFromTask(original), original)).toEqual({});
  });

  it("toUpdateInput: solo los campos modificados; null vacía descripción y fecha", () => {
    const values = {
      ...valuesFromTask(original),
      title: "Nuevo",
      description: "",
      dueDate: "",
      status: "hecho" as const,
    };
    expect(toUpdateInput(values, original)).toEqual({
      title: "Nuevo",
      description: null,
      dueDate: null,
      status: "hecho",
    });
  });

  it("toUpdateInput: etiquetas en otro orden no cuentan como cambio", () => {
    expect(
      toUpdateInput(
        { ...valuesFromTask(original), labels: ["b", "a"] },
        original,
      ),
    ).toEqual({});
    expect(
      toUpdateInput({ ...valuesFromTask(original), labels: ["a"] }, original),
    ).toEqual({ labels: ["a"] });
  });
});
