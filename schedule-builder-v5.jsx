import { useState, useCallback } from "react";

/* ── Design Tokens ─── */
const T = {
  teal: "#14b8a6",
  tealLight: "#ccfbf1",
  tealDark: "#0d9488",
  tealBg: "#f0fdfa",
  red: "#ef4444",
  redLight: "#fee2e2",
  redDark: "#991b1b",
  orange: "#f97316",
  orangeLight: "#fff7ed",
  purple: "#8b5cf6",
  purpleLight: "#ede9fe",
  blue: "#3b82f6",
  blueLight: "#dbeafe",
  pink: "#ec4899",
  pinkLight: "#fce7f3",
  white: "#ffffff",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#4b5563",
  gray700: "#374151",
  gray800: "#1f2937",
  gray900: "#111827",
  pageBg: "#f8fafc",
  radius: 14,
  radiusLg: 16,
  radiusSm: 8,
};

/* ── Phase definitions ─── */
const PHASE_TEMPLATES = {
  pre: {
    label: "Pre-Event",
    desc: "Milestones before hacking begins",
    events: [
      { id: "reg-opens", name: "Registration Opens", desc: "Portal opens for sign-ups", signal: "start", defaultOffset: -14, unit: "days before" },
      { id: "team-formation", name: "Team Formation Opens", desc: "Marketplace opens for team building", signal: "start", defaultOffset: -7, unit: "days before" },
      { id: "reg-closes", name: "Registration Closes", desc: "Final deadline to register", signal: "deadline", defaultOffset: -1, unit: "days before" },
    ],
  },
  hack: {
    label: "Hack Day",
    desc: "What happens during hacking",
    events: [
      { id: "opening", name: "Opening Ceremony", desc: "Kickoff and announcements", signal: "ceremony", defaultTime: "09:00" },
      { id: "hacking-begins", name: "Hacking Begins", desc: "Teams start building", signal: "start", defaultTime: "09:30", isAnchor: true },
      { id: "code-freeze", name: "Code Freeze", desc: "Final submissions due", signal: "deadline", defaultTime: "14:00", lastDayOnly: true },
      { id: "presentations", name: "Presentations", desc: "Teams present their projects", signal: "presentation", defaultTime: "15:00", lastDayOnly: true },
      { id: "judging", name: "Judging Period", desc: "Judges evaluate submissions", signal: "judging", defaultTime: "16:30", lastDayOnly: true },
      { id: "results", name: "Results Announced", desc: "Winners announced and celebrated", signal: "ceremony", defaultTime: "18:00", lastDayOnly: true },
    ],
  },

};

/* ── Signal colours ─── */
function getSignalStyle(signal) {
  switch (signal) {
    case "start": return { bg: T.tealBg, border: `${T.teal}35`, iconBg: T.tealLight, accent: T.teal, text: T.tealDark };
    case "deadline": return { bg: T.redLight, border: `${T.red}25`, iconBg: `${T.red}12`, accent: T.red, text: T.redDark };
    case "ceremony": return { bg: T.orangeLight, border: `${T.orange}20`, iconBg: `${T.orange}12`, accent: T.orange, text: "#9a3412" };
    case "presentation": return { bg: T.pinkLight, border: `${T.pink}20`, iconBg: `${T.pink}12`, accent: T.pink, text: "#9d174d" };
    case "judging": return { bg: T.blueLight, border: `${T.blue}20`, iconBg: `${T.blue}12`, accent: T.blue, text: "#1e40af" };
    default: return { bg: T.white, border: T.gray200, iconBg: T.gray100, accent: T.gray400, text: T.gray700 };
  }
}

/* ── Relative date display ─── */
function RelativeDate({ offset, unit, anchorDate }) {
  const d = new Date(anchorDate);
  if (unit === "days before") d.setDate(d.getDate() + offset);
  else d.setDate(d.getDate() + offset);
  const formatted = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const label = offset === 0 ? "Hack day" : Math.abs(offset) === 1 ? `${Math.abs(offset)} day ${offset < 0 ? "before" : "after"}` : `${Math.abs(offset)} days ${offset < 0 ? "before" : "after"}`;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: T.gray800, fontFamily: "'SF Mono', monospace" }}>{formatted}</span>
      <span style={{ fontSize: 11, color: T.gray400 }}>{label}</span>
    </div>
  );
}

/* ── Event row ─── */
function EventRow({ event, enabled, onToggle, phaseType, anchorDate, offset, time, onOffsetChange, onTimeChange }) {
  const s = getSignalStyle(event.signal);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "14px 16px", borderRadius: T.radius,
      background: enabled ? s.bg : T.white,
      border: `1.5px solid ${enabled ? s.border : T.gray200}`,
      borderLeft: enabled && event.signal !== "neutral" ? `3px solid ${s.accent}` : `1.5px solid ${enabled ? s.border : T.gray200}`,
      opacity: enabled ? 1 : 0.45,
      transition: "all 0.15s",
    }}>
      {/* Toggle */}
      <button
        onClick={onToggle}
        style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0, cursor: "pointer",
          border: `2px solid ${enabled ? T.teal : T.gray300}`,
          background: enabled ? T.teal : T.white,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.12s", padding: 0,
        }}
      >
        {enabled && <span style={{ color: T.white, fontSize: 11, fontWeight: 700 }}>✓</span>}
      </button>

      {/* Name + desc */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: enabled ? T.gray900 : T.gray500, lineHeight: 1.3 }}>
          {event.name}
        </div>
        <div style={{ fontSize: 12, color: T.gray400, lineHeight: 1.3, marginTop: 1 }}>
          {event.desc}
        </div>
      </div>

      {/* Date/time controls */}
      {enabled && phaseType === "milestone" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: T.white, borderRadius: T.radiusSm, border: `1px solid ${T.gray200}`, padding: "4px 4px 4px 10px" }}>
            <input
              type="number"
              value={Math.abs(offset)}
              onChange={(e) => onOffsetChange(event.unit === "days before" ? -Math.abs(parseInt(e.target.value) || 0) : Math.abs(parseInt(e.target.value) || 0))}
              style={{ width: 36, border: "none", fontSize: 13, fontWeight: 600, color: T.gray800, textAlign: "center", outline: "none", background: "transparent", fontFamily: "'SF Mono', monospace" }}
            />
            <span style={{ fontSize: 11, color: T.gray400, whiteSpace: "nowrap", paddingRight: 6 }}>
              {event.unit}
            </span>
          </div>
          <RelativeDate offset={offset} unit={event.unit} anchorDate={anchorDate} />
        </div>
      )}

      {enabled && phaseType === "timed" && (
        <input
          type="time"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          style={{
            padding: "6px 10px", borderRadius: T.radiusSm,
            border: `1px solid ${T.gray200}`, fontSize: 13, fontWeight: 600,
            color: s.accent, background: T.white, outline: "none",
            fontFamily: "'SF Mono', monospace", flexShrink: 0,
          }}
        />
      )}

    </div>
  );
}

/* ── Phase tab ─── */
function PhaseTab({ label, isActive, onClick, isHack, dayNum, hasEvents }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "10px 16px", borderRadius: 10,
        border: `1.5px solid ${isActive ? (isHack ? T.teal : T.gray300) : "transparent"}`,
        background: isActive ? (isHack ? T.tealBg : T.white) : "transparent",
        color: isActive ? (isHack ? T.tealDark : T.gray800) : T.gray400,
        fontSize: 13, fontWeight: isActive ? 600 : 500, cursor: "pointer",
        transition: "all 0.15s", whiteSpace: "nowrap",
      }}
    >
      <span>{dayNum ? `${label} ${dayNum}` : label}</span>
      {hasEvents && !isActive && (
        <span style={{ width: 6, height: 6, borderRadius: 3, background: T.teal, flexShrink: 0 }} />
      )}
    </button>
  );
}

/* ── Timeline preview bar ─── */
function TimelinePreview({ phases, activePhase, onPhaseClick, anchorDate, duration }) {
  const d = new Date(anchorDate);
  const hackStart = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const endDate = new Date(anchorDate);
  endDate.setDate(endDate.getDate() + duration - 1);
  const hackEnd = endDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "0 4px" }}>
      {phases.map((phase, i) => {
        const isActive = phase.key === activePhase;
        const isHack = phase.type === "hack";
        return (
          <div key={phase.key} style={{ display: "flex", alignItems: "center", gap: 2, flex: isHack ? 2 : 1 }}>
            <div
              onClick={() => onPhaseClick(phase.key)}
              style={{
                height: 6, borderRadius: 3, flex: 1, cursor: "pointer",
                background: isActive ? T.teal : isHack ? T.tealLight : T.gray200,
                transition: "all 0.15s",
              }}
              title={phase.label}
            />
            {i < phases.length - 1 && (
              <div style={{ width: 4, height: 4, borderRadius: 2, background: T.gray200, flexShrink: 0 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Main Component ─── */
export default function ScheduleBuilder() {
  const [duration, setDuration] = useState(2);
  const [anchorDate, setAnchorDate] = useState("2026-06-21");
  const [anchorTime, setAnchorTime] = useState("09:00");
  const [timezone, setTimezone] = useState("Europe/London");
  const [activePhase, setActivePhase] = useState("pre");

  // Event states: { eventId: { enabled: bool, offset: number, time: string } }
  const [eventStates, setEventStates] = useState(() => {
    const states = {};
    // Pre-event defaults
    PHASE_TEMPLATES.pre.events.forEach((e) => {
      states[e.id] = { enabled: true, offset: e.defaultOffset, time: "" };
    });
    // Hack day defaults
    PHASE_TEMPLATES.hack.events.forEach((e) => {
      states[e.id] = { enabled: true, offset: 0, time: e.defaultTime || "" };
    });
    return states;
  });

  const updateEvent = useCallback((id, updates) => {
    setEventStates((prev) => ({ ...prev, [id]: { ...prev[id], ...updates } }));
  }, []);

  // Build phase list
  const phases = [
    { key: "pre", label: "Pre-Event", type: "pre" },
    ...Array.from({ length: duration }, (_, i) => ({
      key: `hack-${i}`, label: "Hack Day", type: "hack", dayNum: duration > 1 ? i + 1 : null, dayIndex: i,
    })),
  ];

  const currentPhase = phases.find((p) => p.key === activePhase) || phases[0];

  // Get events for current phase
  let currentEvents = [];
  let phaseType = "milestone";

  if (currentPhase.type === "pre") {
    currentEvents = PHASE_TEMPLATES.pre.events;
    phaseType = "milestone";
  } else if (currentPhase.type === "hack") {
    const dayIndex = currentPhase.dayIndex;
    const isLastDay = dayIndex === duration - 1;
    currentEvents = PHASE_TEMPLATES.hack.events
      .filter((e) => !e.lastDayOnly || isLastDay)
      .map((e) => ({
        ...e,
        name: e.id === "opening" && dayIndex > 0 ? "Morning Kickoff" : e.name,
        signal: e.id === "opening" && dayIndex > 0 ? "ceremony" : e.signal,
      }));
    phaseType = "timed";
  }

  // Phase description
  const getPhaseDesc = () => {
    if (currentPhase.type === "pre") return "Set the milestones leading up to your hack. Dates are relative to your hack start date.";
    if (currentPhase.type === "hack") {
      if (duration === 1) return "Define the schedule for your hack day. Set the times for each event.";
      const isLast = currentPhase.dayIndex === duration - 1;
      return isLast
        ? `Final day — hacking wraps up, submissions close, and results are announced.`
        : `Schedule for Day ${currentPhase.dayIndex + 1}. Set the times for each event.`;
    }
    return "";
  };

  // Calculate date for current hack day
  const getHackDayDate = () => {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() + (currentPhase.dayIndex || 0));
    return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  // Navigation
  const currentIdx = phases.findIndex((p) => p.key === activePhase);
  const canPrev = currentIdx > 0;
  const canNext = currentIdx < phases.length - 1;

  const enabledCount = Object.values(eventStates).filter((s) => s.enabled).length;

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif', background: T.pageBg, minHeight: "100vh", color: T.gray800 }}>

      {/* ── Header ─── */}
      <div style={{ background: T.white, borderBottom: `1px solid ${T.gray200}` }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 32px 0" }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: T.teal, marginBottom: 6 }}>
            Step 2 of 5
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: T.gray900, letterSpacing: "-0.02em" }}>
            Schedule
          </h1>
          <p style={{ fontSize: 14, color: T.gray500, margin: "4px 0 0", lineHeight: 1.5 }}>
            Build your hackathon timeline phase by phase
          </p>
        </div>

        {/* ── Config strip ─── */}
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "16px 32px" }}>
          <div style={{
            background: T.tealBg, border: `1.5px solid ${T.teal}20`, borderRadius: T.radiusLg,
            padding: "16px 20px", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap",
          }}>
            {/* Duration */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: T.tealDark, marginBottom: 6 }}>
                Duration
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {[1, 2, 3].map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      setDuration(d);
                      // Reset to first hack day if current is beyond range
                      if (activePhase.startsWith("hack-")) {
                        const idx = parseInt(activePhase.split("-")[1]);
                        if (idx >= d) setActivePhase(`hack-${d - 1}`);
                      }
                    }}
                    style={{
                      width: 52, height: 40, borderRadius: 8,
                      border: `2px solid ${duration === d ? T.teal : T.gray200}`,
                      background: duration === d ? T.teal : T.white,
                      color: duration === d ? T.white : T.gray500,
                      fontSize: 15, fontWeight: 700, cursor: "pointer",
                      transition: "all 0.12s",
                      boxShadow: duration === d ? `0 1px 4px ${T.teal}35` : "none",
                    }}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            <div style={{ width: 1, height: 36, background: `${T.teal}18` }} />

            {/* Anchor */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: T.tealDark, marginBottom: 6 }}>
                Hacking starts
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <input type="date" value={anchorDate} onChange={(e) => setAnchorDate(e.target.value)}
                  style={{ padding: "6px 10px", borderRadius: 8, border: `1.5px solid ${T.teal}30`, fontSize: 12, color: T.gray700, background: T.white, outline: "none", fontWeight: 500 }} />
                <input type="time" value={anchorTime} onChange={(e) => setAnchorTime(e.target.value)}
                  style={{ padding: "6px 10px", borderRadius: 8, border: `1.5px solid ${T.teal}30`, fontSize: 12, color: T.gray700, background: T.white, outline: "none", fontWeight: 500 }} />
              </div>
            </div>

            <div style={{ width: 1, height: 36, background: `${T.teal}18` }} />

            {/* Timezone */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: T.tealDark, marginBottom: 6 }}>
                Timezone
              </div>
              <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 8, border: `1.5px solid ${T.teal}30`, fontSize: 12, color: T.gray700, background: T.white, outline: "none", fontWeight: 500, minWidth: 160 }}>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="America/New_York">America/New York (EST)</option>
                <option value="America/Los_Angeles">America/Los Angeles (PST)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                <option value="Australia/Sydney">Australia/Sydney (AEDT)</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Phase tabs ─── */}
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 32px 12px" }}>
          <div style={{ display: "flex", gap: 4, overflowX: "auto" }}>
            {phases.map((phase) => {
              const hasEnabled = phase.type === "pre"
                ? PHASE_TEMPLATES.pre.events.some((e) => eventStates[e.id]?.enabled)
                : PHASE_TEMPLATES.hack.events.some((e) => eventStates[e.id]?.enabled);

              return (
                <PhaseTab
                  key={phase.key}
                  label={phase.label}
                  dayNum={phase.dayNum}
                  isActive={phase.key === activePhase}
                  isHack={phase.type === "hack"}
                  hasEvents={hasEnabled}
                  onClick={() => setActivePhase(phase.key)}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Phase content ─── */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 32px" }}>

        {/* Phase header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: T.gray900, margin: 0 }}>
              {currentPhase.dayNum ? `${currentPhase.label} ${currentPhase.dayNum}` : currentPhase.label}
            </h2>
            {currentPhase.type === "hack" && (
              <span style={{ fontSize: 13, color: T.gray400, marginLeft: 4 }}>
                {getHackDayDate()}
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: T.gray400, margin: 0, lineHeight: 1.5 }}>
            {getPhaseDesc()}
          </p>
        </div>

        {/* Event list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {currentEvents.map((event) => {
            const state = eventStates[event.id] || { enabled: true, offset: event.defaultOffset || 0, time: event.defaultTime || "" };
            return (
              <EventRow
                key={event.id}
                event={event}
                enabled={state.enabled}
                onToggle={() => updateEvent(event.id, { enabled: !state.enabled })}
                phaseType={phaseType}
                anchorDate={anchorDate}
                offset={state.offset}
                time={state.time}
                onOffsetChange={(val) => updateEvent(event.id, { offset: val })}
                onTimeChange={(val) => updateEvent(event.id, { time: val })}
              />
            );
          })}
        </div>

        {/* Add custom event hint */}
        <button style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          width: "100%", padding: "12px", marginTop: 12, borderRadius: T.radius,
          border: `1.5px dashed ${T.gray300}`, background: "transparent",
          color: T.gray400, fontSize: 13, fontWeight: 500, cursor: "pointer",
          transition: "all 0.15s",
        }}
          onMouseEnter={(e) => { e.target.style.borderColor = T.teal; e.target.style.color = T.teal; }}
          onMouseLeave={(e) => { e.target.style.borderColor = T.gray300; e.target.style.color = T.gray400; }}
        >
          <span style={{ fontSize: 16 }}>+</span> Add custom event
        </button>
      </div>

      {/* ── Footer ─── */}
      <div style={{
        position: "sticky", bottom: 0, background: T.white,
        borderTop: `1px solid ${T.gray200}`, padding: "12px 0",
      }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 32px" }}>
          {/* Timeline minimap */}
          <div style={{ marginBottom: 12 }}>
            <TimelinePreview
              phases={phases}
              activePhase={activePhase}
              onPhaseClick={setActivePhase}
              anchorDate={anchorDate}
              duration={duration}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              onClick={() => canPrev && setActivePhase(phases[currentIdx - 1].key)}
              disabled={!canPrev}
              style={{
                padding: "10px 20px", borderRadius: 10,
                border: `1.5px solid ${canPrev ? T.gray200 : T.gray100}`,
                background: T.white, color: canPrev ? T.gray600 : T.gray300,
                fontSize: 13, fontWeight: 600, cursor: canPrev ? "pointer" : "default",
              }}
            >
              ← {canPrev ? phases[currentIdx - 1].label + (phases[currentIdx - 1].dayNum ? ` ${phases[currentIdx - 1].dayNum}` : "") : "Back"}
            </button>

            <span style={{ fontSize: 12, color: T.gray400 }}>
              {enabledCount} events · {currentIdx + 1} of {phases.length} phases
            </span>

            {canNext ? (
              <button
                onClick={() => setActivePhase(phases[currentIdx + 1].key)}
                style={{
                  padding: "10px 20px", borderRadius: 10, border: "none",
                  background: T.teal, color: T.white,
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  boxShadow: `0 1px 4px ${T.teal}35`,
                }}
              >
                {phases[currentIdx + 1].label}{phases[currentIdx + 1].dayNum ? ` ${phases[currentIdx + 1].dayNum}` : ""} →
              </button>
            ) : (
              <button
                style={{
                  padding: "10px 24px", borderRadius: 10, border: "none",
                  background: T.teal, color: T.white,
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  boxShadow: `0 1px 4px ${T.teal}35`,
                }}
              >
                Next Step →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
