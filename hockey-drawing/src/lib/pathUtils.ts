import { Vec2, PathPoint, HockeyPath, PathStyle } from "./types";

// ── Vector math ──────────────────────────────────────────────

export function vec(x: number, y: number): Vec2 {
  return { x, y };
}

export function vecAdd(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function vecSub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function vecScale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function vecLen(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function vecDist(a: Vec2, b: Vec2): number {
  return vecLen(vecSub(a, b));
}

export function vecNorm(v: Vec2): Vec2 {
  const l = vecLen(v);
  return l === 0 ? { x: 0, y: 0 } : { x: v.x / l, y: v.y / l };
}

export function vecPerp(v: Vec2): Vec2 {
  return { x: -v.y, y: v.x };
}

export function vecLerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

// ── ID generation ────────────────────────────────────────────

export function generateId(): string {
  return `path_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Path creation ────────────────────────────────────────────

export function createPath(
  points: PathPoint[],
  style: PathStyle = "solid",
  color: string = "#cc2936",
  thickness: number = 3,
  arrowhead: boolean = true
): HockeyPath {
  return {
    id: generateId(),
    points,
    style,
    color,
    thickness,
    arrowhead,
  };
}

export function createPoint(
  x: number,
  y: number,
  type: "smooth" | "corner" = "smooth"
): PathPoint {
  return { x, y, type };
}

// ── Auto-smooth handles ─────────────────────────────────────
// Compute cubic bezier control handles for smooth points using
// Catmull-Rom-style tangents. Corner points get no handles.

export function computeAutoHandles(points: PathPoint[]): PathPoint[] {
  if (points.length < 2) return points;

  return points.map((pt, i) => {
    if (pt.type === "corner") {
      return { ...pt, handleIn: undefined, handleOut: undefined };
    }

    const prev = points[i - 1];
    const next = points[i + 1];

    if (!prev && !next) return pt;

    let tangent: Vec2;
    if (!prev) {
      tangent = vecSub(next!, pt);
    } else if (!next) {
      tangent = vecSub(pt, prev);
    } else {
      tangent = vecScale(vecSub(next, prev), 0.5);
    }

    const tension = 0.35;
    const handleOut = next
      ? { x: pt.x + tangent.x * tension, y: pt.y + tangent.y * tension }
      : undefined;
    const handleIn = prev
      ? { x: pt.x - tangent.x * tension, y: pt.y - tangent.y * tension }
      : undefined;

    return { ...pt, handleIn, handleOut };
  });
}

// ── SVG path string from points ──────────────────────────────

export function buildSvgPath(points: PathPoint[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  const pts = computeAutoHandles(points);
  let d = `M ${pts[0].x} ${pts[0].y}`;

  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cp1 = prev.handleOut || prev;
    const cp2 = curr.handleIn || curr;

    // Use cubic bezier if we have handles, otherwise line
    const hasCurve =
      (prev.handleOut && (prev.handleOut.x !== prev.x || prev.handleOut.y !== prev.y)) ||
      (curr.handleIn && (curr.handleIn.x !== curr.x || curr.handleIn.y !== curr.y));

    if (hasCurve) {
      d += ` C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${curr.x} ${curr.y}`;
    } else {
      d += ` L ${curr.x} ${curr.y}`;
    }
  }

  return d;
}

// ── Path length utilities ────────────────────────────────────

export function samplePointsAlongPath(
  points: PathPoint[],
  numSamples: number
): Vec2[] {
  if (points.length < 2) return points.map((p) => ({ x: p.x, y: p.y }));

  const pts = computeAutoHandles(points);
  const samples: Vec2[] = [];

  // Get total segments
  const segments = pts.length - 1;
  const samplesPerSegment = Math.max(2, Math.ceil(numSamples / segments));

  for (let i = 0; i < segments; i++) {
    const p0 = pts[i];
    const p3 = pts[i + 1];
    const p1 = p0.handleOut || p0;
    const p2 = p3.handleIn || p3;

    for (let j = 0; j <= samplesPerSegment; j++) {
      if (i > 0 && j === 0) continue; // skip duplicate join points
      const t = j / samplesPerSegment;
      const mt = 1 - t;
      samples.push({
        x:
          mt * mt * mt * p0.x +
          3 * mt * mt * t * p1.x +
          3 * mt * t * t * p2.x +
          t * t * t * p3.x,
        y:
          mt * mt * mt * p0.y +
          3 * mt * mt * t * p1.y +
          3 * mt * t * t * p2.y +
          t * t * t * p3.y,
      });
    }
  }

  return samples;
}

// ── Insert point between two existing points ─────────────────

export function insertPointBetween(
  path: HockeyPath,
  index: number
): HockeyPath {
  if (index < 0 || index >= path.points.length - 1) return path;

  const a = path.points[index];
  const b = path.points[index + 1];
  const mid = createPoint(
    (a.x + b.x) / 2,
    (a.y + b.y) / 2,
    "smooth"
  );

  const newPoints = [...path.points];
  newPoints.splice(index + 1, 0, mid);

  return { ...path, points: newPoints };
}

// ── Deep clone a path ────────────────────────────────────────

export function clonePath(path: HockeyPath): HockeyPath {
  return JSON.parse(JSON.stringify(path));
}

export function clonePaths(paths: HockeyPath[]): HockeyPath[] {
  return JSON.parse(JSON.stringify(paths));
}
