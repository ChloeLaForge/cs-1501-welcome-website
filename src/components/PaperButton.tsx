import type { ButtonHTMLAttributes } from "react";
import "./PaperButton.css";

type PaperButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export default function PaperButton({ className, children, ...rest }: PaperButtonProps) {
  return (
    <button className={"paper-button" + (className ? ` ${className}` : "")} {...rest}>
      {children}
    </button>
  );
}
