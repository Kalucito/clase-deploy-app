import { render, screen } from "@testing-library/react";
import NotFound from "./not-found";

describe("not-found", () => {
  it("muestra el mensaje en español y un enlace al tablero", () => {
    render(<NotFound />);
    expect(
      screen.getByRole("heading", { name: "Página no encontrada" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver al tablero" })).toHaveAttribute("href", "/");
  });
});
