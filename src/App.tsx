import { ChevronLeft, ChevronRight } from "lucide-react";
import { imprintRooms } from "./data/imprintRooms";
import { AppShell } from "./components/layout/AppShell";
import { Header } from "./components/layout/Header";
import { ImprintPanel } from "./components/imprint/ImprintPanel";
import { ProgressPath } from "./components/journey/ProgressPath";
import { RoomView } from "./components/journey/RoomView";
import { SablePresence } from "./components/sable/SablePresence";
import type { ImprintAnswer, ImprintAnswers } from "./types/imprint";
import { useCallback, useEffect, useRef, useState } from "react";

function ReviewPlaceholder({ answers }: { answers: ImprintAnswers }) {
  const answeredItems = imprintRooms.flatMap((room) =>
    room.blocks.map((block) => {
      const answer = answers[block.id];
      const selected = answer?.selected ?? [];
      const displayValue = (selectedValue: string) =>
        selectedValue === "Other" && answer?.otherClarification?.trim()
          ? answer.otherClarification.trim()
          : selectedValue;
      const secondary = answer?.primary
        ? selected.filter((value) => value !== answer.primary).map(displayValue)
        : selected.map(displayValue);
      const value =
        (answer?.text ?? "").trim() ||
        (answer?.primary
          ? `Primary: ${displayValue(answer.primary)}${secondary.length ? `; Also present: ${secondary.join(", ")}` : ""}`
          : secondary.join(", ")) ||
        "No current entry";
      const clarification = answer?.clarification?.trim();

      return {
        id: block.id,
        prompt: block.prompt,
        value,
        clarification,
      };
    }),
  );

  return (
    <section className="room-view review-view" aria-labelledby="review-title">
      <div className="panel-kicker">Durable profile object</div>
      <h2 id="review-title">Active Profile</h2>
      <SablePresence
        message="Initial Imprint calibrated. Your Active Profile is online. Choose your first door."
        statusLabel="ACTIVE PROFILE READY"
        variant="imprint"
      />
      <div className="future-actions" aria-label="Active Profile options">
        <button type="button">Continue with Active Profile</button>
        <button type="button">Recalibrate One Area</button>
        <button type="button">Add Deeper Calibration</button>
      </div>
      <div className="review-stack">
        {answeredItems.map((item) => (
          <div className="review-row" key={item.id}>
            <span>{item.prompt}</span>
            <strong>{item.value}</strong>
            {item.clarification ? <em>{item.clarification}</em> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function App() {
  const journeyTopRef = useRef<HTMLDivElement>(null);
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
  const [answers, setAnswers] = useState<ImprintAnswers>({});
  const [isCurrentRoomValid, setIsCurrentRoomValid] = useState(false);
  const [calibrationStarted, setCalibrationStarted] = useState(false);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [showThresholdPreview, setShowThresholdPreview] = useState(false);
  const currentRoom = imprintRooms[currentRoomIndex];

  const canGoBack = currentRoomIndex > 0;
  const isFinalRoom = currentRoomIndex === imprintRooms.length - 1;

  useEffect(() => {
    const scrollTarget = journeyTopRef.current;

    if (!scrollTarget) {
      return;
    }

    requestAnimationFrame(() => {
      scrollTarget.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }, [currentRoomIndex, reviewVisible]);

  const handleAnswerChange = useCallback((blockId: string, answer: ImprintAnswer) => {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [blockId]: answer,
    }));
  }, []);

  function handleBack() {
    if (reviewVisible) {
      setReviewVisible(false);
      return;
    }

    setShowThresholdPreview(false);
    setIsCurrentRoomValid(false);
    setCurrentRoomIndex((index) => Math.max(0, index - 1));
  }

  function handleContinue() {
    if (!isCurrentRoomValid) {
      return;
    }

    if (isFinalRoom) {
      setReviewVisible(true);
      return;
    }

    if (currentRoom.id === "threshold") {
      setCalibrationStarted(true);
      setShowThresholdPreview(false);
    }

    setIsCurrentRoomValid(false);
    setCurrentRoomIndex((index) => Math.min(imprintRooms.length - 1, index + 1));
  }

  function beginThresholdCalibration() {
    setCalibrationStarted(true);
    setShowThresholdPreview(false);
    setIsCurrentRoomValid(false);
    setCurrentRoomIndex(1);
  }

  return (
    <AppShell>
      <Header />
      <ProgressPath rooms={imprintRooms} currentRoomIndex={currentRoomIndex} />
      <div className="journey-top-anchor" ref={journeyTopRef} />

      <div className="workspace-grid">
        <div className="journey-content">
          {reviewVisible ? (
            <ReviewPlaceholder answers={answers} />
          ) : (
            <RoomView
              answers={answers}
              calibrationStarted={calibrationStarted}
              onAnswerChange={handleAnswerChange}
              onBeginThresholdCalibration={beginThresholdCalibration}
              onOpenThresholdPreview={() => setShowThresholdPreview(true)}
              onValidityChange={setIsCurrentRoomValid}
              room={currentRoom}
              showThresholdPreview={showThresholdPreview}
            />
          )}
        </div>
        <ImprintPanel
          answers={answers}
          calibrationStarted={calibrationStarted}
          room={currentRoom}
          currentRoomIndex={currentRoomIndex}
          totalRooms={imprintRooms.length}
        />
      </div>

      <footer className="navigation-bar">
        <button
          className="nav-button secondary"
          disabled={!canGoBack && !reviewVisible}
          onClick={handleBack}
          type="button"
        >
          <ChevronLeft size={18} />
          Back
        </button>
        <button
          className="nav-button primary"
          disabled={reviewVisible || !isCurrentRoomValid}
          onClick={handleContinue}
          type="button"
        >
          {isFinalRoom ? "Activate Profile" : "Continue"}
          <ChevronRight size={18} />
        </button>
      </footer>
    </AppShell>
  );
}
