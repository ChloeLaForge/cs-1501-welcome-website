import { FAQS } from "../data/faqs";
import Flashcard from "../components/Flashcard";
import "./QuestionsPage.css";

const ROTATIONS = [-1.6, 1.1, -0.7, 1.7, -1.3, 0.8, -1.8, 1.3, -0.6, 1.2];

export default function QuestionsPage() {
  return (
    <div className="questions-page">
      <svg
        className="questions-page__stadium"
        viewBox="0 0 260 150"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        aria-hidden="true"
      >
        {/* tiered bowl / stands, side profile */}
        <path d="M8 100 Q130 18 252 100" />
        <path d="M23 105 Q130 34 237 105" opacity="0.7" />
        <path d="M38 110 Q130 50 222 110" opacity="0.6" />
        <path d="M53 115 Q130 66 207 115" opacity="0.5" />
        {/* base / field line */}
        <line x1="60" y1="119" x2="200" y2="119" />
        <rect x="92" y="119" width="76" height="13" />
        <line x1="112" y1="119" x2="112" y2="132" opacity="0.5" />
        <line x1="130" y1="119" x2="130" y2="132" opacity="0.5" />
        <line x1="148" y1="119" x2="148" y2="132" opacity="0.5" />
        {/* light towers */}
        <line x1="28" y1="98" x2="28" y2="58" />
        <line x1="22" y1="58" x2="34" y2="58" />
        <line x1="90" y1="44" x2="90" y2="16" />
        <line x1="83" y1="16" x2="97" y2="16" />
        <line x1="170" y1="44" x2="170" y2="16" />
        <line x1="163" y1="16" x2="177" y2="16" />
        <line x1="232" y1="98" x2="232" y2="58" />
        <line x1="226" y1="58" x2="238" y2="58" />
        {/* scoreboard */}
        <rect x="103" y="53" width="54" height="19" />
        <text
          x="130"
          y="66"
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize="8.5"
          letterSpacing="0.5"
          fill="currentColor"
          stroke="none"
        >
          VIRGINIA
        </text>
        <line
          x1="110"
          y1="70"
          x2="150"
          y2="70"
          className="questions-page__stadium-accent"
          strokeWidth="1.2"
        />
        {/* drafting/construction marks */}
        <line x1="20" y1="140" x2="240" y2="140" strokeDasharray="2 4" opacity="0.4" />
        <line x1="20" y1="137" x2="20" y2="143" opacity="0.4" />
        <line x1="240" y1="137" x2="240" y2="143" opacity="0.4" />
      </svg>

      <header className="questions-page__header">
        <h1 className="questions-page__title">Questions</h1>
        <p className="questions-page__subtitle">
          A few things you might be wondering before we get started.
        </p>
      </header>

      <ul className="questions-page__grid">
        {FAQS.map((faq, i) => (
          <Flashcard
            key={faq.question}
            index={i}
            question={faq.question}
            answer={faq.answer}
            rotate={ROTATIONS[i % ROTATIONS.length]}
          />
        ))}
      </ul>
    </div>
  );
}
