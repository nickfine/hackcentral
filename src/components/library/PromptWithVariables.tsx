/**
 * PromptWithVariables — Renders prompt text with [Variable] placeholders highlighted.
 * Variables inside brackets are shown in accent color to signal editable inputs.
 */

const VARIABLE_REGEX = /\[([^\]]+)\]/g;

export interface PromptWithVariablesProps {
  text: string;
  variableClassName?: string;
  className?: string;
}

export function PromptWithVariables({
  text,
  variableClassName = "text-primary font-medium",
  className = "",
}: PromptWithVariablesProps) {
  const parts: (string | { type: "variable"; value: string })[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const regex = new RegExp(VARIABLE_REGEX.source, "g");
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push({ type: "variable", value: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return (
    <pre
      className={`font-mono text-sm whitespace-pre-wrap leading-relaxed overflow-x-auto ${className}`}
      role="text"
    >
      {parts.map((part, i) =>
        typeof part === "string" ? (
          <span key={i}>{part}</span>
        ) : (
          <span key={i} className={variableClassName}>
            {part.value}
          </span>
        )
      )}
    </pre>
  );
}
