import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { vi } from "vitest";
import { TagInput } from "./TagInput";

function Harness({
  initial = [],
  onChange = () => {},
}: {
  initial?: string[];
  onChange?: (l: string[]) => void;
}) {
  const [labels, setLabels] = useState(initial);
  return (
    <TagInput
      value={labels}
      onChange={(l) => {
        setLabels(l);
        onChange(l);
      }}
    />
  );
}
const input = () => screen.getByRole("textbox");

describe("TagInput", () => {
  it("agrega con Enter y con coma, con trim", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.type(input(), "  demo  {Enter}");
    await userEvent.type(input(), "front,");
    expect(onChange).toHaveBeenLastCalledWith(["demo", "front"]);
    expect(screen.getByText("demo")).toBeInTheDocument();
    expect(input()).toHaveValue("");
  });

  it("ignora entradas vacías", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.type(input(), "   {Enter}");
    expect(onChange).not.toHaveBeenCalled();
  });

  it('rechaza duplicados sin distinguir mayúsculas ("Bug" / "bug") (CL-05)', async () => {
    render(<Harness initial={["Bug"]} />);
    await userEvent.type(input(), "bug{Enter}");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText(/ya está agregada/)).toBeInTheDocument();
  });

  it("limita a 10 etiquetas", async () => {
    const ten = Array.from({ length: 10 }, (_, i) => `t${i}`);
    render(<Harness initial={ten} />);
    expect(input()).toBeDisabled();
    expect(screen.getByText(/10\/10 etiquetas/)).toBeInTheDocument();
  });

  it("la 11.ª se rechaza con mensaje al llegar al límite", async () => {
    const nine = Array.from({ length: 9 }, (_, i) => `t${i}`);
    render(<Harness initial={nine} />);
    await userEvent.type(input(), "ultima{Enter}");
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
    expect(input()).toBeDisabled();
  });

  it("limita cada etiqueta a 20 caracteres", async () => {
    render(<Harness />);
    expect(input()).toHaveAttribute("maxlength", "20");
    await userEvent.type(input(), "x".repeat(30));
    expect(input()).toHaveValue("x".repeat(20));
  });

  it("elimina con el botón de la etiqueta y con Backspace", async () => {
    render(<Harness initial={["a", "b", "c"]} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Quitar etiqueta b" }),
    );
    expect(screen.queryByText("b")).not.toBeInTheDocument();
    await userEvent.type(input(), "{Backspace}");
    expect(screen.queryByText("c")).not.toBeInTheDocument();
    expect(screen.getByText("a")).toBeInTheDocument();
  });

  it("agrega el texto pendiente al salir del campo", async () => {
    render(<Harness />);
    await userEvent.type(input(), "pendiente");
    await userEvent.tab();
    expect(screen.getByText("pendiente")).toBeInTheDocument();
  });

  it("es operable solo con teclado: los botones de quitar son tabulables", async () => {
    render(<Harness initial={["a"]} />);
    await userEvent.tab();
    expect(
      screen.getByRole("button", { name: "Quitar etiqueta a" }),
    ).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(screen.queryByText("a")).not.toBeInTheDocument();
  });
});
