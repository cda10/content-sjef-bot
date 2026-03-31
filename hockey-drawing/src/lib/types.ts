export type PointType = "smooth" | "corner";

export type PathStyle =
  | "solid"
  | "dashed"
  | "puckWave"
  | "backward"
  | "backwardPuck";

export interface Vec2 {
  x: number;
  y: number;
}

export interface PathPoint {
  x: number;
  y: number;
  type: PointType;
  handleIn?: Vec2;
  handleOut?: Vec2;
}

export interface HockeyPath {
  id: string;
  points: PathPoint[];
  style: PathStyle;
  color: string;
  thickness: number;
  arrowhead: boolean;
}

export type DrawingMode = "freehand" | "point" | "select";

export interface DrawingState {
  paths: HockeyPath[];
  selectedPathId: string | null;
  selectedPointIndex: number | null;
  mode: DrawingMode;
  currentStyle: PathStyle;
  currentColor: string;
  currentThickness: number;
  currentArrowhead: boolean;
}

export interface HistoryEntry {
  paths: HockeyPath[];
  selectedPathId: string | null;
  selectedPointIndex: number | null;
}
