import { useState } from "react";
import "./sable.css";

interface SableReadoutProps {
  label?: string;
  text: string;
}

export function SableReadout({ label = "SABLE READ", text }: SableReadoutProps) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className="sable-readout">
      <div className="sable-readout__mark" aria-hidden="true">
        {imageFailed ? (
          <span>S</span>
        ) : (
          <img
            alt=""
            onError={() => setImageFailed(true)}
            src="/sable/Sable-primary03-filter.png"
          />
        )}
      </div>
      <div>
        <span>{label}</span>
        <p>{text}</p>
      </div>
    </div>
  );
}
