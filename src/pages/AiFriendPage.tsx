import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { ChatMessage, CompanionConfig, CreationState } from "../types/aiFriend";
import {
  MAX_STUDENT_TURNS,
  buildCompanionLoadingSteps,
  buildOpeningMessage,
  resolveBuildSubject,
} from "../data/aiFriendOptions";
import { cancelAiFriendRequests, generateCreationImage, sendCompanionMessage, startAiFriendSession } from "../lib/aiFriendClient";
import { useAiFriendAvailability } from "../hooks/useAiFriendAvailability";
import PaperButton from "../components/PaperButton";
import AiFriendConfigForm from "../components/AiFriendConfigForm";
import AiFriendBuildSequence from "../components/AiFriendBuildSequence";
import AiFriendChat from "../components/AiFriendChat";
import CreationFrame from "../components/CreationFrame";
import "./AiFriendPage.css";

type Stage = "build" | "loading" | "transition" | "workspace";

export default function AiFriendPage() {
  // Direct-route guard (spec: a bookmarked URL must not bypass
  // availability). Checked once on entry only -- if a student is already
  // partway through a session and the budget locks mid-visit, they are
  // deliberately NOT bounced out here; their next chat/generate request
  // fails safely instead (see chatError/generateError below), and their
  // saved conversation is untouched.
  const aiFriendAvailable = useAiFriendAvailability();
  useEffect(() => {
    return () => cancelAiFriendRequests();
  }, []);

  const [stage, setStage] = useState<Stage>("build");

  // --- Part One: configuration form state ---
  const [subjectLabel, setSubjectLabel] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [tone, setTone] = useState("");
  const [workingStyle, setWorkingStyle] = useState("");
  const [customInstruction, setCustomInstruction] = useState("");

  const [config, setConfig] = useState<CompanionConfig | null>(null);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const isStartingSessionRef = useRef(false);
  const [buildError, setBuildError] = useState<string | null>(null);

  // --- Part Two: bounded design conversation ---
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const isSendingRef = useRef(false);

  // --- Part Three: creation frame ---
  const [creationState, setCreationState] = useState<CreationState>("empty");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const isGeneratingRef = useRef(false);

  const resolvedBuildSubject = resolveBuildSubject(subjectLabel, customSubject);
  const isConfigComplete = resolvedBuildSubject.length > 0 && tone !== "" && workingStyle !== "";
  const studentTurnCount = messages.filter((m) => m.role === "user").length;

  // Persists the configuration (Part One) before the conversation that
  // depends on it happens, per spec -- a refresh right after this point
  // still leaves a reviewable session for the instructor even if the
  // student never sends a single message.
  async function handleBuild() {
    if (!isConfigComplete || isStartingSessionRef.current) return;
    isStartingSessionRef.current = true;
    const nextConfig: CompanionConfig = {
      buildSubject: resolvedBuildSubject,
      tone,
      workingStyle,
      customInstruction: customInstruction.trim(),
    };
    setBuildError(null);
    setIsStartingSession(true);
    try {
      await startAiFriendSession({
        subjectLabel,
        customSubject,
        config: nextConfig,
        openingMessage: buildOpeningMessage(nextConfig),
      });
      setConfig(nextConfig);
      setStage("loading");
    } catch (err) {
      setBuildError(err instanceof Error ? err.message : "Something went wrong. Try again?");
    } finally {
      isStartingSessionRef.current = false;
      setIsStartingSession(false);
    }
  }

  function handleBuildComplete() {
    setStage("transition");
  }

  function handleEnterConversation() {
    if (!config) return;
    setMessages([{ id: crypto.randomUUID(), role: "assistant", content: buildOpeningMessage(config) }]);
    setChatError(null);
    setChatInput("");
    setCreationState("empty");
    setImageDataUrl(null);
    setGenerateError(null);
    setStage("workspace");
  }

  async function runSend(history: ChatMessage[]) {
    if (!config || isSendingRef.current) return;
    isSendingRef.current = true;
    setIsSending(true);
    setChatError(null);
    try {
      const { reply, isFinalTurn } = await sendCompanionMessage(config, history);
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: reply }]);
      if (isFinalTurn) setCreationState("ready");
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Something went wrong reaching your companion. Try again?");
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
    }
  }

  function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSending || creationState !== "empty" || studentTurnCount >= MAX_STUDENT_TURNS) return;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: trimmed };
    const next = [...messages, userMessage];
    setMessages(next);
    setChatInput("");
    void runSend(next);
  }

  function handleChatRetry() {
    if (isSending || messages.length === 0) return;
    void runSend(messages);
  }

  async function runGenerate() {
    if (!config || isGeneratingRef.current) return;
    isGeneratingRef.current = true;
    setCreationState("generating");
    setGenerateError(null);
    try {
      const url = await generateCreationImage(config.buildSubject, messages);
      setImageDataUrl(url);
      setCreationState("complete");
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Something went wrong building your creation.");
      setCreationState("error");
    } finally {
      isGeneratingRef.current = false;
    }
  }

  // Render nothing while the initial availability check is in flight, and
  // nothing on a confirmed-unavailable result either -- the effect above
  // is already navigating away in that case.
  if (aiFriendAvailable === "loading") {
    return <p className="ai-friend-page__availability" role="status">Checking whether the AI Friend is available…</p>;
  }
  if (aiFriendAvailable !== "available") {
    return (
      <div className="ai-friend-page__availability" role="alert">
        <h1>Build an AI Friend</h1>
        <p>This feature isn&rsquo;t available right now. Please check back later.</p>
        <Link to="/">← Back to Welcome</Link>
      </div>
    );
  }

  return (
    <div className="ai-friend-page">
      {stage === "build" && (
        <div className="ai-friend-page__build">
          <header className="ai-friend-page__header">
            <h1 className="ai-friend-page__title">Build an AI Friend</h1>
            <p className="ai-friend-page__intro">
              This is a tiny preview of something we&rsquo;ll explore throughout the course: how the instructions we
              give AI can change the way it behaves and what it creates.
            </p>
            <p className="ai-friend-page__lead">
              <strong>How it works:</strong> Choose what you want to create and give your AI a few instructions for
              how you want it to work with you. Then, you&rsquo;ll have a short conversation to develop your idea. At
              the end, your AI will turn your conversation into an image.
            </p>
            <p className="ai-friend-page__lead">
              <strong>Keep in mind:</strong> There aren&rsquo;t necessarily &ldquo;right&rdquo; choices here. Just
              make your AI yours.
            </p>
            <p className="ai-friend-page__laptop-note">This demo works best on a laptop.</p>
          </header>

          <div className="build-sheet">
            <AiFriendConfigForm
              subjectLabel={subjectLabel}
              customSubject={customSubject}
              tone={tone}
              workingStyle={workingStyle}
              customInstruction={customInstruction}
              onSubjectLabelChange={setSubjectLabel}
              onCustomSubjectChange={setCustomSubject}
              onToneChange={setTone}
              onWorkingStyleChange={setWorkingStyle}
              onCustomInstructionChange={setCustomInstruction}
            />
            <div className="build-sheet__action">
              <PaperButton
                type="button"
                onClick={() => void handleBuild()}
                disabled={!isConfigComplete || isStartingSession}
                aria-busy={isStartingSession}
              >
                {isStartingSession ? "Getting ready…" : "Build My AI →"}
              </PaperButton>
              {buildError && (
                <p className="build-sheet__error" role="alert">
                  {buildError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {stage === "loading" && config && (
        <div className="ai-friend-page__loading">
          <AiFriendBuildSequence
            steps={buildCompanionLoadingSteps(config.buildSubject)}
            onComplete={handleBuildComplete}
          />
        </div>
      )}

      {stage === "transition" && (
        <div className="ai-friend-page__loading">
          <div className="behavior-transition">
            <span className="behavior-transition__tape" aria-hidden="true" />
            <p className="behavior-transition__text">
              The choices you made above became instructions for your AI. You didn&rsquo;t change what the AI knows,
              but you did give it directions for how to communicate, respond, and work with you.
            </p>
            <PaperButton type="button" onClick={handleEnterConversation}>
              Continue →
            </PaperButton>
          </div>
        </div>
      )}

      {stage === "workspace" && config && (
        <div className="ai-friend-page__workspace">
          <AiFriendChat
            buildSubject={config.buildSubject}
            messages={messages}
            studentTurnCount={studentTurnCount}
            locked={creationState !== "empty"}
            input={chatInput}
            onInputChange={setChatInput}
            onSend={handleSend}
            isSending={isSending}
            error={chatError}
            onRetry={handleChatRetry}
          />
          <CreationFrame
            state={creationState}
            buildSubject={config.buildSubject}
            imageDataUrl={imageDataUrl}
            error={generateError}
            onGenerate={() => void runGenerate()}
            onRetry={() => void runGenerate()}
          />
        </div>
      )}
    </div>
  );
}
