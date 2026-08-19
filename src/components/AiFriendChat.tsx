import { useEffect, useRef, type FormEvent } from "react";
import type { ChatMessage } from "../types/aiFriend";
import { MAX_STUDENT_MESSAGE_CHARS, MAX_STUDENT_TURNS } from "../data/aiFriendOptions";
import PaperButton from "./PaperButton";
import "./AiFriendChat.css";

interface AiFriendChatProps {
  buildSubject: string;
  messages: ChatMessage[];
  studentTurnCount: number;
  /** True once the design conversation is over (final reply received, or generation underway/done). */
  locked: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onSend: (text: string) => void;
  isSending: boolean;
  error: string | null;
  onRetry: () => void;
}

export default function AiFriendChat({
  buildSubject,
  messages,
  studentTurnCount,
  locked,
  input,
  onInputChange,
  onSend,
  isSending,
  error,
  onRetry,
}: AiFriendChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: reduceMotion ? "auto" : "smooth" });
  }, [messages, isSending, error]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || isSending || locked || error) return;
    onSend(input);
  }

  const inputDisabled = isSending || locked || !!error || studentTurnCount >= MAX_STUDENT_TURNS;

  return (
    <div className="ai-chat">
      <div className="ai-chat__instructions">
        <h2 className="ai-chat__instructions-title">Now, build something together.</h2>
        <p className="ai-chat__instructions-text">
          Talk through what you want to create and add details as you go. You only have 5 messages, so think about
          what information might be useful.
        </p>
      </div>

      <div className="ai-chat__head">
        <div>
          <p className="ai-chat__eyebrow">Let&rsquo;s design your</p>
          <h3 className="ai-chat__name">{buildSubject}</h3>
        </div>
        <div
          className="ai-chat__turns"
          aria-label={`${Math.min(studentTurnCount, MAX_STUDENT_TURNS)} of ${MAX_STUDENT_TURNS} design turns used`}
        >
          <span className="ai-chat__turns-marks" aria-hidden="true">
            {Array.from({ length: MAX_STUDENT_TURNS }).map((_, i) => (
              <span
                key={i}
                className={"ai-chat__turn-mark" + (i < studentTurnCount ? " ai-chat__turn-mark--used" : "")}
              />
            ))}
          </span>
          <span className="ai-chat__turns-label" aria-hidden="true">
            Message {Math.min(studentTurnCount, MAX_STUDENT_TURNS)} of {MAX_STUDENT_TURNS}
          </span>
        </div>
      </div>

      <div className="ai-chat__environment">
        <div className="ai-chat__messages" ref={scrollRef} role="log" aria-live="polite">
          {messages.map((m) => (
            <p
              key={m.id}
              className={
                m.role === "user"
                  ? "ai-chat__message ai-chat__message--user"
                  : "ai-chat__message ai-chat__message--ai"
              }
            >
              {m.content}
            </p>
          ))}

          {isSending && (
            <p className="ai-chat__status" role="status">
              Thinking…
            </p>
          )}

          {error && (
            <p className="ai-chat__error" role="alert">
              {error}{" "}
              <button type="button" className="ai-chat__retry" onClick={onRetry}>
                Try again
              </button>
            </p>
          )}

          {locked && !error && !isSending && (
            <p className="ai-chat__locked" role="status">
              This design conversation is complete.
            </p>
          )}
        </div>

        <form className="ai-chat__form" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="ai-chat-input">
            Message your companion
          </label>
          <input
            id="ai-chat-input"
            type="text"
            className="ai-chat__input"
            placeholder={locked ? "This conversation is complete." : "Tell your AI what you're imagining..."}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            disabled={inputDisabled}
            autoComplete="off"
            maxLength={MAX_STUDENT_MESSAGE_CHARS}
          />
          <PaperButton type="submit" disabled={inputDisabled || !input.trim()}>
            {isSending ? "Sending…" : "Send →"}
          </PaperButton>
        </form>
      </div>
    </div>
  );
}
