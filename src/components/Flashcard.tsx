import { useState } from "react";
import "./Flashcard.css";

interface FlashcardProps {
  index: number;
  question: string;
  answer: string;
  rotate: number;
}

export default function Flashcard({ index, question, answer, rotate }: FlashcardProps) {
  const [flipped, setFlipped] = useState(false);
  const number = String(index + 1).padStart(2, "0");

  return (
    <li className="flashcard-item" style={{ "--rot": `${rotate}deg` } as React.CSSProperties}>
      <button
        type="button"
        className="flashcard"
        aria-pressed={flipped}
        onClick={() => setFlipped((f) => !f)}
      >
        <span className="sr-only">
          {flipped
            ? `Card ${number}, showing answer. Press to see the question again.`
            : `Card ${number}, showing question. Press to see the answer.`}
        </span>
        <span className="flashcard__scene" aria-hidden="true">
          <span className="flashcard__card" data-flipped={flipped}>
            <span className="flashcard__face flashcard__face--front">
              <span className="flashcard__number">{number}</span>
              <span className="flashcard__question">{question}</span>
              <span className="flashcard__hint">tap to flip</span>
            </span>
            <span className="flashcard__face flashcard__face--back">
              <span className="flashcard__number">{number}</span>
              <span className="flashcard__answer">{answer}</span>
            </span>
          </span>
        </span>
      </button>
    </li>
  );
}
