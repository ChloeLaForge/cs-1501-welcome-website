import { Link } from "react-router-dom";
import type { CSSProperties } from "react";
import "./StickyNote.css";

interface StickyNoteProps {
  to: string;
  title: string;
  detail: string;
  color: "yellow" | "sage" | "blue" | "terracotta" | "gold";
  rotate: number;
  tape?: "left" | "right" | "none";
  style?: CSSProperties;
}

export default function StickyNote({ to, title, detail, color, rotate, tape = "none", style }: StickyNoteProps) {
  return (
    <Link
      to={to}
      className={`sticky-note sticky-note--${color}`}
      style={{ "--rot": `${rotate}deg`, ...style } as CSSProperties}
    >
      {tape !== "none" && <span className={`sticky-note__tape sticky-note__tape--${tape}`} aria-hidden="true" />}
      <span className="sticky-note__title">{title}</span>
      <span className="sticky-note__detail">{detail}</span>
    </Link>
  );
}
