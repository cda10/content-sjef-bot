import { HistoryEntry } from "./types";
import { clonePaths } from "./pathUtils";

const MAX_HISTORY = 50;

export class UndoRedoManager {
  private past: HistoryEntry[] = [];
  private future: HistoryEntry[] = [];

  snapshot(entry: HistoryEntry): void {
    this.past.push({
      paths: clonePaths(entry.paths),
      selectedPathId: entry.selectedPathId,
      selectedPointIndex: entry.selectedPointIndex,
    });
    if (this.past.length > MAX_HISTORY) {
      this.past.shift();
    }
    this.future = [];
  }

  undo(current: HistoryEntry): HistoryEntry | null {
    if (this.past.length === 0) return null;

    this.future.push({
      paths: clonePaths(current.paths),
      selectedPathId: current.selectedPathId,
      selectedPointIndex: current.selectedPointIndex,
    });

    return this.past.pop()!;
  }

  redo(current: HistoryEntry): HistoryEntry | null {
    if (this.future.length === 0) return null;

    this.past.push({
      paths: clonePaths(current.paths),
      selectedPathId: current.selectedPathId,
      selectedPointIndex: current.selectedPointIndex,
    });

    return this.future.pop()!;
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }
}
