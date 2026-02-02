/**
 * BeforeAfterSlider — Split view comparing Raw Input vs Output.
 * Shows exampleInput (before) and exampleOutput (after) side-by-side.
 * On mobile, stacks vertically. Drag handle adjusts split on desktop.
 */

import { useState, useCallback } from "react";

export interface BeforeAfterSliderProps {
  beforeLabel?: string;
  afterLabel?: string;
  beforeContent: string;
  afterContent: string;
  className?: string;
}

export function BeforeAfterSlider({
  beforeLabel = "Raw Input",
  afterLabel = "Output",
  beforeContent,
  afterContent,
  className = "",
}: BeforeAfterSliderProps) {
  const [splitPercent, setSplitPercent] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback(() => setIsDragging(true), []);
  const handleMouseUp = useCallback(() => setIsDragging(false), []);
  const handleMouseLeave = useCallback(() => setIsDragging(false), []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(10, Math.min(90, (x / rect.width) * 100));
      setSplitPercent(percent);
    },
    [isDragging]
  );

  return (
    <div
      className={`relative select-none ${className}`}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      role="group"
      aria-label="Before and after comparison"
    >
      {/* Desktop: side-by-side with drag handle */}
      <div className="hidden md:block relative overflow-hidden rounded-xl border border-border bg-muted/30">
        <div className="flex" style={{ minHeight: "200px" }}>
          <div
            className="overflow-hidden shrink-0"
            style={{ width: `${splitPercent}%` }}
          >
            <div className="p-4 border-r border-border bg-muted/20">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {beforeLabel}
              </span>
            </div>
            <div className="p-4 overflow-auto max-h-64">
              <p className="text-sm font-mono whitespace-pre-wrap leading-relaxed">
                {beforeContent}
              </p>
            </div>
          </div>
          <div
            className="absolute top-0 bottom-0 w-1 cursor-col-resize flex items-center justify-center hover:bg-primary/30 transition-colors"
            style={{ left: `${splitPercent}%`, transform: "translateX(-50%)" }}
            onMouseDown={handleMouseDown}
            role="separator"
            aria-valuenow={splitPercent}
            aria-valuemin={10}
            aria-valuemax={90}
            aria-label="Adjust split"
          >
            <div
              className={`w-1 h-12 rounded-full transition-colors ${
                isDragging ? "bg-primary" : "bg-muted-foreground/50 hover:bg-primary"
              }`}
              aria-hidden
            />
          </div>
          <div className="flex-1 overflow-hidden min-w-0">
            <div className="p-4 border-b border-border md:border-b-0 md:border-l border-border bg-muted/20">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {afterLabel}
              </span>
            </div>
            <div className="p-4 overflow-auto max-h-64">
              <p className="text-sm font-mono whitespace-pre-wrap leading-relaxed">
                {afterContent}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: stacked */}
      <div className="md:hidden space-y-4">
        <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
          <div className="p-3 border-b border-border bg-muted/20">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {beforeLabel}
            </span>
          </div>
          <div className="p-4 max-h-48 overflow-auto">
            <p className="text-sm font-mono whitespace-pre-wrap leading-relaxed">
              {beforeContent}
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
          <div className="p-3 border-b border-border bg-muted/20">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {afterLabel}
            </span>
          </div>
          <div className="p-4 max-h-48 overflow-auto">
            <p className="text-sm font-mono whitespace-pre-wrap leading-relaxed">
              {afterContent}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
