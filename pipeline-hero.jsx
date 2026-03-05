import { useState } from "react";

const STAGES = [
  {
    id: "hack",
    label: "Hack",
    description: "Submitted and demoed",
    count: 12,
    avgDays: 4.2,
    criteria: [
      "Demo exists",
      "Problem Exchange link if applicable",
    ],
    colour: "teal",
  },
  {
    id: "validated",
    label: "Validated Prototype",
    description: "Tested with real users and evidence of value",
    count: 5,
    avgDays: 11.6,
    criteria: [
      "At least 3 people outside the original team have tried it",
      "At least 1 piece of qualitative feedback collected",
    ],
    colour: "teal",
  },
  {
    id: "incubating",
    label: "Incubating Project",
    description: "Allocated time/resources with active development",
    count: 2,
    avgDays: 28.3,
    criteria: [
      "Evidence of repeated use (not only demo usage)",
      "Named owner committed to ongoing development",
      "Endorsement from at least 1 team lead outside the builder team",
    ],
    colour: "teal",
  },
  {
    id: "candidate",
    label: "Product Candidate",
    description: "Business case, sponsor, and roadmap identified",
    count: 1,
    avgDays: 0,
    criteria: [
      "Business case drafted",
      "Target internal user base or market identified",
      "Technical feasibility confirmed",
      "Named leadership sponsor",
    ],
    colour: "teal",
  },
];

const CONVERSIONS = [
  { from: "Hack", to: "Validated", rate: 41.7 },
  { from: "Validated", to: "Incubating", rate: 40.0 },
  { from: "Incubating", to: "Candidate", rate: 50.0 },
];

const TOTAL = { entered: 12, graduated: 1 };

/* -------------------------------------------------- */
/*  Colour tokens (HackDay design system)             */
/* -------------------------------------------------- */
const T = {
  bg: "#f8fafa",
  surface: "#ffffff",
  teal: "#0d9488",
  tealLight: "#ccfbf1",
  tealMid: "#5eead4",
  tealDark: "#0f766e",
  textPrimary: "#1e293b",
  textSecondary: "#64748b",
  textMuted: "#94a3b8",
  border: "#e2e8f0",
  arrowBg: "#f1f5f9",
  activeRing: "#0d948833",
};

/* -------------------------------------------------- */
/*  Conversion arrow between stages                   */
/* -------------------------------------------------- */
function ConversionArrow({ rate }) {
  return (
    <div className="flex flex-col items-center justify-center px-1" style={{ minWidth: 56 }}>
      <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
        <path
          d="M4 12H32M32 12L24 5M32 12L24 19"
          stroke={T.teal}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.5"
        />
      </svg>
      <span
        className="text-xs font-semibold tabular-nums"
        style={{ color: rate > 0 ? T.teal : T.textMuted }}
      >
        {rate > 0 ? `${rate.toFixed(0)}%` : "-"}
      </span>
    </div>
  );
}

/* -------------------------------------------------- */
/*  Individual stage node                             */
/* -------------------------------------------------- */
function StageNode({ stage, index, isActive, onClick }) {
  const active = isActive;
  return (
    <button
      onClick={() => onClick(stage.id)}
      className="relative flex flex-col items-start text-left transition-all duration-200 rounded-xl p-5 cursor-pointer flex-1 min-w-0"
      style={{
        background: active ? T.tealLight : T.surface,
        border: `2px solid ${active ? T.teal : T.border}`,
        boxShadow: active
          ? `0 0 0 4px ${T.activeRing}, 0 1px 3px rgba(0,0,0,0.06)`
          : "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {/* Stage number pill */}
      <div
        className="flex items-center justify-center rounded-full text-xs font-bold mb-3"
        style={{
          width: 28,
          height: 28,
          background: active ? T.teal : T.arrowBg,
          color: active ? "#fff" : T.textSecondary,
        }}
      >
        {index + 1}
      </div>

      {/* Label */}
      <span
        className="text-sm font-semibold leading-tight mb-1"
        style={{ color: T.textPrimary }}
      >
        {stage.label}
      </span>

      {/* Description */}
      <span
        className="text-xs leading-snug mb-4"
        style={{ color: T.textSecondary }}
      >
        {stage.description}
      </span>

      {/* Metrics row */}
      <div className="flex items-end gap-4 mt-auto w-full">
        <div className="flex flex-col">
          <span className="text-2xl font-bold tabular-nums" style={{ color: T.teal, lineHeight: 1 }}>
            {stage.count}
          </span>
          <span className="text-xs mt-1" style={{ color: T.textMuted }}>
            items
          </span>
        </div>
        {stage.avgDays > 0 && (
          <div className="flex flex-col">
            <span className="text-lg font-semibold tabular-nums" style={{ color: T.textPrimary, lineHeight: 1 }}>
              {stage.avgDays}
            </span>
            <span className="text-xs mt-1" style={{ color: T.textMuted }}>
              avg days
            </span>
          </div>
        )}
      </div>

      {/* Criteria count badge */}
      <div
        className="absolute top-4 right-4 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
        style={{ background: T.arrowBg, color: T.textMuted }}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 4a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0V5zm.75 6.5a.75.75 0 100-1.5.75.75 0 000 1.5z" />
        </svg>
        {stage.criteria.length} gates
      </div>
    </button>
  );
}

/* -------------------------------------------------- */
/*  Expanded stage detail panel                       */
/* -------------------------------------------------- */
function StageDetail({ stage }) {
  if (!stage) return null;
  return (
    <div
      className="rounded-xl p-6 mt-2 transition-all duration-300"
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderLeft: `4px solid ${T.teal}`,
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold" style={{ color: T.textPrimary }}>
            {stage.label}
          </h3>
          <p className="text-sm mt-0.5" style={{ color: T.textSecondary }}>
            {stage.description}
          </p>
        </div>
        <span
          className="text-xs font-medium rounded-full px-3 py-1"
          style={{ background: T.tealLight, color: T.tealDark }}
        >
          {stage.count} items in stage
        </span>
      </div>

      {/* Gate criteria */}
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: T.textMuted }}>
          Gate criteria
        </p>
        <div className="flex flex-col gap-2">
          {stage.criteria.map((c, i) => (
            <div key={i} className="flex items-start gap-2">
              <div
                className="mt-0.5 flex-shrink-0 rounded-sm flex items-center justify-center"
                style={{ width: 18, height: 18, border: `2px solid ${T.tealMid}` }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5.5L4 7.5L8 3" stroke={T.teal} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-sm" style={{ color: T.textPrimary }}>{c}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Placeholder item list */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: T.textMuted }}>
          Items
        </p>
        {stage.count > 0 ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: Math.min(stage.count, 3) }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg px-4 py-3 flex items-center justify-between"
                style={{ background: T.bg, border: `1px solid ${T.border}` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="rounded-full"
                    style={{
                      width: 32,
                      height: 32,
                      background: [T.teal, T.tealMid, T.tealDark, "#f59e0b", "#8b5cf6"][i % 5],
                      opacity: 0.7,
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium" style={{ color: T.textPrimary }}>
                      Example Hack {i + 1}
                    </p>
                    <p className="text-xs" style={{ color: T.textMuted }}>
                      Team Alpha - 3 days in stage
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium" style={{ color: T.teal }}>
                  View
                </span>
              </div>
            ))}
            {stage.count > 3 && (
              <p className="text-xs text-center py-1" style={{ color: T.textSecondary }}>
                +{stage.count - 3} more items
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm py-4 text-center" style={{ color: T.textMuted }}>
            No items in this stage
          </p>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------- */
/*  Summary headline bar                              */
/* -------------------------------------------------- */
function SummaryBar() {
  return (
    <div
      className="flex items-center justify-between rounded-xl px-6 py-4 mb-6"
      style={{ background: T.surface, border: `1px solid ${T.border}` }}
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: T.textPrimary }}>
          Pipeline
        </h1>
        <p className="text-sm mt-0.5" style={{ color: T.textSecondary }}>
          Stage-gate board from hack to product candidate
        </p>
      </div>
      <div className="flex items-center gap-8">
        <div className="flex flex-col items-end">
          <span className="text-2xl font-bold tabular-nums" style={{ color: T.teal }}>
            {TOTAL.entered}
          </span>
          <span className="text-xs" style={{ color: T.textMuted }}>entered</span>
        </div>
        <div className="flex flex-col items-center px-4">
          <svg width="32" height="16" viewBox="0 0 32 16" fill="none">
            <path d="M2 8H26M26 8L20 3M26 8L20 13" stroke={T.tealMid} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="flex flex-col items-start">
          <span className="text-2xl font-bold tabular-nums" style={{ color: T.tealDark }}>
            {TOTAL.graduated}
          </span>
          <span className="text-xs" style={{ color: T.textMuted }}>graduated</span>
        </div>
        <div
          className="rounded-full px-3 py-1 text-sm font-semibold"
          style={{ background: T.tealLight, color: T.tealDark }}
        >
          {((TOTAL.graduated / TOTAL.entered) * 100).toFixed(0)}% throughput
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------- */
/*  Main pipeline page                                */
/* -------------------------------------------------- */
export default function PipelinePage() {
  const [activeStage, setActiveStage] = useState(null);

  const selectedStage = STAGES.find((s) => s.id === activeStage) || null;

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}>
      {/* Load DM Sans */}
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap"
        rel="stylesheet"
      />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Summary bar */}
        <SummaryBar />

        {/* Pipeline hero - stage flow */}
        <div
          className="rounded-xl p-6 mb-2"
          style={{ background: T.surface, border: `1px solid ${T.border}` }}
        >
          {/* Stage nodes with arrows */}
          <div className="flex items-stretch gap-0">
            {STAGES.map((stage, i) => (
              <div key={stage.id} className="flex items-stretch flex-1 min-w-0">
                <StageNode
                  stage={stage}
                  index={i}
                  isActive={activeStage === stage.id}
                  onClick={setActiveStage}
                />
                {i < STAGES.length - 1 && (
                  <ConversionArrow rate={CONVERSIONS[i]?.rate || 0} />
                )}
              </div>
            ))}
          </div>

          {/* Conversion summary strip */}
          <div
            className="flex items-center justify-between mt-4 pt-4 px-1"
            style={{ borderTop: `1px solid ${T.border}` }}
          >
            <span className="text-xs" style={{ color: T.textMuted }}>
              Click a stage to see gate criteria and items
            </span>
            <div className="flex items-center gap-4">
              {CONVERSIONS.map((c, i) => (
                <span key={i} className="text-xs tabular-nums" style={{ color: T.textSecondary }}>
                  {c.from} &rarr; {c.to}:{" "}
                  <strong style={{ color: c.rate > 0 ? T.teal : T.textMuted }}>
                    {c.rate > 0 ? `${c.rate}%` : "-"}
                  </strong>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Stage detail panel */}
        {selectedStage && <StageDetail stage={selectedStage} />}

        {/* Empty state when nothing selected */}
        {!selectedStage && (
          <div
            className="rounded-xl py-16 flex flex-col items-center justify-center mt-2"
            style={{ background: T.surface, border: `1px dashed ${T.border}` }}
          >
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mb-3">
              <circle cx="24" cy="24" r="20" stroke={T.border} strokeWidth="2" strokeDasharray="4 4" />
              <path d="M18 24H30M30 24L26 20M30 24L26 28" stroke={T.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm font-medium" style={{ color: T.textSecondary }}>
              Select a stage above to view details
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
