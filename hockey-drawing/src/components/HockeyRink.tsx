import React from "react";

/**
 * Full ice hockey rink SVG.
 * Standard NHL proportions: 200ft x 85ft → we use a 1000x425 viewBox.
 * All markings: center line, blue lines, goal lines, face-off circles,
 * creases, and boards with rounded corners.
 */

const RINK_W = 1000;
const RINK_H = 425;
const CORNER_R = 70;
const BOARD_STROKE = 3;

// Proportional positions
const CENTER_X = RINK_W / 2;
const CENTER_Y = RINK_H / 2;
const BLUE_LINE_LEFT = 295;
const BLUE_LINE_RIGHT = 705;
const GOAL_LINE_LEFT = 55;
const GOAL_LINE_RIGHT = 945;

// Face-off circle radius
const FACEOFF_R = 35;
// Center circle radius
const CENTER_CIRCLE_R = 35;

// Face-off dot positions
const faceoffDots: [number, number][] = [
  // Neutral zone
  [220, CENTER_Y - 100],
  [220, CENTER_Y + 100],
  [780, CENTER_Y - 100],
  [780, CENTER_Y + 100],
  // Offensive/defensive zone circles
  [175, CENTER_Y - 95],
  [175, CENTER_Y + 95],
  [825, CENTER_Y - 95],
  [825, CENTER_Y + 95],
];

// Face-off circles (the four big ones in zones)
const faceoffCircles: [number, number][] = [
  [175, CENTER_Y - 95],
  [175, CENTER_Y + 95],
  [825, CENTER_Y - 95],
  [825, CENTER_Y + 95],
];

export default function HockeyRink() {
  return (
    <g id="hockey-rink">
      {/* Ice surface */}
      <rect
        x={0}
        y={0}
        width={RINK_W}
        height={RINK_H}
        rx={CORNER_R}
        ry={CORNER_R}
        fill="#f0f4f8"
        stroke="#1a1a2e"
        strokeWidth={BOARD_STROKE}
      />

      {/* Center line (red) */}
      <line
        x1={CENTER_X}
        y1={0}
        x2={CENTER_X}
        y2={RINK_H}
        stroke="#cc2936"
        strokeWidth={2.5}
        strokeDasharray="12 8"
      />

      {/* Blue lines */}
      <line
        x1={BLUE_LINE_LEFT}
        y1={0}
        x2={BLUE_LINE_LEFT}
        y2={RINK_H}
        stroke="#1e6fba"
        strokeWidth={4}
      />
      <line
        x1={BLUE_LINE_RIGHT}
        y1={0}
        x2={BLUE_LINE_RIGHT}
        y2={RINK_H}
        stroke="#1e6fba"
        strokeWidth={4}
      />

      {/* Goal lines (red) */}
      <line
        x1={GOAL_LINE_LEFT}
        y1={35}
        x2={GOAL_LINE_LEFT}
        y2={RINK_H - 35}
        stroke="#cc2936"
        strokeWidth={2}
      />
      <line
        x1={GOAL_LINE_RIGHT}
        y1={35}
        x2={GOAL_LINE_RIGHT}
        y2={RINK_H - 35}
        stroke="#cc2936"
        strokeWidth={2}
      />

      {/* Center ice circle */}
      <circle
        cx={CENTER_X}
        cy={CENTER_Y}
        r={CENTER_CIRCLE_R}
        fill="none"
        stroke="#1e6fba"
        strokeWidth={2}
      />
      {/* Center dot */}
      <circle cx={CENTER_X} cy={CENTER_Y} r={4} fill="#1e6fba" />

      {/* Face-off circles */}
      {faceoffCircles.map(([cx, cy], i) => (
        <circle
          key={`foc-${i}`}
          cx={cx}
          cy={cy}
          r={FACEOFF_R}
          fill="none"
          stroke="#cc2936"
          strokeWidth={1.5}
        />
      ))}

      {/* Face-off dots */}
      {faceoffDots.map(([cx, cy], i) => (
        <circle
          key={`fod-${i}`}
          cx={cx}
          cy={cy}
          r={3.5}
          fill="#cc2936"
        />
      ))}

      {/* Goal creases */}
      {[GOAL_LINE_LEFT, GOAL_LINE_RIGHT].map((gx, i) => {
        const dir = i === 0 ? 1 : -1;
        return (
          <path
            key={`crease-${i}`}
            d={`M ${gx} ${CENTER_Y - 22}
                A 22 22 0 0 ${i === 0 ? 1 : 0} ${gx} ${CENTER_Y + 22}
                L ${gx} ${CENTER_Y - 22} Z`}
            fill="#8ecae6"
            fillOpacity={0.35}
            stroke="#cc2936"
            strokeWidth={1.2}
          />
        );
      })}

      {/* Goal nets (simplified rectangles) */}
      <rect
        x={30}
        y={CENTER_Y - 12}
        width={25}
        height={24}
        rx={3}
        fill="none"
        stroke="#888"
        strokeWidth={1.5}
      />
      <rect
        x={945}
        y={CENTER_Y - 12}
        width={25}
        height={24}
        rx={3}
        fill="none"
        stroke="#888"
        strokeWidth={1.5}
      />

      {/* Trapezoid behind goals */}
      {[
        { gx: GOAL_LINE_LEFT, dir: -1 },
        { gx: GOAL_LINE_RIGHT, dir: 1 },
      ].map(({ gx, dir }, i) => (
        <path
          key={`trap-${i}`}
          d={`M ${gx} ${CENTER_Y - 55} L ${gx + dir * 30} ${CENTER_Y - 35}
              L ${gx + dir * 30} ${CENTER_Y + 35} L ${gx} ${CENTER_Y + 55}`}
          fill="none"
          stroke="#cc2936"
          strokeWidth={1}
          opacity={0.4}
        />
      ))}
    </g>
  );
}

export { RINK_W, RINK_H };
