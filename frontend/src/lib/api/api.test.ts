import { afterEach, beforeEach, vi } from "vitest";
import { ApiError, NETWORK_ERROR_MESSAGE } from "./client";
import { listLabels } from "./labels";
import {
  createTask,
  deleteTask,
  getTask,
  listTasks,
  moveTask,
  updateTask,
} from "./tasks";

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_API_URL = "http://api.test";
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

const lastCall = () => {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
  return { url, init };
};

describe("rutas y métodos (plan §6.2)", () => {
  it("listTasks → GET /api/tasks", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    expect(await listTasks()).toEqual([]);
    expect(lastCall().url).toBe("http://api.test/api/tasks");
    expect(lastCall().init.method).toBe("GET");
  });

  it("getTask → GET /api/tasks/:id", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: "1" }));
    await getTask("1");
    expect(lastCall().url).toBe("http://api.test/api/tasks/1");
  });

  it("createTask → POST con JSON", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: "1" }, 201));
    await createTask({ title: "a", labels: ["x"] });
    const { url, init } = lastCall();
    expect(url).toBe("http://api.test/api/tasks");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      title: "a",
      labels: ["x"],
    });
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
  });

  it("updateTask → PATCH y conserva null", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: "1" }));
    await updateTask("1", { dueDate: null });
    const { url, init } = lastCall();
    expect(url).toBe("http://api.test/api/tasks/1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ dueDate: null });
  });

  it("moveTask → PATCH /api/tasks/:id/move", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: "1" }));
    await moveTask("1", { status: "hecho", position: 2 });
    const { url, init } = lastCall();
    expect(url).toBe("http://api.test/api/tasks/1/move");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({
      status: "hecho",
      position: 2,
    });
  });

  it("deleteTask → DELETE, 204 sin parsear JSON", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(deleteTask("1")).resolves.toBeUndefined();
    expect(lastCall().init.method).toBe("DELETE");
    expect(lastCall().init.body).toBeUndefined();
  });

  it("listLabels → GET /api/labels", async () => {
    fetchMock.mockResolvedValue(jsonResponse(["a"]));
    expect(await listLabels()).toEqual(["a"]);
    expect(lastCall().url).toBe("http://api.test/api/labels");
  });
});

describe("errores", () => {
  it("400 con details", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          statusCode: 400,
          error: "Bad Request",
          message: "Los datos enviados no son válidos",
          details: [{ field: "title", message: "El título es obligatorio" }],
        },
        400,
      ),
    );
    const err = await createTask({ title: "" }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.message).toBe("Los datos enviados no son válidos");
    expect(err.details).toEqual([
      { field: "title", message: "El título es obligatorio" },
    ]);
  });

  it("404", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { statusCode: 404, error: "Not Found", message: "La tarea no existe" },
        404,
      ),
    );
    const err = await getTask("x").catch((e) => e);
    expect(err.status).toBe(404);
    expect(err.isNotFound).toBe(true);
    expect(err.message).toBe("La tarea no existe");
    expect(err.details).toEqual([]);
  });

  it("500", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          statusCode: 500,
          error: "Internal Server Error",
          message: "Ocurrió un error inesperado. Intentá nuevamente.",
        },
        500,
      ),
    );
    const err = await listTasks().catch((e) => e);
    expect(err.status).toBe(500);
  });

  it("red caída → ApiError con mensaje en español", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const err = await listTasks().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(0);
    expect(err.isNetwork).toBe(true);
    expect(err.message).toBe(NETWORK_ERROR_MESSAGE);
    expect(err.message).toBe("No se pudo conectar con el servidor");
  });

  it("cuerpo de error no JSON → mensaje genérico sin detalles técnicos", async () => {
    fetchMock.mockResolvedValue(
      new Response("<html>Bad gateway</html>", { status: 502 }),
    );
    const err = await listTasks().catch((e) => e);
    expect(err.status).toBe(502);
    expect(err.message).toBe(
      "Ocurrió un error inesperado. Intentá nuevamente.",
    );
    expect(err.message).not.toContain("html");
  });

  it("respuesta OK con cuerpo inválido → ApiError", async () => {
    fetchMock.mockResolvedValue(new Response("no json", { status: 200 }));
    await expect(listTasks()).rejects.toBeInstanceOf(ApiError);
  });
});
