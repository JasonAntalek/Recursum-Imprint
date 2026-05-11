import { useState } from "react";
import "./sable.css";

export type SablePresenceVariant = "threshold" | "room" | "imprint" | "compact";

interface SablePresenceProps {
  variant: SablePresenceVariant;
  message: string;
  statusLabel?: string;
  imageSrc?: string;
  className?: string;
}

const defaultImages: Record<SablePresenceVariant, string> = {
  threshold: "/sable/Sable-primary01.png",
  room: "/sable/Sable-primary02.png",
  imprint: "/sable/Sable-primary01.png",
  compact: "/sable/Sable-primary03-filter.png",
};

const defaultStatusLabels: Record<SablePresenceVariant, string> = {
  threshold: "SABLE ONLINE",
  room: "GUIDE SIGNAL",
  imprint: "ACTIVE PROFILE READY",
  compact: "",
};

export function SablePresence({
  variant,
  message,
  statusLabel,
  imageSrc,
  className = "",
}: SablePresenceProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const resolvedStatusLabel = statusLabel ?? defaultStatusLabels[variant];
  const resolvedImage = imageSrc ?? defaultImages[variant];

  return (
    <div className={["sable-presence", `sable-presence--${variant}`, className].join(" ")}>
      <div className="sable-portrait" aria-hidden="true">
        {imageFailed ? (
          <span className="sable-monogram">S</span>
        ) : (
          <img alt="" onError={() => setImageFailed(true)} src={resolvedImage} />
        )}
      </div>
      <div className="sable-presence__copy">
        {resolvedStatusLabel ? <span className="sable-status">{resolvedStatusLabel}</span> : null}
        <p>{message}</p>
      </div>
    </div>
  );
}
