import type { CardBlock, ImprintAnswer } from "../../types/imprint";

interface CardSelectorProps {
  block: CardBlock;
  answer?: ImprintAnswer;
  onChange: (answer: ImprintAnswer) => void;
}

const emptyAnswer: ImprintAnswer = {
  selected: [],
  clarification: "",
  otherClarification: "",
  conditionalClarifications: {},
  text: "",
  textValues: {},
};

export function CardSelector({ block, answer = emptyAnswer, onChange }: CardSelectorProps) {
  const selectedValues = answer.selected;
  const hasOtherSelected = selectedValues.includes("Other");
  const conditionalClarifications = answer.conditionalClarifications ?? {};
  const activeConditionalRules = selectedValues.flatMap((selected) =>
    selected === "Other"
      ? []
      : (block.conditionalClarifications?.[selected] ?? []).map((rule) => ({
      ...rule,
      option: selected,
        })),
  );
  const maxReached =
    block.mode === "multi" &&
    typeof block.maxSelections === "number" &&
    selectedValues.length >= block.maxSelections;

  function updateAnswer(nextAnswer: Partial<ImprintAnswer>) {
    onChange({
      selected: selectedValues,
      primary: answer.primary,
      text: answer.text ?? "",
      textValues: answer.textValues ?? {},
      clarification: answer.clarification ?? "",
      otherClarification: answer.otherClarification ?? "",
      conditionalClarifications,
      ...nextAnswer,
    });
  }

  function selectedWithPrimary(nextSelected: string[], currentPrimary = answer.primary) {
    const nextPrimary =
      block.primaryRequired && nextSelected.length === 1
        ? nextSelected[0]
        : currentPrimary && nextSelected.includes(currentPrimary)
          ? currentPrimary
          : undefined;

    return {
      selected: nextSelected,
      primary: nextPrimary,
      otherClarification: nextSelected.includes("Other") ? (answer.otherClarification ?? "") : "",
    };
  }

  function toggleValue(value: string) {
    if (block.mode === "single") {
      updateAnswer(selectedWithPrimary(selectedValues.includes(value) ? [] : [value]));
      return;
    }

    if (value === "No one to add now") {
      updateAnswer(selectedWithPrimary(selectedValues.includes(value) ? [] : [value]));
      return;
    }

    const withoutExclusive = selectedValues.filter((selected) => selected !== "No one to add now");

    if (selectedValues.includes(value)) {
      updateAnswer(selectedWithPrimary(selectedValues.filter((selected) => selected !== value)));
      return;
    }

    if (!maxReached) {
      updateAnswer(selectedWithPrimary([...withoutExclusive, value]));
    }
  }

  function markPrimary(value: string) {
    updateAnswer({ primary: answer.primary === value && !block.primaryRequired ? undefined : value });
  }

  function updateConditionalClarification(id: string, value: string) {
    updateAnswer({
      conditionalClarifications: {
        ...conditionalClarifications,
        [id]: value,
      },
    });
  }

  const showPrimaryPrompt =
    block.mode === "multi" &&
    selectedValues.length > 1 &&
    (block.primaryRequired || block.primaryOptional);

  return (
    <div className="card-selector">
      {block.mode === "text" ? (
        block.textFields ? (
          <div className="text-field-grid">
            {block.textFields.map((field) => (
              <label className="text-field-wrap" key={field.id}>
                <span>{field.label}</span>
                <input
                  className="text-field"
                  onChange={(event) =>
                    updateAnswer({
                      textValues: {
                        ...(answer.textValues ?? {}),
                        [field.id]: event.target.value,
                      },
                    })
                  }
                  placeholder={field.placeholder}
                  type={field.inputType ?? "text"}
                  value={answer.textValues?.[field.id] ?? ""}
                />
              </label>
            ))}
          </div>
        ) : (
          <input
            className="text-field"
            onChange={(event) => updateAnswer({ text: event.target.value })}
            placeholder={block.placeholder}
            type="text"
            value={answer.text ?? ""}
          />
        )
      ) : (
        <>
          {showPrimaryPrompt ? (
            <p className="primary-prompt">
              {block.primaryRequired
                ? "Which one leads?"
                : "Mark the strongest signal if one stands out."}
            </p>
          ) : null}
          <div className="option-grid">
            {block.options?.map((option) => {
              const isSelected = selectedValues.includes(option.label);
              const isPrimary = answer.primary === option.label;
              const isDisabled = !isSelected && maxReached;

              return (
                <button
                  className={[
                    "choice-card",
                    isSelected ? "is-selected" : "",
                    isPrimary ? "is-primary" : "",
                  ].join(" ")}
                  disabled={isDisabled}
                  key={option.id}
                  onClick={() => toggleValue(option.label)}
                  type="button"
                >
                  <span className="choice-indicator" />
                  <span className="choice-label">{option.label}</span>
                  {isPrimary ? <span className="primary-label">Primary</span> : null}
                  {isSelected && (block.primaryRequired || block.primaryOptional) ? (
                    <span
                      className="primary-control"
                      onClick={(event) => {
                        event.stopPropagation();
                        markPrimary(option.label);
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      {isPrimary ? "Primary signal" : "Mark primary"}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </>
      )}

      {hasOtherSelected ? (
        <label className="conditional-field required-other-field">
          <span className="conditional-label">Other</span>
          <span className="conditional-helper">
            Clarify Other
            <strong>Required</strong>
          </span>
          <textarea
            onChange={(event) => updateAnswer({ otherClarification: event.target.value })}
            placeholder="Tell Recursum what this should mean…"
            rows={2}
            value={answer.otherClarification ?? ""}
          />
        </label>
      ) : null}

      {block.clarificationEnabled ? (
        <label className="clarification-wrap">
          <span>Add nuance if Recursum should not take this at face value.</span>
          <textarea
            className="clarification-field"
            onChange={(event) => updateAnswer({ clarification: event.target.value })}
            placeholder={block.clarificationPlaceholder ?? "Optional nuance"}
            rows={3}
            value={answer.clarification ?? ""}
          />
        </label>
      ) : null}

      {activeConditionalRules.length > 0 ? (
        <div className="conditional-stack">
          {activeConditionalRules.map((rule) => (
            <label className="conditional-field" key={rule.id}>
              <span className="conditional-label">{rule.option}</span>
              <span className="conditional-helper">
                {rule.prompt}
                {rule.required ? <strong>Required</strong> : null}
              </span>
              <textarea
                onChange={(event) => updateConditionalClarification(rule.id, event.target.value)}
                placeholder={rule.placeholder ?? "Optional context"}
                rows={2}
                value={conditionalClarifications[rule.id] ?? ""}
              />
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
