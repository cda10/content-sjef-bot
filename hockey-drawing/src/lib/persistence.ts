import { HockeyPath } from "./types";

const STORAGE_KEY = "goalgetr_hockey_routes";

export function savePaths(paths: HockeyPath[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(paths));
  } catch {
    // localStorage might be full or unavailable
  }
}

export function loadPaths(): HockeyPath[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // corrupted data
  }
  return [];
}

export function clearPaths(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
