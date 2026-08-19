import StickyNote from "../components/StickyNote";
import { useAiFriendAvailability } from "../hooks/useAiFriendAvailability";
import "./WelcomePage.css";

export default function WelcomePage() {
  const aiFriendAvailable = useAiFriendAvailability();

  return (
    <div className="welcome-page">
      <div className="welcome-page__inner">
        <div className="welcome-page__top">
          <header className="welcome-page__intro">
            <h1 className="welcome-page__title">Welcome to CS 1501</h1>
            <p className="welcome-page__subtitle">
              We&rsquo;re going to learn, experiment, and build with AI together.
            </p>
          </header>

          <div className="reminder-card" aria-label="First class: September 1st">
            <span className="reminder-card__tape" aria-hidden="true" />
            <p className="reminder-card__label">First Class</p>
            <p className="reminder-card__date">
              <span>September 1st</span>
            </p>
          </div>
        </div>

        <svg
          className="welcome-page__uva-pennant"
          viewBox="0 0 160 74"
          aria-hidden="true"
        >
          <path
            d="M6 10 Q76 4 148 36 Q76 44 6 62 Q10 36 6 10 Z"
            fill="var(--ink)"
            stroke="var(--uva-orange)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M14 15 L134 36 L14 57"
            fill="none"
            stroke="var(--paper)"
            strokeWidth="0.8"
            strokeDasharray="3 3"
            opacity="0.45"
          />
          <text
            x="22"
            y="42"
            fontFamily="var(--font-mono)"
            fontWeight="700"
            fontSize="20"
            letterSpacing="1"
            fill="var(--paper)"
          >
            UVA
          </text>
          <rect
            x="-4"
            y="14"
            width="20"
            height="12"
            fill="rgba(255, 253, 245, 0.55)"
            stroke="rgba(35, 45, 75, 0.1)"
            transform="rotate(-5 6 20)"
          />
        </svg>

        <p className="welcome-page__cta">
          <svg
            className="welcome-page__cta-arrow welcome-page__cta-arrow--left"
            viewBox="0 0 40 30"
            aria-hidden="true"
          >
            <path d="M36 4 Q 20 4 12 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path
              d="M20 20 L12 22 L16 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Click below to access
          <svg
            className="welcome-page__cta-arrow welcome-page__cta-arrow--right"
            viewBox="0 0 40 30"
            aria-hidden="true"
          >
            <path d="M4 4 Q 20 4 28 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path
              d="M20 20 L28 22 L24 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </p>

        <section className="welcome-page__notes" aria-label="Explore the site">
          <StickyNote
            to="/questions"
            title="Questions"
            detail="The things you might be wondering before we start."
            color="terracotta"
            rotate={-2.5}
            tape="left"
            style={{ marginTop: 0 }}
          />
          <StickyNote
            to="/tell-me-about-you"
            title="Tell Me About You"
            detail="Help me plan a class you'll actually enjoy."
            color="gold"
            rotate={1.8}
            tape="none"
            style={{ marginTop: 26 }}
          />
          {aiFriendAvailable === "available" && (
            <StickyNote
              to="/build-your-ai-friend"
              title="Build Your AI Friend"
              detail="Make something before we even get started."
              color="blue"
              rotate={-1.4}
              tape="right"
              style={{ marginTop: -8 }}
            />
          )}
        </section>

        <p className="welcome-page__signoff">
          <svg className="welcome-page__pennant" viewBox="0 0 30 40" aria-hidden="true">
            <line x1="6" y1="3" x2="6" y2="37" stroke="currentColor" strokeWidth="1.3" />
            <path
              d="M6 6 L25 12 L6 18 Z"
              stroke="currentColor"
              strokeWidth="1.2"
              fill="var(--uva-orange)"
              fillOpacity="0.25"
            />
          </svg>
          Can&rsquo;t wait to see you.
        </p>

        <svg
          className="welcome-page__rotunda"
          viewBox="0 0 240 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          aria-hidden="true"
        >
          {/* dome + finial */}
          <path d="M75 75 Q120 14 165 75" />
          <path d="M87 75 Q120 38 153 75" opacity="0.6" />
          <line x1="120" y1="14" x2="120" y2="5" />
          <circle cx="120" cy="3.5" r="2.2" fill="var(--uva-orange)" stroke="none" />
          {/* drum + oculus windows */}
          <line x1="80" y1="75" x2="80" y2="108" />
          <line x1="160" y1="75" x2="160" y2="108" />
          <line x1="75" y1="108" x2="165" y2="108" />
          <line x1="95" y1="75" x2="95" y2="46" />
          <line x1="110" y1="75" x2="110" y2="33" />
          <line x1="130" y1="75" x2="130" y2="33" />
          <line x1="145" y1="75" x2="145" y2="46" />
          {/* pediment */}
          <path d="M60 108 L120 80 L180 108" />
          <path d="M67 106 L120 85 L173 106" opacity="0.5" />
          {/* columns */}
          <line x1="70" y1="109" x2="70" y2="160" />
          <line x1="88" y1="109" x2="88" y2="160" />
          <line x1="106" y1="109" x2="106" y2="160" />
          <line x1="134" y1="109" x2="134" y2="160" />
          <line x1="152" y1="109" x2="152" y2="160" />
          <line x1="170" y1="109" x2="170" y2="160" />
          {/* steps/base */}
          <line x1="55" y1="160" x2="185" y2="160" />
          <line x1="45" y1="168" x2="195" y2="168" />
          <line x1="35" y1="176" x2="205" y2="176" />
          {/* drafting/construction marks */}
          <line x1="20" y1="176" x2="120" y2="15" strokeDasharray="2 4" opacity="0.35" />
          <line x1="220" y1="176" x2="120" y2="15" strokeDasharray="2 4" opacity="0.35" />
          <line x1="35" y1="185" x2="205" y2="185" opacity="0.45" />
          <line x1="35" y1="182" x2="35" y2="188" opacity="0.45" />
          <line x1="205" y1="182" x2="205" y2="188" opacity="0.45" />
        </svg>
      </div>
    </div>
  );
}
