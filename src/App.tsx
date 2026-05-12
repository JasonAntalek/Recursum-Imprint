import { ChevronLeft, ChevronRight, Clipboard } from "lucide-react";
import { imprintRooms } from "./data/imprintRooms";
import { sampleImprintAnswers } from "./data/sampleImprintAnswers";
import { DevJumpButton } from "./components/dev/DevJumpButton";
import { AppShell } from "./components/layout/AppShell";
import { Header } from "./components/layout/Header";
import { ImprintPanel } from "./components/imprint/ImprintPanel";
import {
  generateProfileInstructions,
  ProfileInstructionsBlock,
} from "./components/imprint/ProfileInstructionsBlock";
import { ProgressPath } from "./components/journey/ProgressPath";
import { RoomView } from "./components/journey/RoomView";
import { SablePresence } from "./components/sable/SablePresence";
import { exportImprintPayload } from "./logic/exportImprintPayload";
import { generateBehaviorRules } from "./logic/generateBehaviorRules";
import type { ImprintAnswer, ImprintAnswers, ImprintRoomId } from "./types/imprint";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// TEMP DEV TOOL: remove or set false before public production use.
const SHOW_DEV_TOOLS = true;

const profileSections: Array<{ label: string; roomId: ImprintRoomId }> = [
  { label: "Identity Anchor", roomId: "identity" },
  { label: "Core Signal", roomId: "what-moves-you" },
  { label: "Friction Pattern", roomId: "what-moves-you" },
  { label: "Work / Brand Context", roomId: "what-you-are-building" },
  { label: "Pressure Pattern", roomId: "pressure" },
  { label: "AI Relationship", roomId: "recursum-meeting-style" },
  { label: "Direction", roomId: "direction-and-first-imprint" },
  { label: "Behavior Rules", roomId: "direction-and-first-imprint" },
];

type RoomMetricMap = Record<string, string>;

interface TestingMetrics {
  sessionStartedAt: string;
  roomStartedAt: RoomMetricMap;
  roomCompletedAt: RoomMetricMap;
  totalCompletionTime: number | null;
  roomsVisited: string[];
  editOneAreaClicked: boolean;
  payloadCopied: boolean;
}

function createInitialTestingMetrics(): TestingMetrics {
  const now = new Date().toISOString();
  const firstRoom = imprintRooms[0];

  return {
    sessionStartedAt: now,
    roomStartedAt: firstRoom ? { [firstRoom.id]: now } : {},
    roomCompletedAt: {},
    totalCompletionTime: null,
    roomsVisited: firstRoom ? [firstRoom.id] : [],
    editOneAreaClicked: false,
    payloadCopied: false,
  };
}

function createCompletedTestingMetrics(): TestingMetrics {
  const now = new Date().toISOString();
  const roomMetrics = Object.fromEntries(imprintRooms.map((room) => [room.id, now]));

  return {
    sessionStartedAt: now,
    roomStartedAt: roomMetrics,
    roomCompletedAt: roomMetrics,
    totalCompletionTime: 0,
    roomsVisited: imprintRooms.map((room) => room.id),
    editOneAreaClicked: false,
    payloadCopied: false,
  };
}

function formatDuration(milliseconds: number | null) {
  if (milliseconds === null) {
    return "Still in progress";
  }

  const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function copyTextWithDom(text: string) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "true");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  textArea.setSelectionRange(0, text.length);

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textArea);
  }
}

async function copyTextToClipboard(text: string) {
  if (copyTextWithDom(text)) {
    return true;
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

function normalizeAnswerValue(answer: ImprintAnswer | undefined, value: string | undefined) {
  if (!value) {
    return undefined;
  }

  if (value === "Other") {
    return answer?.otherClarification?.trim() || undefined;
  }

  return value;
}

function primaryOrFirstAnswer(answers: ImprintAnswers, blockId: string) {
  const answer = answers[blockId];
  return normalizeAnswerValue(answer, answer?.primary ?? answer?.selected?.[0]);
}

function sentenceJoin(parts: string[]) {
  if (parts.length <= 1) {
    return parts[0] ?? "";
  }

  if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]}`;
  }

  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

function lowerFirst(value: string) {
  return `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
}

function recognitionSynopsis(answers: ImprintAnswers) {
  const motivator = primaryOrFirstAnswer(answers, "action-motivation");
  const friction = primaryOrFirstAnswer(answers, "friction-points");
  const workContext = primaryOrFirstAnswer(answers, "work-income-world");
  const responseStyle = primaryOrFirstAnswer(answers, "response-style");
  const phrases = [
    motivator ? `moved by ${motivator}` : "",
    friction ? `slowed by ${friction}` : "",
    workContext ? `operating in ${workContext}` : "",
    responseStyle ? `prefer support that feels ${lowerFirst(responseStyle)}` : "",
  ].filter(Boolean);

  return phrases.length > 0
    ? `You are ${sentenceJoin(phrases)}.`
    : "Recursum has enough signal to begin with context.";
}

function beginningRules(behaviorRules: string[]) {
  const focusRules = behaviorRules.filter(
    (rule) => rule.startsWith("Hold focus on ") && !rule.includes("Threshold"),
  );
  const rules = focusRules.length >= 2 ? focusRules : behaviorRules;

  return rules.slice(0, 4);
}

function testingSnapshot(metrics: TestingMetrics) {
  return {
    sessionStartedAt: metrics.sessionStartedAt,
    roomStartedAt: metrics.roomStartedAt,
    roomCompletedAt: metrics.roomCompletedAt,
    totalCompletionTime: metrics.totalCompletionTime,
    totalCompletionTimeLabel: formatDuration(metrics.totalCompletionTime),
    roomsVisited: metrics.roomsVisited,
    roomsCompleted: Object.keys(metrics.roomCompletedAt),
    roomsCompletedCount: Object.keys(metrics.roomCompletedAt).length,
    editOneAreaClicked: metrics.editOneAreaClicked,
    payloadCopied: metrics.payloadCopied,
  };
}

function ReviewPlaceholder({
  answers,
  behaviorRules,
  copyInstructionsStatus,
  onPayloadCopied,
  onCopyInstructions,
  onCloseRecalibrate,
  onRecalibrateProfile,
  onSelectProfileSection,
  recalibrationMode,
  testingMetrics,
}: {
  answers: ImprintAnswers;
  behaviorRules: string[];
  copyInstructionsStatus: string;
  onPayloadCopied: () => void;
  onCopyInstructions: (instructions: string) => void;
  onCloseRecalibrate: () => void;
  onRecalibrateProfile: () => void;
  onSelectProfileSection: (roomId: ImprintRoomId) => void;
  recalibrationMode: boolean;
  testingMetrics: TestingMetrics;
}) {
  const [copyStatus, setCopyStatus] = useState("");
  const [testingCopyStatus, setTestingCopyStatus] = useState("");
  const recalibrationPanelRef = useRef<HTMLDivElement>(null);
  const learnedSynopsis = recognitionSynopsis(answers);
  const beginRules = beginningRules(behaviorRules);
  const profileInstructions = useMemo(
    () => generateProfileInstructions(answers, behaviorRules),
    [answers, behaviorRules],
  );
  const snapshot = useMemo(() => testingSnapshot(testingMetrics), [testingMetrics]);
  const testingJson = useMemo(() => JSON.stringify(snapshot, null, 2), [snapshot]);
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
  const payload = useMemo(
    () =>
      exportImprintPayload({
        answers,
        behaviorRules,
        profileStatus: "active",
        selectedRoute: null,
      }),
    [answers, behaviorRules],
  );
  const payloadJson = useMemo(() => JSON.stringify(payload, null, 2), [payload]);

  async function copyPayload() {
    if (await copyTextToClipboard(payloadJson)) {
      setCopyStatus("Payload copied.");
      onPayloadCopied();
      return;
    }

    setCopyStatus("Copy unavailable. You can manually select the payload.");
  }

  async function copyTestingSnapshot() {
    if (await copyTextToClipboard(testingJson)) {
      setTestingCopyStatus("Testing snapshot copied.");
      return;
    }

    setTestingCopyStatus("Copy unavailable. You can manually select the snapshot.");
  }

  useEffect(() => {
    if (!recalibrationMode) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        recalibrationPanelRef.current?.contains(target) ||
        (target instanceof Element && target.closest(".recalibrate-profile-button"))
      ) {
        return;
      }

      onCloseRecalibrate();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [onCloseRecalibrate, recalibrationMode]);

  return (
    <section className="room-view review-view" aria-labelledby="review-title">
      <div className="panel-kicker">INITIAL IMPRINT CALIBRATED</div>
      <h2 id="review-title">Active Profile Ready</h2>
      <p className="final-subline">Your Active Profile is ready.</p>
      <SablePresence
        message="This is enough for Recursum to begin differently."
        statusLabel="ACTIVE PROFILE READY"
        variant="imprint"
      />
      <div className="completion-status-strip" aria-label="Completion status">
        <span>Initial Imprint calibrated.</span>
        <span>Active Profile ready.</span>
        <span>Profile Instructions generated.</span>
      </div>
      <div className="review-recognition">
        <p>
          This is not all of you. Good. Systems that think they have all of you become dangerous and
          annoying.
        </p>
        <p>But this is enough for Recursum to begin differently.</p>
      </div>
      <div className="recognition-synopsis" aria-label="Initial Imprint synopsis">
        <section>
          <span>What Recursum has learned</span>
          <p>{learnedSynopsis}</p>
        </section>
        <section>
          <span>How Recursum will begin</span>
          <ul>
            {beginRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>
      </div>
      <ProfileInstructionsBlock
        answers={answers}
        behaviorRules={behaviorRules}
        copyStatus={copyInstructionsStatus}
      />
      <div className="final-actions" aria-label="Profile output actions">
        <button
          className="nav-button primary"
          onClick={() => onCopyInstructions(profileInstructions)}
          type="button"
        >
          <Clipboard size={18} />
          Copy Mini-Bio Instructions
        </button>
        <button
          className="nav-button secondary recalibrate-profile-button"
          onClick={onRecalibrateProfile}
          type="button"
        >
          Recalibrate Profile
        </button>
      </div>
      {recalibrationMode ? (
        <div className="profile-recalibration-panel" ref={recalibrationPanelRef}>
          <SablePresence
            message="Good. Click the signal that needs cleaning. No need to reopen the whole hallway."
            statusLabel="RECALIBRATION ACTIVE"
            variant="compact"
          />
          <div className="profile-section-grid" aria-label="Profile sections">
            {profileSections.map((section) => (
              <button
                key={section.label}
                onClick={() => onSelectProfileSection(section.roomId)}
                type="button"
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <details className="developer-payload-preview">
        <summary>Developer Payload Preview</summary>
        <div className="payload-toolbar">
          <button onClick={copyPayload} type="button">
            <Clipboard size={16} />
            Copy Payload
          </button>
          {copyStatus ? <span>{copyStatus}</span> : null}
        </div>
        <pre>{payloadJson}</pre>
      </details>
      <details className="developer-payload-preview">
        <summary>Review Captured Answers</summary>
        <div className="review-stack">
          {answeredItems.map((item) => (
            <div className="review-row" key={item.id}>
              <span>{item.prompt}</span>
              <strong>{item.value}</strong>
              {item.clarification ? <em>{item.clarification}</em> : null}
            </div>
          ))}
        </div>
      </details>
      <details className="developer-payload-preview testing-notes-snapshot">
        <summary>Testing Notes Snapshot</summary>
        <div className="testing-notes-grid" aria-label="Testing notes summary">
          <div>
            <span>Completion time</span>
            <strong>{snapshot.totalCompletionTimeLabel}</strong>
          </div>
          <div>
            <span>Rooms completed</span>
            <strong>{snapshot.roomsCompletedCount}</strong>
          </div>
          <div>
            <span>Recalibrated</span>
            <strong>{snapshot.editOneAreaClicked ? "Yes" : "No"}</strong>
          </div>
          <div>
            <span>Payload copied</span>
            <strong>{snapshot.payloadCopied ? "Yes" : "No"}</strong>
          </div>
        </div>
        <div className="payload-toolbar">
          <button onClick={copyTestingSnapshot} type="button">
            <Clipboard size={16} />
            Copy Testing Snapshot
          </button>
          {testingCopyStatus ? <span>{testingCopyStatus}</span> : null}
        </div>
        <pre>{testingJson}</pre>
      </details>
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
  const [showMidpointRecognition, setShowMidpointRecognition] = useState(false);
  const [midpointRecognitionSeen, setMidpointRecognitionSeen] = useState(false);
  const [testingMetrics, setTestingMetrics] = useState(createInitialTestingMetrics);
  const [copyInstructionsStatus, setCopyInstructionsStatus] = useState("");
  const [profileInstructionsCopied, setProfileInstructionsCopied] = useState(false);
  const [profileInstructionsUpdated, setProfileInstructionsUpdated] = useState(false);
  const [recalibrationMode, setRecalibrationMode] = useState(false);
  const [returnToFinalAfterRoom, setReturnToFinalAfterRoom] = useState(false);
  const [completedRoomIds, setCompletedRoomIds] = useState<string[]>([]);
  const [furthestRoomIndexReached, setFurthestRoomIndexReached] = useState(0);
  const [returnRoomIndex, setReturnRoomIndex] = useState<number | null>(null);
  const [reopenMessage, setReopenMessage] = useState("");
  const currentRoom = imprintRooms[currentRoomIndex];
  const behaviorRules = useMemo(
    () => Array.from(new Set(imprintRooms.flatMap((room) => generateBehaviorRules(room)))),
    [],
  );
  const isInitialImprintComplete = completedRoomIds.length === imprintRooms.length;

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

  useEffect(() => {
    if (currentRoom.id === "pressure" && !midpointRecognitionSeen) {
      setShowMidpointRecognition(true);
      setMidpointRecognitionSeen(true);
    }
  }, [currentRoom.id, midpointRecognitionSeen]);

  useEffect(() => {
    const now = new Date().toISOString();

    setTestingMetrics((currentMetrics) => ({
      ...currentMetrics,
      roomStartedAt: currentMetrics.roomStartedAt[currentRoom.id]
        ? currentMetrics.roomStartedAt
        : {
            ...currentMetrics.roomStartedAt,
            [currentRoom.id]: now,
          },
      roomsVisited: currentMetrics.roomsVisited.includes(currentRoom.id)
        ? currentMetrics.roomsVisited
        : [...currentMetrics.roomsVisited, currentRoom.id],
    }));
  }, [currentRoom.id]);

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

    if (returnToFinalAfterRoom) {
      setReturnToFinalAfterRoom(false);
      setReopenMessage("");
      setReviewVisible(true);
      return;
    }

    if (returnRoomIndex !== null) {
      setCurrentRoomIndex(returnRoomIndex);
      setReturnRoomIndex(null);
      setReopenMessage("");
      return;
    }

    setShowThresholdPreview(false);
    setIsCurrentRoomValid(false);
    setCurrentRoomIndex((index) => Math.max(0, index - 1));
  }

  function markRoomComplete(roomId: string, completedAt: string) {
    setTestingMetrics((currentMetrics) => ({
      ...currentMetrics,
      roomCompletedAt: {
        ...currentMetrics.roomCompletedAt,
        [roomId]: currentMetrics.roomCompletedAt[roomId] ?? completedAt,
      },
    }));
    setCompletedRoomIds((currentIds) =>
      currentIds.includes(roomId) ? currentIds : [...currentIds, roomId],
    );
  }

  function handleContinue() {
    if (!isCurrentRoomValid) {
      return;
    }

    const completedAt = new Date().toISOString();
    markRoomComplete(currentRoom.id, completedAt);

    if (returnToFinalAfterRoom) {
      setTestingMetrics((currentMetrics) => ({
        ...currentMetrics,
        roomCompletedAt: {
          ...currentMetrics.roomCompletedAt,
          [currentRoom.id]: currentMetrics.roomCompletedAt[currentRoom.id] ?? completedAt,
        },
      }));
      setProfileInstructionsUpdated(true);
      setProfileInstructionsCopied(false);
      setCopyInstructionsStatus("");
      setRecalibrationMode(false);
      setReturnToFinalAfterRoom(false);
      setReopenMessage("");
      setReviewVisible(true);
      return;
    }

    if (returnRoomIndex !== null) {
      setCurrentRoomIndex(returnRoomIndex);
      setReturnRoomIndex(null);
      setReopenMessage("");
      return;
    }

    if (isFinalRoom) {
      setTestingMetrics((currentMetrics) => ({
        ...currentMetrics,
        roomCompletedAt: {
          ...currentMetrics.roomCompletedAt,
          [currentRoom.id]: currentMetrics.roomCompletedAt[currentRoom.id] ?? completedAt,
        },
        totalCompletionTime:
          currentMetrics.totalCompletionTime ??
          Date.parse(completedAt) - Date.parse(currentMetrics.sessionStartedAt),
      }));
      setCompletedRoomIds(imprintRooms.map((room) => room.id));
      setFurthestRoomIndexReached(imprintRooms.length - 1);
      setReviewVisible(true);
      return;
    }

    if (currentRoom.id === "threshold") {
      setCalibrationStarted(true);
      setShowThresholdPreview(false);
    }

    setIsCurrentRoomValid(false);
    setCurrentRoomIndex((index) => {
      const nextIndex = Math.min(imprintRooms.length - 1, index + 1);
      setFurthestRoomIndexReached((currentFurthest) => Math.max(currentFurthest, nextIndex));
      return nextIndex;
    });
  }

  function beginThresholdCalibration() {
    markRoomComplete("threshold", new Date().toISOString());
    setCalibrationStarted(true);
    setShowThresholdPreview(false);
    setIsCurrentRoomValid(false);
    setFurthestRoomIndexReached((currentFurthest) => Math.max(currentFurthest, 1));
    setCurrentRoomIndex(1);
  }

  async function handleCopyInstructions(instructions: string) {
    if (await copyTextToClipboard(instructions)) {
      setCopyInstructionsStatus("Copied. Profile instructions ready to paste.");
      setProfileInstructionsCopied(true);
      setTestingMetrics((currentMetrics) => ({
        ...currentMetrics,
        payloadCopied: true,
      }));
      return;
    }

    setCopyInstructionsStatus("Copy unavailable. You can manually select the text.");
  }

  function handleRecalibrateProfile() {
    setRecalibrationMode((isOpen) => !isOpen);
    setTestingMetrics((currentMetrics) => ({
      ...currentMetrics,
      editOneAreaClicked: true,
    }));
  }

  function handleSelectProfileSection(roomId: ImprintRoomId) {
    const roomIndex = imprintRooms.findIndex((room) => room.id === roomId);

    if (roomIndex < 0) {
      return;
    }

    setCurrentRoomIndex(roomIndex);
    setReturnToFinalAfterRoom(true);
    setRecalibrationMode(false);
    setReviewVisible(false);
    setShowThresholdPreview(false);
    setShowMidpointRecognition(false);
    setIsCurrentRoomValid(false);
    setReopenMessage("Recalibration active. Clean the signal. No need to reopen the whole hallway.");
  }

  function handleActiveImprintSelect() {
    if (!isInitialImprintComplete) {
      return;
    }

    setReviewVisible(true);
    setRecalibrationMode(false);
    setReturnToFinalAfterRoom(false);
    setReturnRoomIndex(null);
    setReopenMessage("");
    setShowThresholdPreview(false);
    setShowMidpointRecognition(false);
    setIsCurrentRoomValid(false);
  }

  function handleDevJumpToCompletedImprint() {
    setAnswers(sampleImprintAnswers);
    setCurrentRoomIndex(imprintRooms.length - 1);
    setIsCurrentRoomValid(true);
    setCalibrationStarted(true);
    setReviewVisible(true);
    setShowThresholdPreview(false);
    setShowMidpointRecognition(false);
    setMidpointRecognitionSeen(true);
    setTestingMetrics(createCompletedTestingMetrics());
    setCompletedRoomIds(imprintRooms.map((room) => room.id));
    setFurthestRoomIndexReached(imprintRooms.length - 1);
    setReturnRoomIndex(null);
    setReopenMessage("");
    setCopyInstructionsStatus("");
    setProfileInstructionsCopied(false);
    setProfileInstructionsUpdated(false);
    setRecalibrationMode(false);
    setReturnToFinalAfterRoom(false);
  }

  function handleProgressRoomSelect(roomIndex: number) {
    const room = imprintRooms[roomIndex];

    if (!room || !completedRoomIds.includes(room.id)) {
      return;
    }

    if (reviewVisible || isInitialImprintComplete) {
      setReturnToFinalAfterRoom(true);
      setReopenMessage("Recalibration active. Clean the signal. No need to reopen the whole hallway.");
    } else if (roomIndex < furthestRoomIndexReached) {
      setReturnRoomIndex(furthestRoomIndexReached);
      setReopenMessage("Signal reopened. Adjust what changed. The rest stays intact.");
    } else {
      setReturnRoomIndex(null);
      setReopenMessage("");
    }

    setCurrentRoomIndex(roomIndex);
    setReviewVisible(false);
    setRecalibrationMode(false);
    setShowThresholdPreview(false);
    setShowMidpointRecognition(false);
    setIsCurrentRoomValid(false);
  }

  const panelStatus = reviewVisible
    ? recalibrationMode
      ? "Recalibration active"
      : profileInstructionsCopied
        ? "Profile Instructions copied"
        : profileInstructionsUpdated
          ? "Profile Instructions updated"
          : "Profile Instructions ready"
    : returnToFinalAfterRoom
      ? "Recalibration active"
      : undefined;

  return (
    <AppShell>
      {SHOW_DEV_TOOLS ? <DevJumpButton onClick={handleDevJumpToCompletedImprint} /> : null}
      <Header />
      <ProgressPath
        completedRoomIds={completedRoomIds}
        currentRoomIndex={currentRoomIndex}
        isFinalReview={reviewVisible}
        isInitialImprintComplete={isInitialImprintComplete}
        onActiveImprintSelect={handleActiveImprintSelect}
        onRoomSelect={handleProgressRoomSelect}
        rooms={imprintRooms}
      />
      <div className="journey-top-anchor" ref={journeyTopRef} />

      <div className="workspace-grid">
        <div className="journey-content">
          {reviewVisible ? (
            <ReviewPlaceholder
              answers={answers}
              behaviorRules={behaviorRules}
              copyInstructionsStatus={copyInstructionsStatus}
              onCopyInstructions={handleCopyInstructions}
              onCloseRecalibrate={() => setRecalibrationMode(false)}
              onPayloadCopied={() =>
                setTestingMetrics((currentMetrics) => ({
                  ...currentMetrics,
                  payloadCopied: true,
                }))
              }
              onRecalibrateProfile={handleRecalibrateProfile}
              onSelectProfileSection={handleSelectProfileSection}
              recalibrationMode={recalibrationMode}
              testingMetrics={testingMetrics}
            />
          ) : (
            <RoomView
              answers={answers}
              calibrationStarted={calibrationStarted}
              onAnswerChange={handleAnswerChange}
              onBeginThresholdCalibration={beginThresholdCalibration}
              onDismissMidpointRecognition={() => setShowMidpointRecognition(false)}
              onOpenThresholdPreview={() => setShowThresholdPreview(true)}
              onValidityChange={setIsCurrentRoomValid}
              reopenMessage={reopenMessage}
              room={currentRoom}
              showMidpointRecognition={showMidpointRecognition && currentRoom.id === "pressure"}
              showThresholdPreview={showThresholdPreview}
            />
          )}
        </div>
        <ImprintPanel
          answers={answers}
          calibrationStarted={calibrationStarted}
          room={currentRoom}
          currentRoomIndex={currentRoomIndex}
          isFinalReview={reviewVisible}
          statusOverride={panelStatus}
          totalRooms={imprintRooms.length}
        />
      </div>

      {!reviewVisible ? (
        <footer className="navigation-bar">
          <button
            className="nav-button secondary"
            disabled={!canGoBack && !returnToFinalAfterRoom}
            onClick={handleBack}
            type="button"
          >
            <ChevronLeft size={18} />
            Back
          </button>
          <button
            className="nav-button primary"
            disabled={!isCurrentRoomValid}
            onClick={handleContinue}
            type="button"
          >
            {returnToFinalAfterRoom ? "SET" : isFinalRoom ? "Activate Profile" : "Continue"}
            <ChevronRight size={18} />
          </button>
        </footer>
      ) : null}
    </AppShell>
  );
}
