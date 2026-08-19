import NotebookChoice from "./NotebookChoice";
import {
  BUILD_SUBJECT_LABELS,
  CUSTOM_BUILD_SUBJECT_LABEL,
  MAX_BUILD_SUBJECT_CHARS,
  MAX_CUSTOM_INSTRUCTION_CHARS,
  TONE_OPTIONS,
  WORKING_STYLE_OPTIONS,
} from "../data/aiFriendOptions";
import "./AiFriendConfigForm.css";

interface AiFriendConfigFormProps {
  subjectLabel: string;
  customSubject: string;
  tone: string;
  workingStyle: string;
  customInstruction: string;
  onSubjectLabelChange: (value: string) => void;
  onCustomSubjectChange: (value: string) => void;
  onToneChange: (value: string) => void;
  onWorkingStyleChange: (value: string) => void;
  onCustomInstructionChange: (value: string) => void;
}

export default function AiFriendConfigForm({
  subjectLabel,
  customSubject,
  tone,
  workingStyle,
  customInstruction,
  onSubjectLabelChange,
  onCustomSubjectChange,
  onToneChange,
  onWorkingStyleChange,
  onCustomInstructionChange,
}: AiFriendConfigFormProps) {
  return (
    <div className="ai-config-form">
      <NotebookChoice
        name="buildSubject"
        legend="What do you want to create?"
        options={BUILD_SUBJECT_LABELS}
        value={subjectLabel}
        onChange={onSubjectLabelChange}
        required
      />

      {subjectLabel === CUSTOM_BUILD_SUBJECT_LABEL && (
        <div className="ai-config-form__field ai-config-form__field--custom-subject">
          <label className="ai-config-form__label" htmlFor="ai-custom-subject">
            Tell me what you want to build.
          </label>
          <input
            id="ai-custom-subject"
            type="text"
            className="ai-config-form__input"
            placeholder="A treehouse, a spaceship, a library..."
            value={customSubject}
            onChange={(e) => onCustomSubjectChange(e.target.value)}
            maxLength={MAX_BUILD_SUBJECT_CHARS}
            required
          />
        </div>
      )}

      <NotebookChoice
        name="companionTone"
        legend="How should your AI talk to you?"
        options={TONE_OPTIONS}
        value={tone}
        onChange={onToneChange}
        required
      />

      <NotebookChoice
        name="companionWorkingStyle"
        legend="How should your AI work with you?"
        options={WORKING_STYLE_OPTIONS}
        value={workingStyle}
        onChange={onWorkingStyleChange}
        required
      />

      <div className="ai-config-form__field">
        <label className="ai-config-form__label" htmlFor="ai-custom-instruction">
          Anything else you want your AI to know?
        </label>
        <textarea
          id="ai-custom-instruction"
          className="ai-config-form__textarea"
          placeholder={'"I love bright colors," "push me to be more creative," "keep your answers short…"'}
          value={customInstruction}
          onChange={(e) => onCustomInstructionChange(e.target.value.slice(0, MAX_CUSTOM_INSTRUCTION_CHARS))}
          maxLength={MAX_CUSTOM_INSTRUCTION_CHARS}
          rows={2}
        />
        <span className="ai-config-form__counter">
          {customInstruction.length}/{MAX_CUSTOM_INSTRUCTION_CHARS}
        </span>
      </div>
    </div>
  );
}
