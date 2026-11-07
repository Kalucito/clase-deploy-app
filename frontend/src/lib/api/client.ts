import type { ApiErrorBody, ApiErrorDetail } from "@/types/task";

export const NETWORK_ERROR_MESSAGE = "No se pudo conectar con el servidor";
const GENERIC_ERROR_MESSAGE =
  "Ocurrió un error inesperado. Intentá nuevamente.";

export class ApiError extends Error {
  /** Código HTTP, o 0 si no hubo respuesta (fallo de red). */
  readonly status: number;
  readonly details: ApiErrorDetail[];

  constructor(status: number, message: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
  get isNetwork(): boolean {
    return this.status === 0;
  }
}

function baseUrl(): string {
  return `${process.env.NEXT_PUBLIC_API_URL ?? ""}/api`;
}

function isErrorBody(value: unknown): value is Partial<ApiErrorBody> {
  return typeof value === "object" && value !== null;
}

async function toApiError(res: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // Cuerpo vacío o no JSON: se usa el mensaje genérico.
  }
  if (isErrorBody(body) && typeof body.message === "string") {
    const details = Array.isArray(body.details) ? body.details : [];
    return new ApiError(res.status, body.message, details);
  }
  return new ApiError(res.status, GENERIC_ERROR_MESSAGE);
}

export async function request<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const hasBody = options.body !== undefined;
  let res: Response;
  try {
    res = await fetch(`${baseUrl()}${path}`, {
      method: options.method ?? "GET",
      headers: hasBody ? { "Content-Type": "application/json" } : undefined,
      body: hasBody ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, NETWORK_ERROR_MESSAGE);
  }

  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  try {
    return (await res.json()) as T;
  } catch {
    throw new ApiError(res.status, GENERIC_ERROR_MESSAGE);
  }
}
