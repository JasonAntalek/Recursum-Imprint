import type { ImprintAnswers, ImprintRoom } from "../../types/imprint";
import { SablePresence } from "../sable/SablePresence";

interface ImprintPanelProps {
  answers: ImprintAnswers;
  calibrationStarted: boolean;
  currentRoomIndex: number;
  totalRooms: number;
  room: ImprintRoom;
}

function answerSummary(answers: ImprintAnswers, blockId: string) {
  const answer = answers[blockId];

  if (!answer) {
    return "calibrating";
  }

  const selected = answer.selected ?? [];
  const text = (answer.text ?? "").trim();
  const clarification = (answer.clarification ?? "").trim();

  if (text) {
    return text;
  }

  const displayValue = (value: string) =>
    value === "Other" && answer.otherClarification?.trim()
      ? answer.otherClarification.trim()
      : value;

  if (answer.primary) {
    const secondary = selected.filter((value) => value !== answer.primary).map(displayValue);
    const lines = [`Primary: ${displayValue(answer.primary)}`];

    if (secondary.length > 0) {
      lines.push(`Also present: ${secondary.join(", ")}`);
    }

    if (clarification) {
      lines.push(clarification);
    }

    return lines.join("\n");
  }

  const selectedText = selected.map(displayValue).join(", ");
  return selectedText
    ? [selectedText, clarification].filter(Boolean).join("\n")
    : "calibrating";
}

function relationshipSummary(answers: ImprintAnswers) {
  const answer = answers["identity-close-profile"];

  if (!answer || answer.selected.length === 0) {
    return "calibrating";
  }

  if (answer.selected.includes("No one to add now")) {
    return "None added now";
  }

  const refs = answer.conditionalClarifications ?? {};
  const lines = answer.selected.map((selected) => {
    if (selected === "Partner / spouse") {
      return `Partner / spouse: ${refs["partner-reference"]?.trim() || "selected"}`;
    }

    if (selected === "Children") {
      const reference = refs["children-reference"]?.trim() || "selected";
      const context = refs["children-context"]?.trim();
      return [`Children: ${reference}`, context ? `Context: ${context}` : ""]
        .filter(Boolean)
        .join("\n");
    }

    if (selected === "Parents") {
      return `Parents: ${refs["parents-context"]?.trim() || "selected"}`;
    }

    if (selected === "Close friends / chosen family") {
      return `Close friends / chosen family: ${refs["chosen-family-context"]?.trim() || "selected"}`;
    }

    if (selected === "Team / collaborators") {
      return `Team / collaborators: ${refs["team-context"]?.trim() || "selected"}`;
    }

    if (selected === "Other") {
      return `Other: ${answer.otherClarification?.trim() || refs["other-relationship-reference"]?.trim() || "selected"}`;
    }

    return selected;
  });

  return lines.join("\n");
}

function combinedSummary(answers: ImprintAnswers, blockIds: string[]) {
  const parts = blockIds
    .map((blockId) => answerSummary(answers, blockId))
    .filter((value) => value !== "calibrating");

  return parts.length > 0 ? parts.join(" / ") : "calibrating";
}

export function ImprintPanel({
  answers,
  calibrationStarted,
  currentRoomIndex,
  totalRooms,
  room,
}: ImprintPanelProps) {
  const progress = Math.round(((currentRoomIndex + 1) / totalRooms) * 100);
  const calibrationStatus = calibrationStarted ? "Active Profile forming" : "Calibration pending";
  const signals = [
    { label: "Identity Anchor", value: combinedSummary(answers, ["identity-name"]) },
    { label: "Relationship Anchors", value: relationshipSummary(answers) },
    { label: "Core Signal", value: combinedSummary(answers, ["core-descriptors"]) },
    { label: "Motivator", value: combinedSummary(answers, ["action-motivation"]) },
    { label: "Friction Pattern", value: combinedSummary(answers, ["friction-points"]) },
    {
      label: "Work / Brand Context",
      value: combinedSummary(answers, ["work-income-world", "public-identity"]),
    },
    {
      label: "Pressure Pattern",
      value: combinedSummary(answers, ["fear-resistance", "time-energy-boundaries"]),
    },
    {
      label: "AI Relationship",
      value: combinedSummary(answers, ["current-ai-use", "future-recursum-help", "response-style"]),
    },
    { label: "Direction", value: combinedSummary(answers, ["long-term-direction"]) },
  ];

  return (
    <aside className="imprint-panel" aria-label="Initial Imprint calibration telemetry">
      <div className="telemetry-header">
        <span>INITIAL IMPRINT</span>
        <strong>{progress}%</strong>
      </div>
      <div className="meter">
        <span style={{ width: `${progress}%` }} />
      </div>
      <SablePresence
        className="imprint-sable-signal"
        message={calibrationStatus}
        statusLabel="IMPRINT SIGNAL"
        variant="compact"
      />
      <div className="telemetry-block">
        <span>Status</span>
        <strong>{calibrationStatus}</strong>
      </div>
      <div className="telemetry-block">
        <span>Current room</span>
        <strong>{room.title}</strong>
      </div>
      <div className="signal-stack">
        {signals.map((signal) => {
          const [lead, ...details] = signal.value.split("\n").filter(Boolean);

          return (
            <div className="signal-row" key={signal.label}>
              <span>{signal.label}</span>
              <strong>{lead}</strong>
              {details.length > 0 ? <p className="signal-detail">{details.join("\n")}</p> : null}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
