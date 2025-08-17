/**
 * Cenaria Pantry API Client (Next.js)
 *
 * Objetivo: Librería con tipos y funciones list/create/get/put/patch/delete
 * usando el ID Token (Cognito) en el header Authorization: Bearer <token>.
 *
 * Endpoints asumidos (v1):
 *  - GET    /v1/pantry                -> list
 *  - POST   /v1/pantry                -> create
 *  - GET    /v1/pantry/:id            -> get
 *  - PUT    /v1/pantry/:id            -> put (reemplazo total)
 *  - PATCH  /v1/pantry/:id            -> patch (actualización parcial)
 *  - DELETE /v1/pantry/:id            -> delete
 *
 * Manejo de ETag:
 *  - Las respuestas individuales incluyen header ETag.
 *  - Para operaciones condicionales (PUT/PATCH/DELETE), enviar header If-Match.
 *
 * Uso:
 *  import { pantryClient } from "@/lib/pantry";
 *  const { items } = await pantryClient.list();
 *
 * Nota: Ajusta los tipos si el contrato del backend cambia.
 */

/** Utiliza NEXT_PUBLIC_API_URL si existe, si no, fallback al dominio público */
const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.cenaria.app";

export type ISODate = string; // e.g. "2025-08-17T16:42:00.000Z"

export type PantryUnit =
  | "g"
  | "kg"
  | "ml"
  | "l"
  | "u" // unidades (piezas)
  | "tbsp"
  | "tsp"
  | "cup"
  | "pack"
  | "other";

export interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: PantryUnit;
  category?: string;
  location?: "fridge" | "freezer" | "pantry" | "other";
  expiresAt?: ISODate | null;
  notes?: string | null;
  /** Control de concurrencia optimista */
  version?: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type CreatePantryItem = Pick<
  PantryItem,
  "name" | "quantity" | "unit" | "category" | "location" | "expiresAt" | "notes"
> & { id?: string };

export type UpdatePantryItem = Partial<
  Pick<
    PantryItem,
    | "name"
    | "quantity"
    | "unit"
    | "category"
    | "location"
    | "expiresAt"
    | "notes"
  >
>;

export interface ListPantryResponse {
  items: PantryItem[];
  count: number;
  nextToken?: string | null;
}

export interface ApiResult<T> {
  data: T;
  status: number;
  etag?: string | null;
  headers: Headers;
}

export interface PantryClientOptions {
  /** Base URL del API, ej: https://api.cenaria.app */
  baseURL?: string;
  /**
   * Función que retorna el ID Token (string) o una Promesa que lo resuelva.
   * Puedes integrarlo con tu capa de Auth (Cognito Hosted UI o Amplify).
   */
  getIdToken: () => string | Promise<string>;
}

export class PantryClient {
  private baseURL: string;
  private getIdToken: PantryClientOptions["getIdToken"];

  constructor({ baseURL = DEFAULT_BASE_URL, getIdToken }: PantryClientOptions) {
    this.baseURL = baseURL.replace(/\/$/, "");
    this.getIdToken = getIdToken;
  }

  /**
   * Listar ítems de despensa
   */
  async list(params?: { limit?: number; nextToken?: string }): Promise<ApiResult<ListPantryResponse>> {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.nextToken) qs.set("nextToken", params.nextToken);

    return this.request<ListPantryResponse>(`/v1/pantry${qs.toString() ? `?${qs}` : ""}`, {
      method: "GET",
    });
  }

  /**
   * Crear un ítem de despensa
   */
  async create(body: CreatePantryItem): Promise<ApiResult<PantryItem>> {
    return this.request<PantryItem>(`/v1/pantry`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Obtener un ítem por id
   */
  async get(id: string): Promise<ApiResult<PantryItem>> {
    return this.request<PantryItem>(`/v1/pantry/${encodeURIComponent(id)}`, {
      method: "GET",
    });
  }

  /**
   * Reemplazo total (PUT). Usa If-Match si deseas control de versión/ETag.
   */
  async put(
    id: string,
    body: PantryItem | CreatePantryItem,
    opts?: { ifMatch?: string | number }
  ): Promise<ApiResult<PantryItem>> {
    const headers: Record<string, string> = {};
    if (opts?.ifMatch !== undefined) headers["If-Match"] = String(opts.ifMatch);

    return this.request<PantryItem>(`/v1/pantry/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });
  }

  /**
   * Actualización parcial (PATCH). Usa If-Match opcionalmente.
   */
  async patch(
    id: string,
    body: UpdatePantryItem,
    opts?: { ifMatch?: string | number }
  ): Promise<ApiResult<PantryItem>> {
    const headers: Record<string, string> = {};
    if (opts?.ifMatch !== undefined) headers["If-Match"] = String(opts.ifMatch);

    return this.request<PantryItem>(`/v1/pantry/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });
  }

  /**
   * Borrar un ítem. Recomendado enviar If-Match con versión/ETag para evitar condiciones de carrera.
   */
  async delete(id: string, opts?: { ifMatch?: string | number }): Promise<ApiResult<{ id: string }>> {
    const headers: Record<string, string> = {};
    if (opts?.ifMatch !== undefined) headers["If-Match"] = String(opts.ifMatch);

    return this.request<{ id: string }>(`/v1/pantry/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers,
    });
  }

  // =====================
  // Internals
  // =====================

  private async request<T>(path: string, init: RequestInit & { headers?: Record<string, string> }): Promise<ApiResult<T>> {
    const token = await this.getIdToken();

    const headers: HeadersInit = {
      "Authorization": `Bearer ${token}`,
      "content-type": init.method && init.method !== "GET" && init.method !== "HEAD" ? "application/json" : undefined,
      ...init.headers,
    } as HeadersInit;

    const res = await fetch(`${this.baseURL}${path}`, {
      ...init,
      headers,
      // Habilita revalidación en Next.js si usas App Router para GETs (opcional)
      // next: { revalidate: 0 },
    });

    const etag = res.headers.get("etag");

    // Intenta parsear JSON, aún si status es error
    let data: any = null;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // Mantener text crudo si no es JSON
      data = text as any;
    }

    if (!res.ok) {
      // Estructura de error paquetizada
      const err: ApiError = new ApiError(
        `Pantry API error ${res.status}`,
        res.status,
        typeof data === "object" && data !== null ? data : { message: text }
      );
      err.etag = etag;
      err.headers = res.headers;
      throw err;
    }

    return { data: data as T, status: res.status, etag, headers: res.headers };
  }
}

export class ApiError extends Error {
  status: number;
  payload: unknown;
  etag?: string | null;
  headers?: Headers;
  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

// =====================
// Singleton listo para usar
// =====================

/**
 * Implementa esta función en tu app para recuperar el ID Token de Cognito.
 * - Si usas Amplify/Auth: await (await Auth.currentSession()).getIdToken().getJwtToken()
 * - Si lo guardas en cookies/LocalStorage, recupéralo desde ahí.
 */
async function defaultGetIdToken(): Promise<string> {
  // TODO: reemplazar con tu integración real de autenticación
  const token = (globalThis as any).__CENARIA_ID_TOKEN__ as string | undefined;
  if (!token) {
    throw new Error("ID Token no disponible. Inyecta getIdToken en pantryClient o configura __CENARIA_ID_TOKEN__.");
  }
  return token;
}

export const pantryClient = new PantryClient({ getIdToken: defaultGetIdToken });

// =====================
// Helpers de conveniencia (opcional)
// =====================

/**
 * Convierte headers ETag/If-Match con versión numérica.
 * - Algunos backends exponen ETag como 'W/"2"' o '"2"'. Este helper intenta extraer el número 2.
 */
export function parseEtagVersion(etag?: string | null): number | undefined {
  if (!etag) return undefined;
  const m = etag.match(/\"?(\d+)\"?/);
  return m ? Number(m[1]) : undefined;
}
