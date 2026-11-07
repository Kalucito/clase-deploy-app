import { COLUMNS, STATUSES } from "./constants";

describe("constants", () => {
  it("define las 4 columnas fijas en el orden de RN-01", () => {
    expect(COLUMNS.map((c) => c.status)).toEqual([
      "pendiente",
      "en_progreso",
      "en_revision",
      "hecho",
    ]);
    expect(COLUMNS.map((c) => c.title)).toEqual([
      "Pendiente",
      "En progreso",
      "En revisión",
      "Hecho",
    ]);
    expect(STATUSES).toHaveLength(4);
  });
});
