import { Vec2, PathPoint, HockeyPath, PathStyle } from "./types";
import { vecDist, vecSub, vecLen, createPoint, generateId } from "./pathUtils";

// ── Ramer-Douglas-Peucker simplification ─────────────────────

function perpendicularDistance(point: Vec2, lineStart: Vec2, lineEnd: Vec2): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return vecDist(point, lineStart);

  let t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const proj = { x: lineStart.x + t * dx, y: lineStart.y + t * dy };
  return vecDist(point, proj);
}

function rdpSimplify(points: Vec2[], epsilon: number): Vec2[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIdx = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(
      points[i],
      points[0],
      points[points.length - 1]
    );
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > epsilon) {
    const left = rdpSimplify(points.slice(0, maxIdx + 1), epsilon);
    const right = rdpSimplify(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [points[0], points[points.length - 1]];
}

// ── Detect near-straight segments ────────────────────────────

function isNearStraight(points: Vec2[], threshold: number = 5): boolean {
  if (points.length < 3) return true;

  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    if (perpendicularDistance(points[i], start, end) > threshold) {
      return false;
    }
  }
  return true;
}

// ── Smooth a set of points using moving average ──────────────

function smoothPoints(points: Vec2[], iterations: number = 2): Vec2[] {
  let smoothed = [...points.map((p) => ({ ...p }))];

  for (let iter = 0; iter < iterations; iter++) {
    const next: Vec2[] = [smoothed[0]];
    for (let i = 1; i < smoothed.length - 1; i++) {
      next.push({
        x: smoothed[i - 1].x * 0.25 + smoothed[i].x * 0.5 + smoothed[i + 1].x * 0.25,
        y: smoothed[i - 1].y * 0.25 + smoothed[i].y * 0.5 + smoothed[i + 1].y * 0.25,
      });
    }
    next.push(smoothed[smoothed.length - 1]);
    smoothed = next;
  }

  return smoothed;
}

// ── Segment raw points into straight and curved sections ─────

interface Segment {
  type: "straight" | "curve";
  points: Vec2[];
}

function segmentByDirection(points: Vec2[], angleTolerance: number = 0.3): Segment[] {
  if (points.length < 3) {
    return [{ type: "straight", points }];
  }

  const segments: Segment[] = [];
  let currentSegment: Vec2[] = [points[0]];
  let currentType: "straight" | "curve" = "straight";

  for (let i = 1; i < points.length - 1; i++) {
    const v1 = vecSub(points[i], points[i - 1]);
    const v2 = vecSub(points[i + 1], points[i]);
    const l1 = vecLen(v1);
    const l2 = vecLen(v2);

    if (l1 < 1 || l2 < 1) {
      currentSegment.push(points[i]);
      continue;
    }

    const cross = (v1.x * v2.y - v1.y * v2.x) / (l1 * l2);
    const isCurving = Math.abs(cross) > angleTolerance;

    if (isCurving !== (currentType === "curve")) {
      if (currentSegment.length >= 2) {
        segments.push({ type: currentType, points: [...currentSegment] });
      }
      currentSegment = [points[i]];
      currentType = isCurving ? "curve" : "straight";
    } else {
      currentSegment.push(points[i]);
    }
  }

  currentSegment.push(points[points.length - 1]);
  if (currentSegment.length >= 2) {
    segments.push({ type: currentType, points: currentSegment });
  }

  return segments;
}

// ── Main beautification: raw stroke → clean PathPoints ───────

export function beautifyFreehand(rawPoints: Vec2[]): PathPoint[] {
  if (rawPoints.length < 2) {
    return rawPoints.map((p) => createPoint(p.x, p.y, "smooth"));
  }

  // 1. Calculate total length to scale epsilon
  let totalLen = 0;
  for (let i = 1; i < rawPoints.length; i++) {
    totalLen += vecDist(rawPoints[i], rawPoints[i - 1]);
  }

  // Very short strokes: just make a straight line
  if (totalLen < 20) {
    return [
      createPoint(rawPoints[0].x, rawPoints[0].y, "corner"),
      createPoint(
        rawPoints[rawPoints.length - 1].x,
        rawPoints[rawPoints.length - 1].y,
        "corner"
      ),
    ];
  }

  // 2. Simplify with RDP
  const epsilon = Math.max(3, totalLen * 0.015);
  const simplified = rdpSimplify(rawPoints, epsilon);

  // 3. If it's nearly straight, return a 2-point path
  if (isNearStraight(simplified, 8)) {
    return [
      createPoint(simplified[0].x, simplified[0].y, "corner"),
      createPoint(
        simplified[simplified.length - 1].x,
        simplified[simplified.length - 1].y,
        "corner"
      ),
    ];
  }

  // 4. Smooth the simplified points
  const smoothed = smoothPoints(simplified, 2);

  // 5. Final simplification pass for cleaner results
  const finalEpsilon = Math.max(2, totalLen * 0.01);
  const finalPoints = rdpSimplify(smoothed, finalEpsilon);

  // 6. Ensure we have a reasonable number of points (3-12 for most routes)
  let result = finalPoints;
  if (result.length > 15) {
    result = rdpSimplify(result, finalEpsilon * 2);
  }

  // 7. Convert to PathPoints, deciding smooth vs corner
  return result.map((p, i) => {
    if (i === 0 || i === result.length - 1) {
      return createPoint(p.x, p.y, "corner");
    }

    // Check angle at this point to decide smooth vs corner
    const prev = result[i - 1];
    const next = result[i + 1];
    const v1 = vecSub(p, prev);
    const v2 = vecSub(next, p);
    const l1 = vecLen(v1);
    const l2 = vecLen(v2);

    if (l1 < 1 || l2 < 1) return createPoint(p.x, p.y, "smooth");

    const dot = (v1.x * v2.x + v1.y * v2.y) / (l1 * l2);
    // Sharp angle → corner, gentle curve → smooth
    return createPoint(p.x, p.y, dot < 0.3 ? "corner" : "smooth");
  });
}

// ── Create a HockeyPath from freehand stroke ─────────────────

export function freehandToPath(
  rawPoints: Vec2[],
  style: PathStyle,
  color: string,
  thickness: number,
  arrowhead: boolean
): HockeyPath {
  const points = beautifyFreehand(rawPoints);

  return {
    id: generateId(),
    points,
    style,
    color,
    thickness,
    arrowhead,
  };
}
