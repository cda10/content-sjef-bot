"use client";

import React from "react";
import { DrawingMode, PathStyle } from "@/lib/types";

interface ToolbarProps {
  mode: DrawingMode;
  currentStyle: PathStyle;
  currentColor: string;
  currentThickness: number;
  currentArrowhead: boolean;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  hasPointSelection: boolean;
  onModeChange: (mode: DrawingMode) => void;
  onStyleChange: (style: PathStyle) => void;
  onColorChange: (color: string) => void;
  onThicknessChange: (thickness: number) => void;
  onToggleArrowhead: () => void;
  onTogglePointType: () => void;
  onDeletePoint: () => void;
  onDeletePath: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClearAll: () => void;
}

const COLORS = ["#cc2936", "#1e6fba", "#000000", "#16a34a", "#d97706", "#7c3aed"];

const STYLES: { value: PathStyle; label: string; icon: React.ReactNode }[] = [
  {
    value: "solid",
    label: "Solid",
    icon: (
      <svg width="28" height="12" viewBox="0 0 28 12">
        <line x1="2" y1="6" x2="26" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: "dashed",
    label: "Dashed",
    icon: (
      <svg width="28" height="12" viewBox="0 0 28 12">
        <line x1="2" y1="6" x2="26" y2="6" stroke="currentColor" strokeWidth="2.5" strokeDasharray="5 3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: "puckWave",
    label: "Puck",
    icon: (
      <svg width="28" height="12" viewBox="0 0 28 12">
        <path d="M 2 6 Q 6 2, 10 6 Q 14 10, 18 6 Q 22 2, 26 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: "backward",
    label: "Back",
    icon: (
      <svg width="28" height="12" viewBox="0 0 28 12">
        <line x1="2" y1="6" x2="26" y2="6" stroke="currentColor" strokeWidth="2" strokeDasharray="5 3" strokeLinecap="round" />
        <line x1="8" y1="2" x2="8" y2="10" stroke="currentColor" strokeWidth="1.5" />
        <line x1="16" y1="2" x2="16" y2="10" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    value: "backwardPuck",
    label: "Back+P",
    icon: (
      <svg width="28" height="12" viewBox="0 0 28 12">
        <path d="M 2 6 Q 6 2, 10 6 Q 14 10, 18 6 Q 22 2, 26 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="8" y1="2" x2="8" y2="10" stroke="currentColor" strokeWidth="1.5" />
        <line x1="20" y1="2" x2="20" y2="10" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
];

function Btn({
  active,
  onClick,
  children,
  title,
  disabled,
  small,
  danger,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
  disabled?: boolean;
  small?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        ${small ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"}
        rounded-md font-medium transition-all duration-150
        ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer hover:scale-105"}
        ${
          active
            ? "bg-sky-500 text-white shadow-md shadow-sky-500/30"
            : danger
            ? "bg-red-900/40 text-red-300 hover:bg-red-800/50"
            : "bg-gray-700/60 text-gray-200 hover:bg-gray-600/70"
        }
      `}
    >
      {children}
    </button>
  );
}

export default function Toolbar({
  mode,
  currentStyle,
  currentColor,
  currentThickness,
  currentArrowhead,
  canUndo,
  canRedo,
  hasSelection,
  hasPointSelection,
  onModeChange,
  onStyleChange,
  onColorChange,
  onThicknessChange,
  onToggleArrowhead,
  onTogglePointType,
  onDeletePoint,
  onDeletePath,
  onUndo,
  onRedo,
  onClearAll,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-gray-900/95 border-b border-gray-700/60 backdrop-blur-sm">
      {/* Mode selector */}
      <div className="flex gap-1">
        <Btn active={mode === "select"} onClick={() => onModeChange("select")} title="Select & Edit (V)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 1l10 5.5L7 8l-1.5 6z" />
          </svg>
        </Btn>
        <Btn active={mode === "point"} onClick={() => onModeChange("point")} title="Point Path (P)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="3" cy="12" r="2" />
            <circle cx="8" cy="4" r="2" />
            <circle cx="13" cy="10" r="2" />
            <path d="M4 11 Q 7 3, 12 9" />
          </svg>
        </Btn>
        <Btn active={mode === "freehand"} onClick={() => onModeChange("freehand")} title="Freehand (F)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M2 12 Q 5 4, 8 8 Q 11 12, 14 5" />
          </svg>
        </Btn>
      </div>

      <div className="w-px h-6 bg-gray-600" />

      {/* Line styles */}
      <div className="flex gap-1">
        {STYLES.map((s) => (
          <Btn
            key={s.value}
            active={currentStyle === s.value}
            onClick={() => onStyleChange(s.value)}
            title={s.label}
            small
          >
            {s.icon}
          </Btn>
        ))}
      </div>

      <div className="w-px h-6 bg-gray-600" />

      {/* Colors */}
      <div className="flex gap-1.5 items-center">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onColorChange(c)}
            className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
              currentColor === c ? "border-white scale-110" : "border-gray-600"
            }`}
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
      </div>

      <div className="w-px h-6 bg-gray-600" />

      {/* Thickness */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-400">W</span>
        <input
          type="range"
          min={1}
          max={6}
          step={0.5}
          value={currentThickness}
          onChange={(e) => onThicknessChange(parseFloat(e.target.value))}
          className="w-16 h-1 accent-sky-400"
        />
        <span className="text-xs text-gray-400 w-4">{currentThickness}</span>
      </div>

      {/* Arrow toggle */}
      <Btn
        active={currentArrowhead}
        onClick={onToggleArrowhead}
        title="Toggle arrowhead"
        small
      >
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
          <path d="M1 6h10M11 6l-4-4M11 6l-4 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Btn>

      <div className="w-px h-6 bg-gray-600" />

      {/* Point editing */}
      <Btn
        onClick={onTogglePointType}
        disabled={!hasPointSelection}
        title="Toggle smooth/corner"
        small
      >
        S/C
      </Btn>
      <Btn
        onClick={onDeletePoint}
        disabled={!hasPointSelection}
        title="Delete point"
        small
        danger
      >
        -Pt
      </Btn>
      <Btn
        onClick={onDeletePath}
        disabled={!hasSelection}
        title="Delete path"
        small
        danger
      >
        Del
      </Btn>

      <div className="flex-1" />

      {/* Undo / Redo / Clear */}
      <div className="flex gap-1">
        <Btn onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" small>
          ↩
        </Btn>
        <Btn onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" small>
          ↪
        </Btn>
        <Btn onClick={onClearAll} title="Clear all" small danger>
          Clear
        </Btn>
      </div>
    </div>
  );
}
