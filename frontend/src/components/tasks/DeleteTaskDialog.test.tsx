import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { deleteTask } from "@/lib/api/tasks";
import { makeTestClient, wrapperFor } from "@/test-utils";
import type { Task } from "@/types/task";
import { DeleteTaskDialog } from "./DeleteTaskDialog";
import { TaskDialog } from "./TaskDialog";

vi.mock("@/lib/api/tasks", () => ({
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  getTask: vi.fn().mockResolvedValue({}),
  listTasks: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/api/labels", () => ({
  listLabels: vi.fn().mockResolvedValue([]),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
const deleteMock = vi.mocked(deleteTask);

const task: Task = {
  id: "t1",
  title: "Mi tarea importante",
  description: null,
  status: "pendiente",
  priority: "media",
  dueDate: null,
  labels: [],
  position: 0,
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
};

beforeEach(() => {
  deleteMock.mockReset();
});

function setup() {
  const onDeleted = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <DeleteTaskDialog
      task={task}
      open
      onOpenChange={onOpenChange}
      onDeleted={onDeleted}
    />,
    {
      wrapper: wrapperFor(makeTestClient()),
    },
  );
  return { onDeleted, onOpenChange, user: userEvent.setup() };
}
const confirmBtn = () =>
  screen.getByRole("button", { name: /^Elimina(r|ndo)/ });

describe("DeleteTaskDialog", () => {
  it("la confirmación nombra la tarea (CA-05.1)", () => {
    setup();
    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "Mi tarea importante",
    );
    expect(screen.getByRole("alertdialog")).toHaveTextContent("definitiva");
  });

  it("cancelar no borra nada (CA-05.2)", async () => {
    const { user, onOpenChange, onDeleted } = setup();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(deleteMock).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it("confirmar borra y avisa (CA-05.3)", async () => {
    deleteMock.mockResolvedValue(undefined);
    const { user, onDeleted } = setup();
    await user.click(confirmBtn());
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(deleteMock).toHaveBeenCalledExactlyOnceWith("t1");
  });

  it("doble clic produce una sola operación (CL-18)", async () => {
    let resolve!: () => void;
    deleteMock.mockReturnValue(new Promise<void>((r) => (resolve = r)));
    const { user, onDeleted } = setup();
    await user.dblClick(confirmBtn());
    await waitFor(() => expect(confirmBtn()).toBeDisabled());
    expect(deleteMock).toHaveBeenCalledTimes(1);
    resolve();
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(deleteMock).toHaveBeenCalledTimes(1);
  });

  it("404 se trata como éxito idempotente (CA-05.5)", async () => {
    deleteMock.mockImplementation(() =>
      Promise.reject(new ApiError(404, "La tarea no existe")),
    );
    const { user, onDeleted } = setup();
    await user.click(confirmBtn());
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
  });

  it("si falla, la tarea permanece y se muestra el error (CA-05.4)", async () => {
    deleteMock.mockImplementation(() =>
      Promise.reject(new ApiError(0, "No se pudo conectar con el servidor")),
    );
    const { user, onDeleted } = setup();
    await user.click(confirmBtn());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La tarea no se eliminó",
    );
    expect(onDeleted).not.toHaveBeenCalled();
    expect(confirmBtn()).toBeEnabled();
  });
});

describe("Eliminar desde el modal de edición", () => {
  it("el botón Eliminar abre la confirmación y, al confirmar, cierra el modal", async () => {
    deleteMock.mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<TaskDialog state={{ mode: "edit", task }} onClose={onClose} />, {
      wrapper: wrapperFor(makeTestClient()),
    });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Eliminar" }));
    const confirm = await screen.findByRole("alertdialog");
    expect(confirm).toHaveTextContent("Mi tarea importante");
    await user.click(
      screen.getAllByRole("button", { name: "Eliminar" }).at(-1)!,
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(deleteMock).toHaveBeenCalledWith("t1");
  });

  it("no hay botón Eliminar al crear", () => {
    render(<TaskDialog state={{ mode: "create" }} onClose={() => {}} />, {
      wrapper: wrapperFor(makeTestClient()),
    });
    expect(
      screen.queryByRole("button", { name: "Eliminar" }),
    ).not.toBeInTheDocument();
  });
});
