import type { ImprintRoom } from "../../types/imprint";
import { generateBehaviorRules } from "../../logic/generateBehaviorRules";
import { generateImprint } from "../../logic/generateImprint";

interface TelemetryPanelProps {
  room: ImprintRoom;
  currentRoomIndex: number;
  totalRooms: number;
}

export function TelemetryPanel({ room, currentRoomIndex, totalRooms }: TelemetryPanelProps) {
  const rules = generateBehaviorRules(room);

  return (
    <aside className="telemetry-panel" aria-label="Initial Imprint telemetry">
      <div className="telemetry-header">
        <span>Initial Imprint</span>
        <strong>{Math.round(((currentRoomIndex + 1) / totalRooms) * 100)}%</strong>
      </div>
      <div className="meter">
        <span style={{ width: `${((currentRoomIndex + 1) / totalRooms) * 100}%` }} />
      </div>
      <div className="telemetry-block">
        <span>Current room</span>
        <strong>{room.title}</strong>
      </div>
      <div className="telemetry-block">
        <span>Imprint status</span>
        <strong>{generateImprint(room)}</strong>
      </div>
      <div className="rule-stack">
        {rules.map((rule) => (
          <div className="rule-row" key={rule}>
            <span />
            {rule}
          </div>
        ))}
      </div>
    </aside>
  );
}
