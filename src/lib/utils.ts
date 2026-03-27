import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Display a value as string, returning "N/A" for nullish/empty. */
export function n(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "N/A";
  return String(value);
}

/** Sum an array of nullable numbers, treating null/undefined as 0. */
export function sum(values: Array<number | null | undefined>): number {
  return values.reduce<number>((acc, v) => acc + (typeof v === "number" && Number.isFinite(v) ? v : 0), 0);
}

/** Format a number with fixed decimal places, returning "N/A" for null/NaN. */
export function fixed(value: number | null, digits: number): string {
  if (value === null || !Number.isFinite(value)) return "N/A";
  return value.toFixed(digits);
}

/** Convert innings pitched string (e.g. "6.2") to total outs. */
export function ipToOuts(ip: string | null | undefined): number {
  if (!ip) return 0;
  const [whole, part] = ip.split(".");
  const innings = Number(whole || "0");
  const partial = Number(part || "0");
  if (!Number.isFinite(innings) || !Number.isFinite(partial)) return 0;
  return innings * 3 + partial;
}
