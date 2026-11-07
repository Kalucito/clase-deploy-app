import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, vi } from "vitest";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { getTask, updateTask } from "@/lib/api/tasks";
import { makeTestClient, wrapperFor } from "@/test-utils";
import type { Task } from "@/types/task";
import { TaskDialog } from "./TaskDialog";

vi.mock("@/lib/api/tasks", () => ({
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  getTask: vi.fn(),
  listTasks: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/api/labels", () => ({
  listLabels: vi.fn().mockResolvedValue([]),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const updateMock = vi.mocked(updateTask);
const getMock = vi.mocked(getTask);

const task: Task = {
  id: "t1",
  title: "Preparar demo",
  description: "Detalle",
  status: "pendiente",
  priority: "alta",
  dueDate: "2026-12-01",
  labels: ["front", "demo"],
  position: 2,
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-05T15:30:00.000Z",
};

beforeEach(() => {
  updateMock.mockReset();
  getMock.mockReset();
  getMock.mockResolvedValue(task);
  vi.mocked(toast.error).mockReset();
});

function setup() {
  const onClose = vi.fn();
  render(<TaskDialog state={{ mode: "edit", task }} onClose={onClose} />, {
    wrapper: wrapperFor(makeTestClient()),
  });
  return { onClose, user: userEvent.setup() };
}
const save = () => screen.getByRole("button", { name: /Guardar|Guardando/ });

describe("TaskDialog — editar", () => {
  it("muestra los datos actuales y las fechas de creación y modificación (CA-03.1)", () => {
    setup();
    expect(
      screen.getByRole("dialog", { name: "Editar tarea" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Título")).toHaveValue("Preparar demo");
    expect(screen.getByLabelText("Descripción")).toHaveValue("Detalle");
    expect(screen.getByLabelText("Estado")).toHaveValue("pendiente");
    expect(screen.getByLabelText("Prioridad")).toHaveValue("alta");
    expect(screen.getByLabelText("Vencimiento")).toHaveValue("2026-12-01");
    expect(screen.getByText("front")).toBeInTheDocument();
    expect(screen.getByText("demo")).toBeInTheDocument();
    expect(screen.getByText(/Creada:/)).toBeInTheDocument();
    expect(screen.getByText(/Última modificación:/)).toBeInTheDocument();
  });

  it("envía solo lo que cambió y cierra (CA-04.1, CA-04.3)", async () => {
    updateMock.mockResolvedValue({ ...task, title: "Nuevo" });
    const { user, onClose } = setup();
    const title = screen.getByLabelText("Título");
    await user.clear(title);
    await user.type(title, "Nuevo");
    await user.click(save());
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(updateMock).toHaveBeenCalledExactlyOnceWith("t1", {
      title: "Nuevo",
    });
  });

  it("quitar vencimiento y descripción envía null (CA-04.4)", async () => {
    updateMock.mockResolvedValue(task);
    const { user, onClose } = setup();
    await user.clear(screen.getByLabelText("Descripción"));
    await user.clear(screen.getByLabelText("Vencimiento"));
    await user.click(save());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(updateMock).toHaveBeenCalledWith("t1", {
      description: null,
      dueDate: null,
    });
  });

  it("cambiar el estado envía status (el backend lo deja al final, CA-04.6)", async () => {
    updateMock.mockResolvedValue({ ...task, status: "hecho" });
    const { user, onClose } = setup();
    await user.selectOptions(screen.getByLabelText("Estado"), "hecho");
    await user.click(save());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(updateMock).toHaveBeenCalledWith("t1", { status: "hecho" });
  });

  it("aplican las mismas validaciones que al crear (CA-04.2)", async () => {
    const { user } = setup();
    await user.clear(screen.getByLabelText("Título"));
    await user.click(save());
    expect(
      await screen.findByText("El título es obligatorio"),
    ).toBeInTheDocument();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("sin cambios, guardar cierra sin llamar al servidor", async () => {
    const { user, onClose } = setup();
    await user.click(save());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("404 al guardar: avisa, cierra y refresca (CA-04.5, CL-12)", async () => {
    updateMock.mockImplementation(() =>
      Promise.reject(new ApiError(404, "La tarea no existe")),
    );
    const { user, onClose } = setup();
    await user.type(screen.getByLabelText("Título"), "!");
    await user.click(save());
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(toast.error).toHaveBeenCalledWith("La tarea ya no existe");
  });

  it("404 al abrir: avisa y cierra (CA-03.2)", async () => {
    getMock.mockImplementation(() =>
      Promise.reject(new ApiError(404, "La tarea no existe")),
    );
    const { onClose } = setup();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(toast.error).toHaveBeenCalledWith("La tarea ya no existe");
  });

  it("otro error al guardar deja el modal abierto con el mensaje", async () => {
    updateMock.mockImplementation(() =>
      Promise.reject(new ApiError(0, "No se pudo conectar con el servidor")),
    );
    const { user, onClose } = setup();
    await user.type(screen.getByLabelText("Título"), "!");
    await user.click(save());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo conectar con el servidor",
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Título")).toHaveValue("Preparar demo!");
  });
});
