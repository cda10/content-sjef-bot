"use client";

import React, { useCallback, useEffect } from "react";
import DrawingCanvas from "@/components/DrawingCanvas";
import Toolbar from "@/components/Toolbar";
import { useDrawingState } from "@/hooks/useDrawingState";
import { Vec2 } from "@/lib/types";

export default function Home() {
  const {
    state,
    activePath,
    canUndo,
    canRedo,
    setMode,
    setCurrentStyle,
    setCurrentColor,
    setCurrentThickness,
    toggleArrowhead,
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
  } = useDrawingState();

  // ── Canvas event handlers ─────────────────────────────────

  const handleCanvasClick = useCallback(
    (pos: Vec2) => {
      if (state.mode === "point") {
        if (!activePath) {
          startPointPath(pos);
        } else {
          addPointToActivePath(pos);
        }
      }
    },
    [state.mode, activePath, startPointPath, addPointToActivePath]
  );

  const handleCanvasDoubleClick = useCallback(
    (_pos: Vec2) => {
      if (state.mode === "point" && activePath) {
        finishPointPath();
      }
    },
    [state.mode, activePath, finishPointPath]
  );

  const handlePathClick = useCallback(
    (pathId: string) => {
      if (state.mode === "select" || state.mode === "point") {
        selectPath(pathId);
      }
    },
    [state.mode, selectPath]
  );

  const handlePointMouseDown = useCallback(
    (pathId: string, pointIndex: number) => {
      selectPoint(pathId, pointIndex);
      pushHistory();
    },
    [selectPoint, pushHistory]
  );

  const handleSegmentClick = useCallback(
    (pathId: string, segmentIndex: number, _pos: Vec2) => {
      insertPoint(pathId, segmentIndex);
    },
    [insertPoint]
  );

  const handlePointDrag = useCallback(
    (pathId: string, pointIndex: number, pos: Vec2) => {
      movePoint(pathId, pointIndex, pos);
    },
    [movePoint]
  );

  const handlePointDragEnd = useCallback(() => {
    // History was already pushed on drag start
  }, []);

  const handleFreehandEnd = useCallback(
    (points: Vec2[]) => {
      addFreehandPath(points);
    },
    [addFreehandPath]
  );

  // ── Keyboard shortcuts ────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if input is focused
      if ((e.target as Element).tagName === "INPUT") return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (e.key === "v" || e.key === "V") {
        setMode("select");
        return;
      }
      if (e.key === "p" || e.key === "P") {
        setMode("point");
        return;
      }
      if (e.key === "f" || e.key === "F") {
        setMode("freehand");
        return;
      }
      if (e.key === "Escape") {
        if (activePath) {
          cancelPointPath();
        } else {
          deselect();
        }
        return;
      }
      if (e.key === "Enter" && activePath) {
        finishPointPath();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (state.selectedPointIndex !== null) {
          deleteSelectedPoint();
        } else if (state.selectedPathId) {
          deleteSelectedPath();
        }
        return;
      }
      if (ctrl && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (ctrl && (e.key === "Z" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === "t" || e.key === "T") {
        togglePointType();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    setMode,
    activePath,
    cancelPointPath,
    finishPointPath,
    deselect,
    deleteSelectedPoint,
    deleteSelectedPath,
    undo,
    redo,
    togglePointType,
    state.selectedPathId,
    state.selectedPointIndex,
  ]);

  // ── Mode hints ────────────────────────────────────────────

  const modeHints: Record<string, string> = {
    select: "Click a path to select. Drag points to edit. [V]",
    point: "Click to place points. Double-click or Enter to finish. Esc to cancel. [P]",
    freehand: "Click and drag to draw. Release to beautify. [F]",
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-gray-950 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-sky-400" />
          <span className="text-sm font-semibold text-gray-200 tracking-wide">
            GoalGetr
          </span>
          <span className="text-xs text-gray-500 ml-1">Route Drawing Prototype</span>
        </div>
        <span className="text-xs text-gray-500">
          {state.paths.length} path{state.paths.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Toolbar */}
      <Toolbar
        mode={state.mode}
        currentStyle={state.currentStyle}
        currentColor={state.currentColor}
        currentThickness={state.currentThickness}
        currentArrowhead={state.currentArrowhead}
        canUndo={canUndo}
        canRedo={canRedo}
        hasSelection={!!state.selectedPathId}
        hasPointSelection={state.selectedPointIndex !== null}
        onModeChange={setMode}
        onStyleChange={setCurrentStyle}
        onColorChange={setCurrentColor}
        onThicknessChange={setCurrentThickness}
        onToggleArrowhead={toggleArrowhead}
        onTogglePointType={togglePointType}
        onDeletePoint={deleteSelectedPoint}
        onDeletePath={deleteSelectedPath}
        onUndo={undo}
        onRedo={redo}
        onClearAll={clearAll}
      />

      {/* Drawing canvas */}
      <DrawingCanvas
        paths={state.paths}
        activePath={activePath}
        selectedPathId={state.selectedPathId}
        selectedPointIndex={state.selectedPointIndex}
        mode={state.mode}
        currentColor={state.currentColor}
        currentThickness={state.currentThickness}
        onCanvasClick={handleCanvasClick}
        onCanvasDoubleClick={handleCanvasDoubleClick}
        onPathClick={handlePathClick}
        onPointMouseDown={handlePointMouseDown}
        onSegmentClick={handleSegmentClick}
        onPointDrag={handlePointDrag}
        onPointDragEnd={handlePointDragEnd}
        onFreehandEnd={handleFreehandEnd}
        onDeselect={deselect}
      />

      {/* Status bar with mode hint */}
      <div className="flex items-center justify-between px-4 py-1 bg-gray-950 border-t border-gray-800 text-xs text-gray-500">
        <span>{modeHints[state.mode]}</span>
        <span>
          {state.selectedPathId
            ? `Selected: ${state.paths.find((p) => p.id === state.selectedPathId)?.points.length ?? 0} pts`
            : ""}
          {state.selectedPointIndex !== null
            ? ` | Point ${state.selectedPointIndex + 1} [T: toggle type, Del: remove]`
            : ""}
        </span>
      </div>
    </div>
  );
}
