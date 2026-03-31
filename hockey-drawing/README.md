# GoalGetr - Hockey Route Drawing Prototype

Internal prototype to test high-quality hockey route drawing for coaches.

## Quick Start

```bash
cd hockey-drawing
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

```
src/
  lib/
    types.ts              # Core data model (HockeyPath, PathPoint, etc.)
    pathUtils.ts          # Vector math, SVG path generation, auto-handles
    freehandBeautifier.ts # Raw stroke → clean editable path
    undoRedo.ts           # History stack for undo/redo
    persistence.ts        # localStorage save/load
  hooks/
    useDrawingState.ts    # Central state management (paths, selection, modes)
  components/
    HockeyRink.tsx        # Full NHL rink SVG (boards, lines, circles, creases)
    PathRenderer.tsx      # Renders all hockey line styles as SVG
    DrawingCanvas.tsx     # SVG canvas with mouse/touch interaction layer
    Toolbar.tsx           # Mode selector, style/color/thickness controls
  app/
    page.tsx              # Main page wiring everything together
```

## Path Data Model

```typescript
interface PathPoint {
  x: number; y: number;
  type: "smooth" | "corner";
  handleIn?: Vec2;    // Auto-computed for smooth points
  handleOut?: Vec2;
}

interface HockeyPath {
  id: string;
  points: PathPoint[];
  style: "solid" | "dashed" | "puckWave" | "backward" | "backwardPuck";
  color: string;
  thickness: number;
  arrowhead: boolean;
}
```

Handles are auto-computed using Catmull-Rom-style tangents. Smooth points get cubic bezier control points; corner points produce sharp angles. This keeps the data model minimal while rendering curves.

## Freehand Beautification Approach

1. **Capture** raw mouse/touch points during drag
2. **Simplify** using Ramer-Douglas-Peucker (epsilon scales with stroke length)
3. **Straight detection** — if all points are near the start→end line, emit a 2-point straight path
4. **Smooth** simplified points with a weighted moving average (2 iterations)
5. **Final RDP pass** to remove remaining noise
6. **Classify points** as smooth or corner based on angle at each point
7. **Emit** a clean `HockeyPath` with editable `PathPoint[]`

Result: rough sketches become clean professional hockey routes with 3-12 control points.

## Point-Based Editing Approach

Figma-style creation:
- Click to place points one at a time
- Live preview shows path and cursor guide line
- Double-click or Enter to finish the path
- Path auto-smooths through placed points using cubic bezier curves

Editing after creation:
- Click a path to select it → shows control points
- Drag any point to reposition
- Click midpoint markers to insert new points
- Toggle any point between smooth (curves) and corner (sharp) with T key
- Delete points with Delete/Backspace key
- Blue highlight shows segment insert positions

## Line Styles

| Style | Rendering |
|-------|-----------|
| Solid | Clean cubic bezier stroke |
| Dashed | Stroke with dash-array |
| Puck Wave | Sine wave perpendicular to path direction |
| Backward | Dashed line + perpendicular tick marks |
| Backward+Puck | Sine wave + perpendicular tick marks |

All styles support arrowheads via SVG markers.

## Keyboard Shortcuts

- **V** — Select mode
- **P** — Point path mode
- **F** — Freehand mode
- **T** — Toggle point smooth/corner
- **Delete/Backspace** — Delete selected point or path
- **Ctrl+Z** — Undo
- **Ctrl+Shift+Z** — Redo
- **Enter** — Finish point path
- **Escape** — Cancel / deselect

## Tech Stack

- Next.js 14 + React 18 + TypeScript
- Tailwind CSS for UI styling
- Pure SVG rendering (no canvas, no external drawing libs)
- Component state + localStorage persistence

## Next Steps for GoalGetr Integration

1. **Player/object layer** — Add draggable player tokens, cones, pucks on top of routes
2. **Multi-path drill builder** — Group paths into drills, add sequencing/timing
3. **Animation playback** — Animate tokens along paths to preview drill flow
4. **Template system** — Pre-built common hockey drills as starting points
5. **Export** — SVG/PNG export for printouts, PDF drill cards
6. **Session integration** — Save drills to GoalGetr session backend
7. **Touch optimization** — Larger touch targets, pinch-zoom on mobile
8. **Path snapping** — Snap to rink zones (blue lines, circles, crease)
