import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ApiError } from "@/types";

/**
 * URL du backend. Fournie via la variable d'environnement EXPO_PUBLIC_API_URL
 * (fichier .env à la racine du projet mobile). Doit être l'IP de la machine qui
 * héberge le backend sur le réseau local — jamais « localhost », qui désignerait
 * le téléphone lui-même.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.1.67:8080";

const TOKEN_KEY = "gc_token";

// Callback déclenché quand le serveur renvoie 401 (session expirée), branché par
// le contexte d'authentification pour rediriger vers l'écran de connexion.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

export async function getToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* stockage indisponible : on ignore */
  }
}

export async function clearToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
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
    const token = await getToken();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new HttpError(
      0,
      "Impossible de joindre le serveur. Vérifiez votre connexion et l'adresse du serveur."
    );
  }

  if (response.status === 401) {
    await clearToken();
    if (onUnauthorized) onUnauthorized();
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
