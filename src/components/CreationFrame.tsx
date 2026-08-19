import { useEffect, useState } from "react";
import PaperButton from "./PaperButton";
import { GENERATING_STEPS, GENERATING_TITLE } from "../data/aiFriendOptions";
import type { CreationState } from "../types/aiFriend";
import "./CreationFrame.css";

interface CreationFrameProps {
  state: CreationState;
  buildSubject: string;
  imageDataUrl: string | null;
  error: string | null;
  onGenerate: () => void;
  onRetry: () => void;
}

// Presentation-only timing, independent of the actual request -- it loops
// for as long as `state === "generating"` and is torn down (via the effect
// cleanup below) the instant the real response arrives, so it never implies
// completion on its own.
const STEP_DURATION_MS = 1750;

export default function CreationFrame({
  state,
  buildSubject,
  imageDataUrl,
  error,
  onGenerate,
  onRetry,
}: CreationFrameProps) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (state !== "generating") {
      setStepIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setStepIndex((i) => (i + 1) % GENERATING_STEPS.length);
    }, STEP_DURATION_MS);
    return () => clearInterval(interval);
  }, [state]);

  return (
    <div className="creation-frame">
      <div className="creation-frame__head">
        <span className="creation-frame__tape" aria-hidden="true" />
        <h2 className="creation-frame__title">Your Creation</h2>
      </div>

      <div className="creation-frame__window" data-state={state}>
        {state === "empty" && (
          <div className="creation-frame__center">
            <p className="creation-frame__hand">Nothing here yet.</p>
            <p className="creation-frame__small">
              After your conversation, you’ll get to generate your creation!
            </p>
          </div>
        )}

        {state === "ready" && (
          <div className="creation-frame__center">
            <p className="creation-frame__prompt">That&rsquo;s it! Now let&rsquo;s see what you taught it.</p>
            <PaperButton type="button" onClick={onGenerate}>
              Create My Image →
            </PaperButton>
          </div>
        )}

        {state === "generating" && (
          <div className="creation-frame__generating" role="status" aria-live="polite">
            <p className="creation-frame__generating-title">{GENERATING_TITLE}</p>
            <div className="creation-frame__generating-stage">
              {GENERATING_STEPS.map((step, i) => (
                <p
                  key={step}
                  className={`creation-frame__generating-line${
                    i === stepIndex ? " creation-frame__generating-line--active" : ""
                  }`}
                >
                  {step}
                </p>
              ))}
            </div>
          </div>
        )}

        {state === "complete" && imageDataUrl && (
          <div className="creation-frame__complete">
            <img
              className="creation-frame__image"
              src={imageDataUrl}
              alt={`A generated concept image of ${buildSubject}`}
            />
          </div>
        )}

        {state === "error" && (
          <div className="creation-frame__center">
            <p className="creation-frame__prompt creation-frame__prompt--error" role="alert">
              {error || "Something went wrong building your creation."}
            </p>
            <PaperButton type="button" onClick={onRetry}>
              Try Again
            </PaperButton>
          </div>
        )}
      </div>

      {state === "complete" && (
        <>
          <div className="creation-frame__note">
            <p className="creation-frame__note-caption">Your creation is ready!</p>
            <p className="creation-frame__note-body">
              Hopefully your AI brought your idea to life! If something isn&rsquo;t quite what you pictured, keep it
              in mind. Throughout the course, we&rsquo;ll explore different factors that influence output quality.
            </p>
          </div>
          <p className="creation-frame__disclaimer">
            <strong>Just a reminder:</strong> If you refresh, close, or leave this page, your conversation and
            creation will be lost.
          </p>
        </>
      )}
    </div>
  );
}
