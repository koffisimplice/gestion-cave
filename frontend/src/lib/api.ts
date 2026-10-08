import type { ApiError } from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const TOKEN_KEY = "gc_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class HttpError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;

  constructor(status: number, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, auth = true, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  if (auth) {
    const token = getToken();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    clearToken();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  }

  if (!response.ok) {
    let message = "Une erreur est survenue.";
    let fieldErrors: Record<string, string> | undefined;
    try {
      const err = (await response.json()) as ApiError;
      message = err.message || message;
      fieldErrors = err.fieldErrors;
    } catch {
      /* réponse sans corps JSON */
    }
    throw new HttpError(response.status, message, fieldErrors);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/** Envoie un fichier (multipart/form-data) avec authentification et renvoie la réponse JSON. */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    let message = "L'envoi a échoué.";
    try {
      const err = (await response.json()) as ApiError;
      message = err.message || message;
    } catch {
      /* corps non JSON */
    }
    throw new HttpError(response.status, message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Télécharge un fichier binaire (rapport PDF/Excel) en déclenchant l'enregistrement navigateur. */
export async function apiDownload(path: string, nomParDefaut: string): Promise<void> {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    let message = "Le téléchargement a échoué.";
    try {
      const err = (await response.json()) as ApiError;
      message = err.message || message;
    } catch {
      /* corps non JSON */
    }
    throw new HttpError(response.status, message);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomParDefaut;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
