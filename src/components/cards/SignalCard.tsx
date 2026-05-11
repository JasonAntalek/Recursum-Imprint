import type { CardOption } from "../../types/imprint";

interface SignalCardProps {
  option: CardOption;
}

export function SignalCard({ option }: SignalCardProps) {
  return (
    <button className="signal-card" type="button">
      <span>Signal card</span>
      {option.label}
    </button>
  );
}
