import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { createTask } from "@/lib/api/tasks";
import { makeTestClient, wrapperFor } from "@/test-utils";
import type { Task } from "@/types/task";
import { TaskDialog } from "./TaskDialog";

vi.mock("@/lib/api/tasks", () => ({
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  listTasks: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/api/labels", () => ({
  listLabels: vi.fn().mockResolvedValue([]),
}));
const createMock = vi.mocked(createTask);

const created: Task = {
  id: "new",
  title: "Nueva",
  description: null,
  status: "pendiente",
  priority: "media",
  dueDate: null,
  labels: [],
  position: 0,
  createdAt: "2026-11-07T10:00:00.000Z",
  updatedAt: "2026-11-07T10:00:00.000Z",
};

function setup() {
  const onClose = vi.fn();
  const onCreated = vi.fn();
  render(
    <TaskDialog
      state={{ mode: "create" }}
      onClose={onClose}
      onCreated={onCreated}
    />,
    {
      wrapper: wrapperFor(makeTestClient()),
    },
  );
  return { onClose, onCreated, user: userEvent.setup() };
}

const title = () => screen.getByLabelText("Título");
const save = () => screen.getByRole("button", { name: /Guardar|Guardando/ });

beforeEach(() => {
  createMock.mockReset();
});

describe("TaskDialog — crear", () => {
  it("muestra todos los campos con sus valores por defecto (CA-02.1)", () => {
    setup();
    expect(
      screen.getByRole("dialog", { name: "Nueva tarea" }),
    ).toBeInTheDocument();
    expect(title()).toHaveValue("");
    expect(screen.getByLabelText("Descripción")).toBeInTheDocument();
    expect(screen.getByLabelText("Estado")).toHaveValue("pendiente");
    expect(screen.getByLabelText("Prioridad")).toHaveValue("media");
    expect(screen.getByLabelText("Vencimiento")).toHaveValue("");
    expect(screen.getByLabelText("Etiquetas")).toBeInTheDocument();
  });

  it("sin título no guarda y muestra el error junto al campo (CA-02.2)", async () => {
    const { user, onClose } = setup();
    await user.click(save());
    expect(
      await screen.findByText("El título es obligatorio"),
    ).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("título solo con espacios es inválido (CL-03)", async () => {
    const { user } = setup();
    await user.type(title(), "     ");
    await user.click(save());
    expect(
      await screen.findByText("El título es obligatorio"),
    ).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("título de 101 y descripción de 1001 se bloquean y hay contadores (CA-02.3)", async () => {
    const { user } = setup();
    expect(screen.getByText("0/100")).toBeInTheDocument();
    expect(screen.getByText("0/1000")).toBeInTheDocument();
    await user.click(title());
    await user.paste("a".repeat(101));
    await user.click(screen.getByLabelText("Descripción"));
    await user.paste("b".repeat(1001));
    expect(screen.getByText("101/100")).toBeInTheDocument();
    expect(screen.getByText("1001/1000")).toBeInTheDocument();
    await user.click(save());
    expect(
      await screen.findByText(/El título no puede superar los 100/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/La descripción no puede superar los 1000/),
    ).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("guarda con éxito: envía el payload, avisa y cierra (CA-02.4)", async () => {
    createMock.mockResolvedValue(created);
    const { user, onClose, onCreated } = setup();
    await user.type(title(), "  Nueva  ");
    await user.selectOptions(screen.getByLabelText("Estado"), "en_progreso");
    await user.selectOptions(screen.getByLabelText("Prioridad"), "alta");
    await user.type(screen.getByLabelText("Vencimiento"), "2026-12-01");
    await user.type(screen.getByLabelText("Etiquetas"), "demo{Enter}");
    await user.click(save());

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(createMock).toHaveBeenCalledExactlyOnceWith({
      title: "Nueva",
      description: null,
      status: "en_progreso",
      priority: "alta",
      dueDate: "2026-12-01",
      labels: ["demo"],
    });
    expect(onCreated).toHaveBeenCalledWith(created);
  });

  it("doble clic en Guardar crea una sola tarea y deshabilita el botón (CA-02.6, CL-18)", async () => {
    let resolve!: (t: Task) => void;
    createMock.mockReturnValue(new Promise((r) => (resolve = r)));
    const { user, onClose } = setup();
    await user.type(title(), "Nueva");
    await user.dblClick(save());
    await waitFor(() => expect(save()).toBeDisabled());
    expect(createMock).toHaveBeenCalledTimes(1);
    resolve(created);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("error 400 del servidor se mapea al campo (RN-09)", async () => {
    createMock.mockImplementation(() =>
      Promise.reject(
        new ApiError(400, "Los datos enviados no son válidos", [
          {
            field: "title",
            message: "El título no puede superar los 100 caracteres",
          },
        ]),
      ),
    );
    const { user, onClose } = setup();
    await user.type(title(), "Algo");
    await user.click(save());
    expect(
      await screen.findByText("El título no puede superar los 100 caracteres"),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(save()).toBeEnabled();
  });

  it("si el guardado falla, el modal sigue abierto con los datos y el mensaje (CA-02.5)", async () => {
    createMock.mockImplementation(() =>
      Promise.reject(new ApiError(0, "No se pudo conectar con el servidor")),
    );
    const { user, onClose } = setup();
    await user.type(title(), "Mi tarea");
    await user.type(screen.getByLabelText("Etiquetas"), "x{Enter}");
    await user.click(save());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo conectar con el servidor",
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(title()).toHaveValue("Mi tarea");
    expect(screen.getByText("x")).toBeInTheDocument();
    expect(save()).toBeEnabled();
  });
});

describe("TaskDialog — descartar (CL-22, CA-11.3)", () => {
  it("sin cambios, Cancelar cierra directo", async () => {
    const { user, onClose } = setup();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText("¿Descartar los cambios?"),
    ).not.toBeInTheDocument();
  });

  it("con cambios pide confirmación; 'Seguir editando' conserva todo", async () => {
    const { user, onClose } = setup();
    await user.type(title(), "Algo");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    const confirm = await screen.findByRole("alertdialog");
    expect(
      within(confirm).getByText("¿Descartar los cambios?"),
    ).toBeInTheDocument();
    await user.click(
      within(confirm).getByRole("button", { name: "Seguir editando" }),
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(title()).toHaveValue("Algo");
  });

  it("con cambios y confirmando 'Descartar' cierra", async () => {
    const { user, onClose } = setup();
    await user.type(title(), "Algo");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await user.click(await screen.findByRole("button", { name: "Descartar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("Esc con cambios pide confirmación; sin cambios cierra", async () => {
    const dirty = setup();
    await dirty.user.type(title(), "Algo");
    await dirty.user.keyboard("{Escape}");
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    expect(dirty.onClose).not.toHaveBeenCalled();
  });

  it("Esc sin cambios cierra", async () => {
    const clean = setup();
    await clean.user.keyboard("{Escape}");
    await waitFor(() => expect(clean.onClose).toHaveBeenCalledTimes(1));
  });
});
