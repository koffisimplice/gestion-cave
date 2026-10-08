import { apiFetch } from "@/lib/api";
import type { JournalAudit } from "@/types";

export function listerAudit(action?: string, limite = 200) {
  const params = new URLSearchParams({ limite: String(limite) });
  if (action) params.set("action", action);
  return apiFetch<JournalAudit[]>(`/api/audit?${params.toString()}`);
}
