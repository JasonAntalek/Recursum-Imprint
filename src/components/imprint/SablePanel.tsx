import type { CardOption, ImprintRoom } from "../../types/imprint";
import { SignalCard } from "../cards/SignalCard";

interface SablePanelProps {
  room: ImprintRoom;
  option?: CardOption;
}

export function SablePanel({ room, option }: SablePanelProps) {
  return (
    <section className="sable-panel" aria-labelledby="sable-title">
      <div className="panel-kicker">Sable guidance</div>
      <h2 id="sable-title">{room.title}</h2>
      <p>{room.sableFrame}</p>
      <div className="interaction-zone">
        {option ? <SignalCard option={option} /> : null}
      </div>
    </section>
  );
}
