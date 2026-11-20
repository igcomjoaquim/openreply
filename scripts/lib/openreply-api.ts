import path from "node:path";
import { existsSync } from "node:fs";

/** Reads the deploy URL and the service secret from the repo's .env. */
export function loadConfig(local: boolean): { baseUrl: string; secret: string } {
  const envFile = path.join(__dirname, "..", "..", ".env");
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const secret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("CRON_SECRET não encontrado no .env");
  const baseUrl = local
    ? "http://localhost:3000"
    : process.env.OPENREPLY_URL;
  if (!baseUrl) throw new Error("OPENREPLY_URL não encontrado no .env");
  return { baseUrl: baseUrl.replace(/\/$/, ""), secret };
}

/** "2026-11-20 18:30" (Brasília, UTC-3 with no daylight saving) -> ISO. */
export function brasiliaToIso(input: string): string {
  const match = input
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})$/);
  if (!match) throw new Error(`Data inválida: "${input}". Use AAAA-MM-DD HH:MM`);
  const [, y, m, d, h, min] = match;
  const iso = `${y}-${m}-${d}T${h.padStart(2, "0")}:${min}:00-03:00`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Data inválida: "${input}"`);
  }
  // Rejects things like 2026-02-31, which Date would roll over.
  const back = new Date(date.getTime() - 3 * 60 * 60_000).toISOString();
  if (back.slice(0, 10) !== `${y}-${m}-${d}`) throw new Error(`Data inválida: "${input}"`);
  return date.toISOString();
}

export function formatBrasilia(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });
}
