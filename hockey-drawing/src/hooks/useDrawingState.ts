"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DrawingMode,
  DrawingState,
  HockeyPath,
  HistoryEntry,
  PathPoint,
  PathStyle,
  Vec2,
} from "@/lib/types";
import {
  clonePaths,
  createPath,
  createPoint,
  generateId,
  insertPointBetween,
} from "@/lib/pathUtils";
import { freehandToPath } from "@/lib/freehandBeautifier";
import { UndoRedoManager } from "@/lib/undoRedo";
import { savePaths, loadPaths } from "@/lib/persistence";

export function useDrawingState() {
  const [state, setState] = useState<DrawingState>({
    paths: [],
    selectedPathId: null,
    selectedPointIndex: null,
    mode: "point",
    currentStyle: "solid",
    currentColor: "#cc2936",
    currentThickness: 3,
    currentArrowhead: true,
  });

  const historyRef = useRef(new UndoRedoManager());
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = loadPaths();
    if (saved.length > 0) {
      setState((s) => ({ ...s, paths: saved }));
    }
  }, []);

  // Save to localStorage on path changes
  useEffect(() => {
    savePaths(state.paths);
  }, [state.paths]);

  const updateHistoryFlags = useCallback(() => {
    setCanUndo(historyRef.current.canUndo());
    setCanRedo(historyRef.current.canRedo());
  }, []);

  const pushHistory = useCallback(() => {
    historyRef.current.snapshot({
      paths: state.paths,
      selectedPathId: state.selectedPathId,
      selectedPointIndex: state.selectedPointIndex,
    });
    updateHistoryFlags();
  }, [state.paths, state.selectedPathId, state.selectedPointIndex, updateHistoryFlags]);

  // ── Mode ──────────────────────────────────────────────────

  const setMode = useCallback((mode: DrawingMode) => {
    setState((s) => ({
      ...s,
      mode,
      selectedPathId: mode === "select" ? s.selectedPathId : null,
      selectedPointIndex: null,
    }));
  }, []);

  // ── Style controls ────────────────────────────────────────

  const setCurrentStyle = useCallback((style: PathStyle) => {
    setState((s) => {
      const next = { ...s, currentStyle: style };
      // Also update selected path's style
      if (s.selectedPathId) {
        next.paths = s.paths.map((p) =>
          p.id === s.selectedPathId ? { ...p, style } : p
        );
      }
      return next;
    });
  }, []);

  const setCurrentColor = useCallback((color: string) => {
    setState((s) => {
      const next = { ...s, currentColor: color };
      if (s.selectedPathId) {
        next.paths = s.paths.map((p) =>
          p.id === s.selectedPathId ? { ...p, color } : p
        );
      }
      return next;
    });
  }, []);

  const setCurrentThickness = useCallback((thickness: number) => {
    setState((s) => {
      const next = { ...s, currentThickness: thickness };
      if (s.selectedPathId) {
        next.paths = s.paths.map((p) =>
          p.id === s.selectedPathId ? { ...p, thickness } : p
        );
      }
      return next;
    });
  }, []);

  const toggleArrowhead = useCallback(() => {
    setState((s) => {
      const newVal = !s.currentArrowhead;
      const next = { ...s, currentArrowhead: newVal };
      if (s.selectedPathId) {
        next.paths = s.paths.map((p) =>
          p.id === s.selectedPathId ? { ...p, arrowhead: newVal } : p
        );
      }
      return next;
    });
  }, []);

  // ── Path operations ───────────────────────────────────────

  const addPath = useCallback(
    (path: HockeyPath) => {
      pushHistory();
      setState((s) => ({
        ...s,
        paths: [...s.paths, path],
        selectedPathId: path.id,
        selectedPointIndex: null,
      }));
    },
    [pushHistory]
  );

  const addFreehandPath = useCallback(
    (rawPoints: Vec2[]) => {
      if (rawPoints.length < 2) return;
      pushHistory();
      const path = freehandToPath(
        rawPoints,
        state.currentStyle,
        state.currentColor,
        state.currentThickness,
        state.currentArrowhead
      );
      setState((s) => ({
        ...s,
        paths: [...s.paths, path],
        selectedPathId: path.id,
        selectedPointIndex: null,
        mode: "select",
      }));
    },
    [pushHistory, state.currentStyle, state.currentColor, state.currentThickness, state.currentArrowhead]
  );

  // Point-based drawing: in-progress path
  const [activePath, setActivePath] = useState<HockeyPath | null>(null);

  const startPointPath = useCallback(
    (pos: Vec2) => {
      const pt = createPoint(pos.x, pos.y, "smooth");
      const path = createPath(
        [pt],
        state.currentStyle,
        state.currentColor,
        state.currentThickness,
        state.currentArrowhead
      );
      setActivePath(path);
    },
    [state.currentStyle, state.currentColor, state.currentThickness, state.currentArrowhead]
  );

  const addPointToActivePath = useCallback((pos: Vec2) => {
    setActivePath((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        points: [...prev.points, createPoint(pos.x, pos.y, "smooth")],
      };
    });
  }, []);

  const finishPointPath = useCallback(() => {
    if (activePath && activePath.points.length >= 2) {
      pushHistory();
      setState((s) => ({
        ...s,
        paths: [...s.paths, activePath],
        selectedPathId: activePath.id,
        selectedPointIndex: null,
        mode: "select",
      }));
    }
    setActivePath(null);
  }, [activePath, pushHistory]);

  const cancelPointPath = useCallback(() => {
    setActivePath(null);
  }, []);

  // ── Selection ─────────────────────────────────────────────

  const selectPath = useCallback((pathId: string | null) => {
    setState((s) => {
      if (pathId) {
        const path = s.paths.find((p) => p.id === pathId);
        if (path) {
          return {
            ...s,
            selectedPathId: pathId,
            selectedPointIndex: null,
            mode: "select",
            currentStyle: path.style,
            currentColor: path.color,
            currentThickness: path.thickness,
            currentArrowhead: path.arrowhead,
          };
        }
      }
      return { ...s, selectedPathId: null, selectedPointIndex: null };
    });
  }, []);

  const selectPoint = useCallback((pathId: string, pointIndex: number) => {
    setState((s) => ({
      ...s,
      selectedPathId: pathId,
      selectedPointIndex: pointIndex,
    }));
  }, []);

  const deselect = useCallback(() => {
    setState((s) => ({
      ...s,
      selectedPathId: null,
      selectedPointIndex: null,
    }));
  }, []);

  // ── Point editing ─────────────────────────────────────────

  const movePoint = useCallback((pathId: string, pointIndex: number, pos: Vec2) => {
    setState((s) => ({
      ...s,
      paths: s.paths.map((p) => {
        if (p.id !== pathId) return p;
        const newPoints = [...p.points];
        newPoints[pointIndex] = { ...newPoints[pointIndex], x: pos.x, y: pos.y };
        return { ...p, points: newPoints };
      }),
    }));
  }, []);

  const togglePointType = useCallback(() => {
    setState((s) => {
      if (!s.selectedPathId || s.selectedPointIndex === null) return s;
      return {
        ...s,
        paths: s.paths.map((p) => {
          if (p.id !== s.selectedPathId) return p;
          const newPoints = [...p.points];
          const pt = newPoints[s.selectedPointIndex!];
          newPoints[s.selectedPointIndex!] = {
            ...pt,
            type: pt.type === "smooth" ? "corner" : "smooth",
            handleIn: undefined,
            handleOut: undefined,
          };
          return { ...p, points: newPoints };
        }),
      };
    });
  }, []);

  const insertPoint = useCallback(
    (pathId: string, segmentIndex: number) => {
      pushHistory();
      setState((s) => ({
        ...s,
        paths: s.paths.map((p) =>
          p.id === pathId ? insertPointBetween(p, segmentIndex) : p
        ),
        selectedPointIndex: segmentIndex + 1,
      }));
    },
    [pushHistory]
  );

  const deleteSelectedPoint = useCallback(() => {
    setState((s) => {
      if (!s.selectedPathId || s.selectedPointIndex === null) return s;
      pushHistory();
      const path = s.paths.find((p) => p.id === s.selectedPathId);
      if (!path) return s;

      if (path.points.length <= 2) {
        // Delete entire path if only 2 points
        return {
          ...s,
          paths: s.paths.filter((p) => p.id !== s.selectedPathId),
          selectedPathId: null,
          selectedPointIndex: null,
        };
      }

      return {
        ...s,
        paths: s.paths.map((p) => {
          if (p.id !== s.selectedPathId) return p;
          const newPoints = p.points.filter((_, i) => i !== s.selectedPointIndex);
          return { ...p, points: newPoints };
        }),
        selectedPointIndex: null,
      };
    });
  }, [pushHistory]);

  const deleteSelectedPath = useCallback(() => {
    setState((s) => {
      if (!s.selectedPathId) return s;
      pushHistory();
      return {
        ...s,
        paths: s.paths.filter((p) => p.id !== s.selectedPathId),
        selectedPathId: null,
        selectedPointIndex: null,
      };
    });
  }, [pushHistory]);

  // ── Undo / Redo ───────────────────────────────────────────

  const undo = useCallback(() => {
    const entry = historyRef.current.undo({
      paths: state.paths,
      selectedPathId: state.selectedPathId,
      selectedPointIndex: state.selectedPointIndex,
    });
    if (entry) {
      setState((s) => ({
        ...s,
        paths: entry.paths,
        selectedPathId: entry.selectedPathId,
        selectedPointIndex: entry.selectedPointIndex,
      }));
    }
    updateHistoryFlags();
  }, [state.paths, state.selectedPathId, state.selectedPointIndex, updateHistoryFlags]);

  const redo = useCallback(() => {
    const entry = historyRef.current.redo({
      paths: state.paths,
      selectedPathId: state.selectedPathId,
      selectedPointIndex: state.selectedPointIndex,
    });
    if (entry) {
      setState((s) => ({
        ...s,
        paths: entry.paths,
        selectedPathId: entry.selectedPathId,
        selectedPointIndex: entry.selectedPointIndex,
      }));
    }
    updateHistoryFlags();
  }, [state.paths, state.selectedPathId, state.selectedPointIndex, updateHistoryFlags]);

  // ── Clear all ─────────────────────────────────────────────

  const clearAll = useCallback(() => {
    pushHistory();
    setState((s) => ({
      ...s,
      paths: [],
      selectedPathId: null,
      selectedPointIndex: null,
    }));
    historyRef.current.clear();
    updateHistoryFlags();
  }, [pushHistory, updateHistoryFlags]);

  return {
    state,
    activePath,
    canUndo,
    canRedo,
    setMode,
    setCurrentStyle,
    setCurrentColor,
    setCurrentThickness,
    toggleArrowhead,
    addPath,
    addFreehandPath,
    startPointPath,
    addPointToActivePath,
    finishPointPath,
    cancelPointPath,
    selectPath,
    selectPoint,
    deselect,
    movePoint,
    togglePointType,
    insertPoint,
    deleteSelectedPoint,
    deleteSelectedPath,
    undo,
    redo,
    clearAll,
    pushHistory,
  };
}
