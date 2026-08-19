import type { CompanionConfig } from "../types/aiFriend";

export interface BuildSubjectOption {
  label: string;
  value: string;
}

export const CUSTOM_BUILD_SUBJECT_LABEL = "Something Else";

export const BUILD_SUBJECT_OPTIONS: BuildSubjectOption[] = [
  { label: "House", value: "house" },
  { label: "Theme Park", value: "theme park" },
  { label: "Stadium", value: "stadium" },
  { label: "Outfit", value: "outfit" },
  { label: "Dream Room", value: "dream room" },
];

export const BUILD_SUBJECT_LABELS = [...BUILD_SUBJECT_OPTIONS.map((o) => o.label), CUSTOM_BUILD_SUBJECT_LABEL];

export const TONE_OPTIONS = ["Friendly & Encouraging", "Straight to the Point", "Curious & Questioning", "Creative & Excited"];

export const WORKING_STYLE_OPTIONS = [
  "Ask me lots of questions",
  "Give me ideas along the way",
  "Follow my direction closely",
  "Surprise me a little",
];

export const MAX_BUILD_SUBJECT_CHARS = 60;
export const MAX_CUSTOM_INSTRUCTION_CHARS = 250;
export const MAX_STUDENT_MESSAGE_CHARS = 1000;
// Hard cap on the bounded design conversation. Kept in sync by hand with
// MAX_STUDENT_TURNS in server/aiServer.ts, which is the value that's
// actually enforced -- this copy only drives client-side UI/UX.
export const MAX_STUDENT_TURNS = 5;

/** Resolves a selected NotebookChoice label (or custom text) to the buildSubject sent to the server. */
export function resolveBuildSubject(selectedLabel: string, customText: string): string {
  if (selectedLabel === CUSTOM_BUILD_SUBJECT_LABEL) return customText.trim();
  const preset = BUILD_SUBJECT_OPTIONS.find((o) => o.label === selectedLabel);
  return preset ? preset.value : "";
}

const TONE_OPENERS: Record<string, string> = {
  "Friendly & Encouraging": "I love where this could go already.",
  "Straight to the Point": "Let's get into it.",
  "Curious & Questioning": "I've already got a dozen questions -- let's start with the big ones.",
  "Creative & Excited": "Ooh, exciting — let's make something fun.",
};

const WORKING_STYLE_OPENERS: Record<string, string> = {
  "Ask me lots of questions": "I'm going to ask a few quick questions to understand what you're picturing.",
  "Give me ideas along the way": "I'll toss out a few ideas as we go so you can pick what feels right.",
  "Follow my direction closely": "I'll stick closely to whatever you tell me.",
  "Surprise me a little": "I might throw in a surprise or two along the way.",
};

// Generated locally so the opening line costs no API call -- the student
// hasn't said anything yet, so there's nothing worth spending a request on.
// It also doubles as the companion's first (broad, high-information)
// question, so the bounded 5-turn budget starts on the student's very
// first reply rather than being spent on small talk.
export function buildOpeningMessage(config: CompanionConfig): string {
  const toneLine = TONE_OPENERS[config.tone] ?? `I'm ${config.tone.toLowerCase()}, in case that wasn't clear.`;
  const styleLine = WORKING_STYLE_OPENERS[config.workingStyle] ?? "Let's figure this out together.";
  const question = `So, tell me about your ${config.buildSubject} — when you picture it finished, what's the first thing you'd notice?`;
  return `${toneLine} ${styleLine} ${question}`;
}

export function buildCompanionLoadingSteps(buildSubject: string): string[] {
  return [
    "Learning how you like to work...",
    `Getting ready to help with your ${buildSubject}...`,
    "Setting a few ground rules...",
    "Your companion is ready.",
  ];
}

// Persistent heading shown for the whole "generating" state (see
// CreationFrame), plus the lines that reveal progressively beneath it. These
// are presentation states only, not literal backend processing stages --
// the last line holds until the real image request actually resolves.
export const GENERATING_TITLE = "Building your creation...";

export const GENERATING_STEPS: string[] = [
  "Reading through your conversation...",
  "Pulling out the details you gave your AI...",
  "Turning your ideas into an image...",
  "Almost there...",
];
