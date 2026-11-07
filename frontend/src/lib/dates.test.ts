import { formatDueDate, isOverdue, todayLocal } from "./dates";

const TODAY = "2026-11-07";

describe("todayLocal", () => {
  it("usa la fecha local, no la UTC", () => {
    // 23:30 del 7/11 en hora local aunque en UTC ya sea el 8.
    expect(todayLocal(new Date(2026, 10, 7, 23, 30))).toBe("2026-11-07");
    expect(todayLocal(new Date(2026, 0, 5, 0, 5))).toBe("2026-01-05");
  });
});

describe("isOverdue (D4, RN-15)", () => {
  it("ayer → vencida (CA-09.1)", () => {
    expect(
      isOverdue({ dueDate: "2026-11-06", status: "pendiente" }, TODAY),
    ).toBe(true);
  });
  it("hoy → no vencida (CA-09.2, CL-08)", () => {
    expect(isOverdue({ dueDate: TODAY, status: "pendiente" }, TODAY)).toBe(
      false,
    );
  });
  it("mañana → no vencida", () => {
    expect(
      isOverdue({ dueDate: "2026-11-08", status: "en_progreso" }, TODAY),
    ).toBe(false);
  });
  it("sin fecha → no vencida", () => {
    expect(isOverdue({ dueDate: null, status: "pendiente" }, TODAY)).toBe(
      false,
    );
  });
  it("en hecho nunca está vencida (CA-09.3, CL-10)", () => {
    expect(isOverdue({ dueDate: "2020-01-01", status: "hecho" }, TODAY)).toBe(
      false,
    );
  });
  it("si vuelve a otra columna y la fecha pasó, se marca vencida", () => {
    expect(
      isOverdue({ dueDate: "2020-01-01", status: "en_revision" }, TODAY),
    ).toBe(true);
  });
  it("compara cruzando mes y año", () => {
    expect(
      isOverdue({ dueDate: "2025-12-31", status: "pendiente" }, "2026-01-01"),
    ).toBe(true);
    expect(
      isOverdue({ dueDate: "2026-01-01", status: "pendiente" }, "2025-12-31"),
    ).toBe(false);
  });
});

describe("formatDueDate", () => {
  it("no tiene desfase de zona horaria", () => {
    expect(formatDueDate("2026-11-20")).toMatch(/20/);
    expect(formatDueDate("2026-01-01")).toMatch(/1/);
    expect(formatDueDate("2026-01-01")).toMatch(/2026/);
  });
});
