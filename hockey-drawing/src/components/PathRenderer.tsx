import React from "react";
import { HockeyPath, PathPoint, Vec2 } from "@/lib/types";
import {
  buildSvgPath,
  samplePointsAlongPath,
  computeAutoHandles,
  vecSub,
  vecNorm,
  vecPerp,
  vecAdd,
  vecScale,
} from "@/lib/pathUtils";

interface PathRendererProps {
  path: HockeyPath;
  isSelected: boolean;
  selectedPointIndex: number | null;
  onPathClick?: (pathId: string, e: React.MouseEvent | React.TouchEvent) => void;
  onPointMouseDown?: (
    pathId: string,
    pointIndex: number,
    e: React.MouseEvent | React.TouchEvent
  ) => void;
  onSegmentClick?: (pathId: string, segmentIndex: number, pos: Vec2) => void;
}

// ── Arrowhead marker ─────────────────────────────────────────

function ArrowMarker({ id, color }: { id: string; color: string }) {
  return (
    <marker
      id={id}
      viewBox="0 0 14 10"
      refX="13"
      refY="5"
      markerWidth="10"
      markerHeight="8"
      orient="auto-start-reverse"
      markerUnits="userSpaceOnUse"
    >
      <path d="M 0 0 L 14 5 L 0 10 Z" fill={color} />
    </marker>
  );
}

// ── Wave path for puck-carry style ───────────────────────────

function buildWavePath(points: PathPoint[], amplitude: number = 6, frequency: number = 0.04): string {
  const samples = samplePointsAlongPath(points, 200);
  if (samples.length < 2) return "";

  let d = `M ${samples[0].x} ${samples[0].y}`;
  let cumDist = 0;

  for (let i = 1; i < samples.length; i++) {
    const dx = samples[i].x - samples[i - 1].x;
    const dy = samples[i].y - samples[i - 1].y;
    cumDist += Math.sqrt(dx * dx + dy * dy);

    const dir = vecNorm({ x: dx, y: dy });
    const perp = vecPerp(dir);
    const wave = Math.sin(cumDist * frequency * Math.PI * 2) * amplitude;

    const px = samples[i].x + perp.x * wave;
    const py = samples[i].y + perp.y * wave;
    d += ` L ${px} ${py}`;
  }

  return d;
}

// ── Backward skating marks ───────────────────────────────────

function BackwardMarks({
  points,
  color,
  thickness,
}: {
  points: PathPoint[];
  color: string;
  thickness: number;
}) {
  const samples = samplePointsAlongPath(points, 200);
  if (samples.length < 2) return null;

  const marks: React.ReactElement[] = [];
  let cumDist = 0;
  const spacing = 12;
  const markLen = 6;

  for (let i = 1; i < samples.length; i++) {
    const dx = samples[i].x - samples[i - 1].x;
    const dy = samples[i].y - samples[i - 1].y;
    const segLen = Math.sqrt(dx * dx + dy * dy);
    cumDist += segLen;

    if (cumDist >= spacing) {
      cumDist -= spacing;
      const dir = vecNorm({ x: dx, y: dy });
      const perp = vecPerp(dir);

      marks.push(
        <line
          key={`bm-${i}`}
          x1={samples[i].x + perp.x * markLen}
          y1={samples[i].y + perp.y * markLen}
          x2={samples[i].x - perp.x * markLen}
          y2={samples[i].y - perp.y * markLen}
          stroke={color}
          strokeWidth={thickness * 0.6}
          strokeLinecap="round"
        />
      );
    }
  }

  return <>{marks}</>;
}

// ── Main path rendering ──────────────────────────────────────

export default function PathRenderer({
  path,
  isSelected,
  selectedPointIndex,
  onPathClick,
  onPointMouseDown,
  onSegmentClick,
}: PathRendererProps) {
  const { points, style, color, thickness, arrowhead, id } = path;
  if (points.length < 2) return null;

  const svgPath = buildSvgPath(points);
  const markerId = `arrow-${id}`;
  const markerEnd = arrowhead ? `url(#${markerId})` : undefined;

  const handlePathClick = (e: React.MouseEvent<SVGElement>) => {
    e.stopPropagation();
    onPathClick?.(id, e);
  };

  // Hit area for easier selection
  const hitArea = (
    <path
      d={svgPath}
      fill="none"
      stroke="transparent"
      strokeWidth={Math.max(thickness + 12, 18)}
      strokeLinecap="round"
      strokeLinejoin="round"
      onClick={handlePathClick}
      onMouseDown={(e) => e.stopPropagation()}
      style={{ cursor: "pointer" }}
    />
  );

  // Render the visible path based on style
  let visiblePath: React.ReactElement;

  switch (style) {
    case "dashed":
      visiblePath = (
        <path
          d={svgPath}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeDasharray={`${thickness * 3} ${thickness * 2}`}
          strokeLinecap="round"
          strokeLinejoin="round"
          markerEnd={markerEnd}
          pointerEvents="none"
        />
      );
      break;

    case "puckWave": {
      const wavePath = buildWavePath(points, 5 + thickness * 0.5, 0.06);
      visiblePath = (
        <path
          d={wavePath}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeLinejoin="round"
          markerEnd={arrowhead ? `url(#${markerId})` : undefined}
          pointerEvents="none"
        />
      );
      break;
    }

    case "backward":
      visiblePath = (
        <>
          <path
            d={svgPath}
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            strokeDasharray={`${thickness * 2.5} ${thickness * 1.5}`}
            strokeLinecap="round"
            strokeLinejoin="round"
            markerEnd={markerEnd}
            pointerEvents="none"
          />
          <BackwardMarks points={points} color={color} thickness={thickness} />
        </>
      );
      break;

    case "backwardPuck": {
      const bpWavePath = buildWavePath(points, 4 + thickness * 0.3, 0.055);
      visiblePath = (
        <>
          <path
            d={bpWavePath}
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeLinejoin="round"
            markerEnd={arrowhead ? `url(#${markerId})` : undefined}
            pointerEvents="none"
          />
          <BackwardMarks points={points} color={color} thickness={thickness} />
        </>
      );
      break;
    }

    default: // solid
      visiblePath = (
        <path
          d={svgPath}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeLinejoin="round"
          markerEnd={markerEnd}
          pointerEvents="none"
        />
      );
  }

  // Selection highlight
  const selectionHighlight = isSelected ? (
    <path
      d={svgPath}
      fill="none"
      stroke="#38bdf8"
      strokeWidth={thickness + 4}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={0.3}
      pointerEvents="none"
    />
  ) : null;

  // Edit points (shown when selected)
  const editPoints = isSelected
    ? points.map((pt, i) => {
        const isSelectedPt = selectedPointIndex === i;
        return (
          <g key={`pt-${i}`}>
            {/* Touch-friendly larger hit area */}
            <circle
              cx={pt.x}
              cy={pt.y}
              r={12}
              fill="transparent"
              onMouseDown={(e) => {
                e.stopPropagation();
                onPointMouseDown?.(id, i, e);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                onPointMouseDown?.(id, i, e);
              }}
              style={{ cursor: "grab" }}
            />
            {/* Visible point */}
            <circle
              cx={pt.x}
              cy={pt.y}
              r={isSelectedPt ? 6 : 5}
              fill={isSelectedPt ? "#38bdf8" : "#fff"}
              stroke={isSelectedPt ? "#0ea5e9" : "#475569"}
              strokeWidth={2}
              pointerEvents="none"
            />
            {/* Corner indicator */}
            {pt.type === "corner" && (
              <rect
                x={pt.x - 3.5}
                y={pt.y - 3.5}
                width={7}
                height={7}
                fill={isSelectedPt ? "#38bdf8" : "#fff"}
                stroke={isSelectedPt ? "#0ea5e9" : "#475569"}
                strokeWidth={1.5}
                pointerEvents="none"
                transform={`rotate(45, ${pt.x}, ${pt.y})`}
              />
            )}
          </g>
        );
      })
    : null;

  // Segment click zones for inserting points
  const segmentZones =
    isSelected && onSegmentClick
      ? points.slice(0, -1).map((pt, i) => {
          const next = points[i + 1];
          const midX = (pt.x + next.x) / 2;
          const midY = (pt.y + next.y) / 2;
          return (
            <circle
              key={`seg-${i}`}
              cx={midX}
              cy={midY}
              r={5}
              fill="#38bdf8"
              fillOpacity={0.5}
              stroke="#0ea5e9"
              strokeWidth={1}
              style={{ cursor: "crosshair" }}
              onClick={(e) => {
                e.stopPropagation();
                onSegmentClick(id, i, { x: midX, y: midY });
              }}
            />
          );
        })
      : null;

  return (
    <g>
      {arrowhead && <ArrowMarker id={markerId} color={color} />}
      {selectionHighlight}
      {hitArea}
      {visiblePath}
      {segmentZones}
      {editPoints}
    </g>
  );
}
