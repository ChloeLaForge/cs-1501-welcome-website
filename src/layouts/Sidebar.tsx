import { NavLink } from "react-router-dom";
import { NAV_ITEMS, AI_FRIEND_PATH } from "../data/nav";
import { useAiFriendAvailability } from "../hooks/useAiFriendAvailability";
import "./Sidebar.css";

export default function Sidebar() {
  const aiFriendAvailable = useAiFriendAvailability();
  const items = aiFriendAvailable === "available" ? NAV_ITEMS : NAV_ITEMS.filter((item) => item.path !== AI_FRIEND_PATH);

  return (
    <nav className="sidebar" aria-label="Site">
      <div className="sidebar__label">
        <span className="sidebar__label-tape" aria-hidden="true" />
        <span className="sidebar__label-course">CS 1501</span>
        <span className="sidebar__label-title">Coding with AI Systems</span>
      </div>

      <ol className="sidebar__list">
        {items.map((item) => (
          <li key={item.path} className="sidebar__item">
            <NavLink
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                "sidebar__link" + (isActive ? " sidebar__link--active" : "")
              }
            >
              {({ isActive }) => (
                <>
                  <span className="sidebar__mark" aria-hidden="true">
                    {isActive ? "→ " : ""}
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ol>

      <div className="sidebar__doodles" aria-hidden="true">
        <svg viewBox="0 0 20 32" className="sidebar__doodle">
          <path
            d="M6 6 L6 24 a4 4 0 0 0 8 0 L14 9 a2.5 2.5 0 0 0-5 0 L9 21"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <svg viewBox="0 0 24 24" className="sidebar__doodle">
          <path
            d="M12 3 L21 8 V16 L12 21 L3 16 V8 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path d="M12 3 V11 M3 8 L12 11 L21 8 M12 11 V21" fill="none" stroke="currentColor" strokeWidth="1.1" />
        </svg>
        <svg viewBox="0 0 20 20" className="sidebar__doodle">
          <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
            <line x1="10" y1="1" x2="10" y2="19" />
            <line x1="1" y1="10" x2="19" y2="10" />
            <line x1="3.5" y1="3.5" x2="16.5" y2="16.5" />
            <line x1="16.5" y1="3.5" x2="3.5" y2="16.5" />
          </g>
        </svg>
      </div>
    </nav>
  );
}
