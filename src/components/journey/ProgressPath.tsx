import type { ImprintRoom } from "../../types/imprint";

interface ProgressPathProps {
  rooms: ImprintRoom[];
  currentRoomIndex: number;
}

export function ProgressPath({ rooms, currentRoomIndex }: ProgressPathProps) {
  return (
    <nav className="progress-path" aria-label="Initial Imprint calibration rooms">
      {rooms.map((room, index) => {
        const isActive = index === currentRoomIndex;
        const isComplete = index < currentRoomIndex;

        return (
          <div
            className={[
              "path-node",
              isActive ? "is-active" : "",
              isComplete ? "is-complete" : "",
            ].join(" ")}
            key={room.id}
          >
            <span className="node-index">{String(index + 1).padStart(2, "0")}</span>
            <span className="node-title">{room.title}</span>
          </div>
        );
      })}
    </nav>
  );
}
