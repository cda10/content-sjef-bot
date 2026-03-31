"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import HockeyRink, { RINK_W, RINK_H } from "./HockeyRink";
import PathRenderer from "./PathRenderer";
import { DrawingMode, HockeyPath, Vec2 } from "@/lib/types";
import { buildSvgPath, createPoint } from "@/lib/pathUtils";

interface DrawingCanvasProps {
  paths: HockeyPath[];
  activePath: HockeyPath | null;
  selectedPathId: string | null;
  selectedPointIndex: number | null;
  mode: DrawingMode;
  currentColor: string;
  currentThickness: number;
  onCanvasClick: (pos: Vec2) => void;
  onCanvasDoubleClick: (pos: Vec2) => void;
  onPathClick: (pathId: string) => void;
  onPointMouseDown: (pathId: string, pointIndex: number) => void;
  onSegmentClick: (pathId: string, segmentIndex: number, pos: Vec2) => void;
  onPointDrag: (pathId: string, pointIndex: number, pos: Vec2) => void;
  onPointDragEnd: () => void;
  onFreehandEnd: (points: Vec2[]) => void;
  onDeselect: () => void;
}

export default function DrawingCanvas({
  paths,
  activePath,
  selectedPathId,
  selectedPointIndex,
  mode,
  currentColor,
  currentThickness,
  onCanvasClick,
  onCanvasDoubleClick,
  onPathClick,
  onPointMouseDown,
  onSegmentClick,
  onPointDrag,
  onPointDragEnd,
  onFreehandEnd,
  onDeselect,
}: DrawingCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [freehandPoints, setFreehandPoints] = useState<Vec2[]>([]);
  const [isDrawingFreehand, setIsDrawingFreehand] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragInfoRef = useRef<{ pathId: string; pointIndex: number } | null>(null);
  const [mousePos, setMousePos] = useState<Vec2 | null>(null);

  // ── Coordinate transform ──────────────────────────────────

  const getSvgPos = useCallback(
    (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent): Vec2 | null => {
      const svg = svgRef.current;
      if (!svg) return null;

      const rect = svg.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0]?.clientX ?? (e as TouchEvent).changedTouches?.[0]?.clientX ?? 0 : (e as MouseEvent).clientX;
      const clientY = "touches" in e ? e.touches[0]?.clientY ?? (e as TouchEvent).changedTouches?.[0]?.clientY ?? 0 : (e as MouseEvent).clientY;

      // Map from screen coords to SVG viewBox coords
      const x = ((clientX - rect.left) / rect.width) * RINK_W;
      const y = ((clientY - rect.top) / rect.height) * RINK_H;

      return { x, y };
    },
    []
  );

  // ── Mouse/touch handlers ──────────────────────────────────

  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const pos = getSvgPos(e as any);
      if (!pos) return;

      if (mode === "freehand") {
        setIsDrawingFreehand(true);
        setFreehandPoints([pos]);
        return;
      }
    },
    [mode, getSvgPos]
  );

  const handlePointerMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const pos = getSvgPos(e);
      if (!pos) return;

      setMousePos(pos);

      if (isDrawingFreehand) {
        setFreehandPoints((prev) => [...prev, pos]);
        return;
      }

      if (isDragging && dragInfoRef.current) {
        onPointDrag(dragInfoRef.current.pathId, dragInfoRef.current.pointIndex, pos);
      }
    },
    [isDrawingFreehand, isDragging, getSvgPos, onPointDrag]
  );

  const handlePointerUp = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (isDrawingFreehand) {
        setIsDrawingFreehand(false);
        if (freehandPoints.length >= 2) {
          onFreehandEnd(freehandPoints);
        }
        setFreehandPoints([]);
        return;
      }

      if (isDragging) {
        setIsDragging(false);
        dragInfoRef.current = null;
        onPointDragEnd();
      }
    },
    [isDrawingFreehand, isDragging, freehandPoints, onFreehandEnd, onPointDragEnd]
  );

  // ── SVG click (for point mode and deselect) ───────────────

  const handleSvgClick = useCallback(
    (e: React.MouseEvent) => {
      // Only handle clicks on the SVG background itself
      if (e.target !== svgRef.current && (e.target as Element).tagName !== "rect") {
        return;
      }

      const pos = getSvgPos(e);
      if (!pos) return;

      if (mode === "select") {
        onDeselect();
        return;
      }

      onCanvasClick(pos);
    },
    [mode, getSvgPos, onCanvasClick, onDeselect]
  );

  const handleSvgDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const pos = getSvgPos(e);
      if (!pos) return;
      onCanvasDoubleClick(pos);
    },
    [getSvgPos, onCanvasDoubleClick]
  );

  // Point drag initiation from PathRenderer
  const handlePointMouseDown = useCallback(
    (pathId: string, pointIndex: number, e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      setIsDragging(true);
      dragInfoRef.current = { pathId, pointIndex };
      onPointMouseDown(pathId, pointIndex);
    },
    [onPointMouseDown]
  );

  // ── Window event listeners ────────────────────────────────

  useEffect(() => {
    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);
    window.addEventListener("touchmove", handlePointerMove, { passive: false });
    window.addEventListener("touchend", handlePointerUp);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  // ── Freehand preview path ─────────────────────────────────

  const freehandPreviewPath =
    isDrawingFreehand && freehandPoints.length >= 2
      ? `M ${freehandPoints.map((p) => `${p.x} ${p.y}`).join(" L ")}`
      : null;

  // ── Active path preview (point mode) ──────────────────────

  const activePathPreview =
    activePath && activePath.points.length >= 1 ? (
      <g>
        {activePath.points.length >= 2 && (
          <path
            d={buildSvgPath(activePath.points)}
            fill="none"
            stroke={activePath.color}
            strokeWidth={activePath.thickness}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.7}
            pointerEvents="none"
          />
        )}
        {/* Preview line from last point to cursor */}
        {mousePos && activePath.points.length >= 1 && (
          <line
            x1={activePath.points[activePath.points.length - 1].x}
            y1={activePath.points[activePath.points.length - 1].y}
            x2={mousePos.x}
            y2={mousePos.y}
            stroke={activePath.color}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            opacity={0.5}
            pointerEvents="none"
          />
        )}
        {/* Show placed points */}
        {activePath.points.map((pt, i) => (
          <circle
            key={i}
            cx={pt.x}
            cy={pt.y}
            r={4}
            fill="#fff"
            stroke={activePath.color}
            strokeWidth={2}
            pointerEvents="none"
          />
        ))}
      </g>
    ) : null;

  // Determine cursor
  let cursor = "default";
  if (mode === "freehand") cursor = "crosshair";
  if (mode === "point") cursor = "crosshair";

  return (
    <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${RINK_W} ${RINK_H}`}
        className="w-full max-h-[calc(100vh-56px)] drop-shadow-2xl"
        style={{ cursor }}
        preserveAspectRatio="xMidYMid meet"
        onClick={handleSvgClick}
        onDoubleClick={handleSvgDoubleClick}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
      >
        {/* Rink background */}
        <HockeyRink />

        {/* Existing paths */}
        {paths.map((path) => (
          <PathRenderer
            key={path.id}
            path={path}
            isSelected={path.id === selectedPathId}
            selectedPointIndex={
              path.id === selectedPathId ? selectedPointIndex : null
            }
            onPathClick={(id) => onPathClick(id)}
            onPointMouseDown={handlePointMouseDown}
            onSegmentClick={onSegmentClick}
          />
        ))}

        {/* Active path preview (point mode) */}
        {activePathPreview}

        {/* Freehand preview */}
        {freehandPreviewPath && (
          <path
            d={freehandPreviewPath}
            fill="none"
            stroke={currentColor}
            strokeWidth={currentThickness}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.4}
            strokeDasharray="3 3"
            pointerEvents="none"
          />
        )}
      </svg>
    </div>
  );
}
