import type { ImprintAnswer, ImprintAnswers } from "../types/imprint";

export interface SelectionSet {
  selected: string[];
  primary?: string;
  secondary: string[];
  clarification?: string;
}

export function cleanText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function displayValue(answer: ImprintAnswer | undefined, value: string | undefined) {
  if (!value) {
    return undefined;
  }

  if (value === "Other") {
    return cleanText(answer?.otherClarification);
  }

  return value;
}

export function selectionSet(answers: ImprintAnswers, blockId: string): SelectionSet {
  const answer = answers[blockId];
  const selected = (answer?.selected ?? [])
    .map((value) => displayValue(answer, value))
    .filter(Boolean) as string[];
  const primary = displayValue(answer, answer?.primary) ?? selected[0];
  const secondary = primary ? selected.filter((value) => value !== primary) : selected;
  const clarification = cleanText(answer?.clarification);

  return { selected, primary, secondary, clarification };
}

export function joinList(values: string[]) {
  if (values.length <= 1) {
    return values[0] ?? "";
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

export function sentence(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function punctuate(value: string) {
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

export function lowerFirst(value: string) {
  return `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
}

export function upperFirst(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

export function section(title: string, lines: Array<string | undefined>) {
  const content = lines.flatMap((line) => {
    const trimmed = line?.trim();
    return trimmed ? [trimmed] : [];
  });
  return content.length > 0 ? `${title}:\n${content.join("\n")}` : "";
}

export const regulationPreferences = new Set([
  "I need quiet recovery",
  "I need movement or physical reset",
  "I need space before making decisions",
]);

export const decisionSupportInstructions: Record<string, string> = {
  "Data and pros / cons": "support them with evidence, tradeoffs, and clear pros / cons",
  "Instinct and gut feeling": "leave room for instinct, then test it against the practical context",
  "Counsel from trusted people": "include relational counsel and clarify who should be involved",
  "Speed and action": "favor momentum, fast narrowing, and a concrete next move",
  "Long-term vision": "anchor the choice in the long-term vision before optimizing the immediate step",
  "Freedom and flexibility": "protect autonomy and optionality when weighing the decision",
  "Avoiding regret": "separate reversible from irreversible risks so regret does not run the room",
};

export function decisionInstruction(decisionLead?: string) {
  return decisionLead ? decisionSupportInstructions[decisionLead] : undefined;
}

export function regulationInstruction(values: string[]) {
  if (values.length === 0) {
    return undefined;
  }

  const instructions = values
    .map((value) => {
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
    })
    .filter(Boolean) as string[];

  return instructions.length > 0 ? joinList(instructions) : undefined;
}
