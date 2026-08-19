import { useEffect, useRef, useState } from "react";
import "./AiFriendBuildSequence.css";

interface AiFriendBuildSequenceProps {
  steps: string[];
  onComplete: () => void;
}

// Kept in step with the CSS `draw-underline` animation duration in
// AiFriendBuildSequence.css, so the underline finishes roughly as each line
// becomes "done."
const STEP_DURATION_MS = 550;

export default function AiFriendBuildSequence({ steps, onComplete }: AiFriendBuildSequenceProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const completedRef = useRef(false);

  useEffect(() => {
    const isLastStep = stepIndex >= steps.length - 1;
    if (isLastStep && completedRef.current) return;

    const timer = setTimeout(
      () => {
        if (isLastStep) {
          completedRef.current = true;
          onComplete();
        } else {
          setStepIndex((i) => i + 1);
        }
      },
      isLastStep ? STEP_DURATION_MS * 1.4 : STEP_DURATION_MS,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, steps.length]);

  return (
    <div className="build-sequence" role="status" aria-live="polite">
      <span className="build-sequence__tape" aria-hidden="true" />
      <ul className="build-sequence__list">
        {steps.map((step, i) => {
          const state = i < stepIndex ? "done" : i === stepIndex ? "active" : "pending";
          return (
            <li key={step} className={`build-sequence__item build-sequence__item--${state}`}>
              <span className="build-sequence__mark" aria-hidden="true">
                {state === "done" ? "✓" : ""}
              </span>
              <span className="build-sequence__text">{step}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
