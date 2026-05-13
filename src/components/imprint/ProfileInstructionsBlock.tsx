import type { ImprintAnswer, ImprintAnswers } from "../../types/imprint";

interface ProfileInstructionsBlockProps {
  answers: ImprintAnswers;
  behaviorRules: string[];
  copyStatus: string;
}

function cleanText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function displayValue(answer: ImprintAnswer | undefined, value: string | undefined) {
  if (!value) {
    return undefined;
  }

  if (value === "Other") {
    return cleanText(answer?.otherClarification);
  }

  return value;
}

function selectionSet(answers: ImprintAnswers, blockId: string) {
  const answer = answers[blockId];
  const selected = (answer?.selected ?? [])
    .map((value) => displayValue(answer, value))
    .filter(Boolean) as string[];
  const primary = displayValue(answer, answer?.primary) ?? selected[0];
  const secondary = primary ? selected.filter((value) => value !== primary) : selected;
  const clarification = cleanText(answer?.clarification);

  return { selected, primary, secondary, clarification };
}

function joinList(values: string[]) {
  if (values.length <= 1) {
    return values[0] ?? "";
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function sentence(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function punctuate(value: string) {
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function section(title: string, lines: Array<string | undefined>) {
  const content = lines.flatMap((line) => {
    const trimmed = line?.trim();
    return trimmed ? [trimmed] : [];
  });
  return content.length > 0 ? `${title}:\n${content.join("\n")}` : "";
}

function hasTextValue(answer: ImprintAnswer | undefined) {
  return Object.values(answer?.textValues ?? {}).some((value) => value.trim());
}

const regulationPreferences = new Set([
  "I need quiet recovery",
  "I need movement or physical reset",
  "I need space before making decisions",
]);

function regulationInstruction(values: string[]) {
  if (values.length === 0) {
    return undefined;
  }

  const instructions = values.map((value) => {
    if (value === "I need quiet recovery") {
      return "reduce pressure and offer a smaller next step when energy drops";
    }

    if (value === "I need movement or physical reset") {
      return "make room for physical reset before returning to analysis";
    }

    if (value === "I need space before making decisions") {
      return "allow space before forcing decisions";
    }

    return undefined;
  }).filter(Boolean);

  return instructions.length > 0
    ? `When intensity is high, ${joinList(instructions as string[])}.`
    : undefined;
}

const decisionSupportInstructions: Record<string, string> = {
  "Data and pros / cons": "Support tough decisions with evidence, tradeoffs, and clear pros / cons.",
  "Instinct and gut feeling": "Leave room for instinct, then help test it against the practical context.",
  "Counsel from trusted people": "Consider relational counsel and who should be included before locking a decision.",
  "Speed and action": "Favor momentum, fast narrowing, and a concrete next move.",
  "Long-term vision": "Anchor decisions in the long-term vision before optimizing the immediate step.",
  "Freedom and flexibility": "Protect autonomy and optionality when weighing decisions.",
  "Avoiding regret": "Name reversible versus irreversible risks so regret does not quietly drive the whole process.",
};

function decisionInstruction(decisionLead?: string) {
  return decisionLead ? decisionSupportInstructions[decisionLead] : undefined;
}

export function generateProfileInstructions(answers: ImprintAnswers, behaviorRules: string[]) {
  const name = cleanText(answers["identity-name"]?.text);
  const hasBirthDetails = hasTextValue(answers["identity-birth-details"]);
  const descriptors = selectionSet(answers, "core-descriptors");
  const motivator = selectionSet(answers, "action-motivation");
  const friction = selectionSet(answers, "friction-points");
  const workWorld = selectionSet(answers, "work-income-world");
  const brand = selectionSet(answers, "public-identity");
  const alignment = selectionSet(answers, "work-alignment");
  const leadership = selectionSet(answers, "leadership-collaboration-style");
  const fear = selectionSet(answers, "fear-resistance");
  const aliveness = selectionSet(answers, "alive-unstoppable");
  const decision = selectionSet(answers, "decision-lead");
  const boundaries = selectionSet(answers, "time-energy-boundaries");
  const regulation = boundaries.selected.filter((value) => regulationPreferences.has(value));
  const currentAiUse = selectionSet(answers, "current-ai-use");
  const desiredAiUse = selectionSet(answers, "future-recursum-help");
  const responseStyle = selectionSet(answers, "response-style");
  const learningPreference = selectionSet(answers, "learning-preference");
  const direction = selectionSet(answers, "long-term-direction");
  const fiveYearPicture = cleanText(answers["five-year-picture"]?.text);
  const setback = selectionSet(answers, "setback-response");
  const userLabel = name ?? "The user";
  const selectedRules = behaviorRules
    .filter((rule) => rule.trim() && !rule.includes("Threshold"))
    .slice(0, 6);

  const sections = [
    section("Name", [
      name ?? "Not provided",
      hasBirthDetails
        ? "Optional symbolic profile data is available if the user later requests symbolic or personality lenses."
        : undefined,
    ]),
    section("Core Signal", [
      sentence([
        descriptors.selected.length > 0
          ? `${userLabel} is ${joinList(descriptors.selected)}.`
          : undefined,
        motivator.primary
          ? `They are primarily motivated by ${motivator.primary}.`
          : undefined,
        motivator.secondary.length > 0
          ? `${joinList(motivator.secondary)} also appears in the motivation pattern.`
          : undefined,
      ]),
      motivator.clarification,
    ]),
    section("Support Style", [
      sentence([
        responseStyle.primary ? `Respond with ${responseStyle.primary}.` : undefined,
        responseStyle.secondary.length > 0
          ? `Also respect these response preferences: ${joinList(responseStyle.secondary)}.`
          : undefined,
        "Keep guidance practical, direct enough to use, and tied to the current context.",
      ]),
      responseStyle.clarification,
    ]),
    section("Friction Pattern", [
      sentence([
        friction.primary ? `Watch for ${friction.primary}.` : undefined,
        friction.secondary.length > 0
          ? `Secondary friction includes ${joinList(friction.secondary)}.`
          : undefined,
        friction.primary || friction.secondary.length > 0
          ? "When this pattern appears, help narrow the next move before expanding the plan."
          : undefined,
      ]),
      friction.clarification,
    ]),
    section("Work / Brand Context", [
      sentence([
        workWorld.selected.length > 0
          ? `Current work and income context: ${joinList(workWorld.selected)}.`
          : undefined,
        brand.selected.length > 0
          ? `Public or brand focus: ${joinList(brand.selected)}.`
          : undefined,
        alignment.selected.length > 0 ? `Work alignment: ${alignment.selected[0]}.` : undefined,
        leadership.selected.length > 0
          ? `Leadership / collaboration style: ${joinList(leadership.selected)}.`
          : undefined,
      ]),
      workWorld.clarification,
      brand.clarification,
      leadership.clarification,
    ]),
    section("Pressure Pattern", [
      sentence([
        fear.primary ? `Primary pressure signal: ${fear.primary}.` : undefined,
        fear.secondary.length > 0 ? `Other fears or resistance: ${joinList(fear.secondary)}.` : undefined,
        decision.primary ? `Decision style: ${decision.primary}.` : undefined,
        decisionInstruction(decision.primary),
        boundaries.selected.length > 0
          ? `Time, energy, and boundaries pattern: ${joinList(boundaries.selected)}.`
          : undefined,
        regulationInstruction(regulation),
        setback.primary ? `Setback response: ${setback.primary}.` : undefined,
      ]),
      fear.clarification,
      setback.clarification,
    ]),
    section("AI Relationship", [
      sentence([
        currentAiUse.selected.length > 0
          ? `Current AI use: ${joinList(currentAiUse.selected)}.`
          : undefined,
        desiredAiUse.selected.length > 0
          ? `Desired Recursum support: ${joinList(desiredAiUse.selected)}.`
          : undefined,
        learningPreference.selected.length > 0
          ? `Explain new concepts through ${joinList(learningPreference.selected)}.`
          : undefined,
        aliveness.selected.length > 0
          ? `Support should stay connected to what creates aliveness: ${joinList(aliveness.selected)}.`
          : undefined,
      ]),
      learningPreference.clarification,
    ]),
    section("Direction", [
      sentence([
        direction.primary ? `Long-term direction: ${direction.primary}.` : undefined,
        direction.secondary.length > 0
          ? `Additional future signals: ${joinList(direction.secondary)}.`
          : undefined,
        fiveYearPicture ? `Five-year picture: ${punctuate(fiveYearPicture)}` : undefined,
        direction.primary || direction.secondary.length > 0
          ? "Future support should serve this direction rather than optimizing disconnected tasks."
          : undefined,
      ]),
      direction.clarification,
    ]),
    section("Behavior Rules", selectedRules.map((rule) => `- ${rule}`)),
  ];

  return sections.filter(Boolean).join("\n\n");
}

export function ProfileInstructionsBlock({
  answers,
  behaviorRules,
  copyStatus,
}: ProfileInstructionsBlockProps) {
  const instructions = generateProfileInstructions(answers, behaviorRules);

  return (
    <section className="profile-instructions-block" aria-labelledby="profile-instructions-title">
      <div className="profile-instructions-header">
        <div>
          <span>Profile Output</span>
          <h3 id="profile-instructions-title">Mini-Bio / Recursum Profile Instructions</h3>
        </div>
      </div>
      {copyStatus ? <p className="copy-status">{copyStatus}</p> : null}
      <pre>{instructions}</pre>
    </section>
  );
}
