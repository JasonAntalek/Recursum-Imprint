import type { ImprintRoomId } from "../types/imprint";

const roomMilestones: Record<ImprintRoomId, string> = {
  threshold: "Calibration Open",
  identity: "Identity Anchor Set",
  "what-moves-you": "Core Signal Emerging",
  "what-you-are-building": "Context Map Forming",
  pressure: "Pressure Pattern Detected",
  "recursum-meeting-style": "Relationship Calibration Online",
  "direction-and-first-imprint": "Initial Imprint Ready",
};

export function getRoomMilestone(roomId: ImprintRoomId) {
  return roomMilestones[roomId];
}
