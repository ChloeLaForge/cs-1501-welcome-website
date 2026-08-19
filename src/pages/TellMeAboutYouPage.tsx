import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import NotebookChoice from "../components/NotebookChoice";
import PaperButton from "../components/PaperButton";
import { submitQuestionnaireResponse } from "../lib/supabaseClient";
import "./TellMeAboutYouPage.css";

const CODING_COMFORT_OPTIONS = [
  "I've never really coded before",
  "I've tried it a little",
  "I'm somewhat comfortable",
  "I'm pretty comfortable",
  "I'm very comfortable",
];

const AI_EXPERIENCE_OPTIONS = [
  "I've never used AI for coding",
  "I've used it to ask coding questions or fix errors",
  "I've used it to help with assignments or small coding tasks",
  "I've used it to build parts of an app, website, or larger project",
  "I regularly use AI to build and work through coding projects",
];

type Status = "idle" | "submitting" | "success" | "error";
const FIRST_NAME_MAX = 80;
const SHORT_ANSWER_MAX = 2000;
const CONTEXT_MAX = 3000;

export default function TellMeAboutYouPage() {
  const [firstName, setFirstName] = useState("");
  const [lastInitial, setLastInitial] = useState("");
  const [codingComfort, setCodingComfort] = useState("");
  const [aiExperience, setAiExperience] = useState("");
  const [buildInterest, setBuildInterest] = useState("");
  const [learningInterest, setLearningInterest] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [validationMessage, setValidationMessage] = useState("");
  const submittingRef = useRef(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submittingRef.current) return;

    if (!firstName.trim() || !lastInitial.trim() || !codingComfort || !aiExperience) {
      setValidationMessage(
        "Please fill in your name and the two required questions before sending.",
      );
      return;
    }
    setValidationMessage("");
    setStatus("submitting");
    submittingRef.current = true;

    try {
      await submitQuestionnaireResponse({
        first_name: firstName.trim(),
        last_initial: lastInitial.trim().toUpperCase(),
        coding_comfort: codingComfort,
        ai_coding_experience: aiExperience,
        build_interest: buildInterest.trim() || null,
        learning_interest: learningInterest.trim() || null,
        additional_context: additionalContext.trim() || null,
      });
      setStatus("success");
    } catch (err) {
      console.error("Questionnaire submission failed:", err);
      setStatus("error");
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <div className="notebook-page">
      <div className="notebook-page__holes" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="notebook-page__margin" aria-hidden="true" />

      <div className="notebook-page__doodles" aria-hidden="true">
        <svg viewBox="0 0 30 40" className="notebook-page__doodle">
          <line x1="6" y1="3" x2="6" y2="37" stroke="currentColor" strokeWidth="1.3" />
          <path
            d="M6 6 L25 12 L6 18 Z"
            stroke="currentColor"
            strokeWidth="1.2"
            fill="var(--uva-orange)"
            fillOpacity="0.25"
          />
        </svg>
        <svg viewBox="0 0 40 30" className="notebook-page__doodle">
          <path d="M10 20 Q20 4 30 20" stroke="currentColor" strokeWidth="1.3" fill="none" />
          <line x1="12" y1="20" x2="12" y2="26" stroke="currentColor" strokeWidth="1.2" />
          <line x1="28" y1="20" x2="28" y2="26" stroke="currentColor" strokeWidth="1.2" />
          <line x1="6" y1="26" x2="34" y2="26" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        <svg viewBox="0 0 20 20" className="notebook-page__doodle">
          <line x1="10" y1="1" x2="10" y2="19" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="1" y1="10" x2="19" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="3.5" y1="3.5" x2="16.5" y2="16.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="16.5" y1="3.5" x2="3.5" y2="16.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </div>

      <div className="notebook-page__sheet">
        <header className="notebook-page__header">
          <h1 className="notebook-page__title">Tell Me About You</h1>
          <p className="notebook-page__subtitle">Help me plan a class you'll actually enjoy.</p>
          <p className="notebook-page__aside">This should only take a minute or two.</p>
        </header>

        {status === "success" ? (
          <div className="notebook-success">
            <h2 className="notebook-success__title">Thank you!</h2>
            <p className="notebook-success__line">This really does help me plan the class.</p>
            <p className="notebook-success__line">See you September 1st.</p>
            <Link to="/" className="notebook-success__back">
              ← Back to Welcome
            </Link>
          </div>
        ) : (
          <form className="notebook-form" onSubmit={handleSubmit} noValidate>
            <div className="name-line">
              <span className="name-line__label">Name:</span>
              <div className="name-line__field">
                <input
                  type="text"
                  className="name-line__input name-line__input--first"
                  placeholder="First name"
                  aria-label="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  maxLength={FIRST_NAME_MAX}
                />
                <span className="name-line__caption">first name</span>
              </div>
              <div className="name-line__field name-line__field--initial">
                <input
                  type="text"
                  className="name-line__input name-line__input--initial"
                  aria-label="Last initial"
                  value={lastInitial}
                  maxLength={1}
                  onChange={(e) => setLastInitial(e.target.value.toUpperCase())}
                  required
                />
                <span className="name-line__caption">last initial</span>
              </div>
            </div>

            <div className="notebook-form__question">
              <NotebookChoice
                name="codingComfort"
                legend="How comfortable are you with coding right now?"
                options={CODING_COMFORT_OPTIONS}
                value={codingComfort}
                onChange={setCodingComfort}
                required
              />
            </div>

            <div className="notebook-form__question">
              <NotebookChoice
                name="aiExperience"
                legend="Which best describes how you use AI for coding?"
                options={AI_EXPERIENCE_OPTIONS}
                value={aiExperience}
                onChange={setAiExperience}
                required
              />
            </div>

            <div className="notebook-form__question">
              <label className="notebook-form__label" htmlFor="buildInterest">
                What would you be excited to build or learn how to do with AI?
              </label>
              <textarea
                id="buildInterest"
                className="notebook-lines notebook-lines--short"
                placeholder="Maybe a website, an app, something useful for school, or just something I've always wanted to make..."
                value={buildInterest}
                onChange={(e) => setBuildInterest(e.target.value)}
                maxLength={SHORT_ANSWER_MAX}
              />
            </div>

            <div className="notebook-form__question">
              <label className="notebook-form__label" htmlFor="learningInterest">
                Is there anything specific you'd like to learn about AI or coding?
              </label>
              <textarea
                id="learningInterest"
                className="notebook-lines notebook-lines--short"
                placeholder="How AI APIs work, how to make a website from scratch, how to get better results from AI, or anything else you're curious about..."
                value={learningInterest}
                onChange={(e) => setLearningInterest(e.target.value)}
                maxLength={SHORT_ANSWER_MAX}
              />
            </div>

            <div className="notebook-form__question">
              <label className="notebook-form__label" htmlFor="additionalContext">
                Why did you take this course? Anything else you'd like me to know?
              </label>
              <textarea
                id="additionalContext"
                className="notebook-lines notebook-lines--tall"
                placeholder="What made you sign up, what you're hoping to get out of the class, or anything that would be helpful for me to know..."
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                maxLength={CONTEXT_MAX}
              />
            </div>

            {validationMessage && (
              <p className="notebook-form__message" role="alert">
                {validationMessage}
              </p>
            )}
            {status === "error" && (
              <p className="notebook-form__message" role="alert">
                Something went wrong — your answers are still here. Try sending them again.
              </p>
            )}

            <div className="notebook-form__submit">
              <PaperButton type="submit" disabled={status === "submitting"} aria-busy={status === "submitting"}>
                {status === "submitting" ? "Sending…" : "Send it in →"}
              </PaperButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
