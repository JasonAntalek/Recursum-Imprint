import type { ImprintAnswer, ImprintAnswers } from "../types/imprint";

type ProfileStatus = "draft" | "active" | "provisional" | "route_selected";

type PrivacyLevel = "named" | "label_only" | "not_provided";

interface ExportImprintPayloadArgs {
  answers: ImprintAnswers;
  behaviorRules: string[];
  profileStatus: ProfileStatus;
  selectedRoute?: string | null;
}

interface SelectionSet {
  selected: string[];
  primary?: string;
  secondary: string[];
  clarification?: string;
}

function cleanText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeSelectedValue(value: string, answer?: ImprintAnswer) {
  if (value === "Other") {
    return cleanText(answer?.otherClarification) ?? value;
  }

  return value;
}

function selectionSet(answer?: ImprintAnswer): SelectionSet {
  const selected = (answer?.selected ?? [])
    .map((value) => normalizeSelectedValue(value, answer))
    .filter(Boolean);
  const normalizedPrimary = answer?.primary
    ? normalizeSelectedValue(answer.primary, answer)
    : undefined;
  const primary = normalizedPrimary && selected.includes(normalizedPrimary)
    ? normalizedPrimary
    : undefined;
  const secondary = primary
    ? selected.filter((value) => value !== primary)
    : selected;

  return {
    selected,
    primary,
    secondary,
    clarification: cleanText(answer?.clarification),
  };
}

function optionalArray(values: string[]) {
  return values.length > 0 ? values : undefined;
}

function withOptional<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  ) as T;
}

function combineClarifications(items: Array<[string, string | undefined]>) {
  const values = items
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`);

  return values.length > 0 ? values.join("\n") : undefined;
}

function inferPrivacyLevel(referenceLabel?: string, details?: string): PrivacyLevel {
  const combined = [referenceLabel, details].filter(Boolean).join(" ").toLowerCase();

  if (!combined) {
    return "not_provided";
  }

  if (
    combined.includes("not naming") ||
    combined.includes("not named") ||
    combined.includes("private") ||
    combined.includes("privacy") ||
    combined.includes("my ") ||
    combined.includes("spouse") ||
    combined.includes("partner") ||
    combined.includes("children") ||
    combined.includes("kids") ||
    combined.includes("daughter") ||
    combined.includes("son")
  ) {
    return "label_only";
  }

  return "named";
}

function relationshipAnchors(answer?: ImprintAnswer) {
  if (!answer || answer.selected.length === 0 || answer.selected.includes("No one to add now")) {
    return [];
  }

  const refs = answer.conditionalClarifications ?? {};
  const anchorFor = (
    type: string,
    label: string,
    referenceLabel?: string,
    details?: string,
  ) => {
    const cleanReference = cleanText(referenceLabel);
    const cleanDetails = cleanText(details);

    return withOptional({
      type,
      label,
      referenceLabel: cleanReference,
      details: cleanDetails,
      privacyLevel: inferPrivacyLevel(cleanReference, cleanDetails),
    });
  };

  return answer.selected
    .filter((selected) => selected !== "No one to add now")
    .map((selected) => {
      if (selected === "Partner / spouse") {
        return anchorFor("partner_spouse", selected, refs["partner-reference"]);
      }

      if (selected === "Children") {
        return anchorFor(
          "children",
          selected,
          refs["children-reference"],
          refs["children-context"],
        );
      }

      if (selected === "Parents") {
        return anchorFor("parents", selected, undefined, refs["parents-context"]);
      }

      if (selected === "Close friends / chosen family") {
        return anchorFor(
          "chosen_family",
          selected,
          undefined,
          refs["chosen-family-context"],
        );
      }

      if (selected === "Team / collaborators") {
        return anchorFor("team_collaborators", selected, undefined, refs["team-context"]);
      }

      if (selected === "Other") {
        const otherReference =
          cleanText(refs["other-relationship-reference"]) ?? cleanText(answer.otherClarification);

        return anchorFor("other", otherReference ?? selected, otherReference);
      }

      return anchorFor(selected.toLowerCase().replace(/[^a-z0-9]+/g, "_"), selected);
    });
}

function jsonSafeSnapshot(answers: ImprintAnswers) {
  return JSON.parse(JSON.stringify(answers)) as object;
}

export function exportImprintPayload({
  answers,
  behaviorRules,
  profileStatus,
  selectedRoute = null,
}: ExportImprintPayloadArgs) {
  const now = new Date().toISOString();
  const descriptors = selectionSet(answers["core-descriptors"]);
  const motivators = selectionSet(answers["action-motivation"]);
  const friction = selectionSet(answers["friction-points"]);
  const workWorld = selectionSet(answers["work-income-world"]);
  const brandFocus = selectionSet(answers["public-identity"]);
  const workAlignment = selectionSet(answers["work-alignment"]);
  const fears = selectionSet(answers["fear-resistance"]);
  const aliveness = selectionSet(answers["alive-unstoppable"]);
  const decision = selectionSet(answers["decision-lead"]);
  const boundaries = selectionSet(answers["time-energy-boundaries"]);
  const currentAiUse = selectionSet(answers["current-ai-use"]);
  const desiredAiUse = selectionSet(answers["future-recursum-help"]);
  const responseStyle = selectionSet(answers["response-style"]);
  const direction = selectionSet(answers["long-term-direction"]);
  const setbacks = selectionSet(answers["setback-response"]);

  return {
    schemaVersion: "0.1",
    source: "recursum_initial_imprint",
    profileStatus: selectedRoute ? "route_selected" : profileStatus,
    createdAt: now,
    updatedAt: now,
    identity: withOptional({
      preferredName: cleanText(answers["identity-name"]?.text),
      relationshipAnchors: relationshipAnchors(answers["identity-close-profile"]),
    }),
    coreSignal: withOptional({
      descriptors: optionalArray(descriptors.selected),
      primaryMotivator: motivators.primary,
      secondaryMotivators: optionalArray(motivators.secondary),
      motivatorClarification: motivators.clarification,
      strengths: optionalArray(descriptors.selected),
      primaryFriction: friction.primary,
      secondaryFriction: optionalArray(friction.secondary),
      frictionClarification: friction.clarification,
    }),
    workContext: withOptional({
      primaryWorkWorld: workWorld.primary,
      additionalWorkWorlds: optionalArray(workWorld.secondary),
      workClarification: combineClarifications([
        ["Work world", workWorld.clarification],
        ["Brand focus", brandFocus.clarification],
      ]),
      primaryBrandFocus: brandFocus.primary,
      additionalBrandFocus: optionalArray(brandFocus.secondary),
      alignment: workAlignment.selected[0],
      alignmentClarification: workAlignment.clarification,
    }),
    pressurePattern: withOptional({
      primaryFear: fears.primary,
      secondaryFears: optionalArray(fears.secondary),
      alivenessSignals: optionalArray(aliveness.primary ? [aliveness.primary, ...aliveness.secondary] : aliveness.selected),
      primaryDecisionStyle: decision.primary,
      secondaryDecisionStyles: optionalArray(decision.secondary),
      timeEnergyBoundaryPatterns: optionalArray(
        boundaries.primary ? [boundaries.primary, ...boundaries.secondary] : boundaries.selected,
      ),
    }),
    aiRelationship: withOptional({
      currentUses: optionalArray(currentAiUse.selected),
      desiredUses: optionalArray(
        desiredAiUse.primary ? [desiredAiUse.primary, ...desiredAiUse.secondary] : desiredAiUse.selected,
      ),
      primaryResponseStyle: responseStyle.primary,
      secondaryResponseStyles: optionalArray(responseStyle.secondary),
      responseStyleClarification: responseStyle.clarification,
    }),
    direction: withOptional({
      primaryLongTermDirection: direction.primary,
      secondaryLongTermDirections: optionalArray(direction.secondary),
      directionClarification: combineClarifications([
        ["Long-term direction", direction.clarification],
        ["Setback response", setbacks.clarification],
      ]),
      primarySetbackResponse: setbacks.primary,
      secondarySetbackResponses: optionalArray(setbacks.secondary),
    }),
    behaviorRules: behaviorRules.filter((rule) => rule.trim()),
    route: {
      selectedRoute,
    },
    rawAnswersSnapshot: jsonSafeSnapshot(answers),
  };
}
