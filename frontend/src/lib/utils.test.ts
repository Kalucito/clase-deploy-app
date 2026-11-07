import { cn } from "./utils";

describe("cn", () => {
  it("une clases y resuelve conflictos de Tailwind", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("a", false && "b", "c")).toBe("a c");
  });
});
