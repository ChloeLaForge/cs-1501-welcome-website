import "./NotebookChoice.css";

interface NotebookChoiceProps {
  name: string;
  legend: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export default function NotebookChoice({
  name,
  legend,
  options,
  value,
  onChange,
  required,
}: NotebookChoiceProps) {
  return (
    <fieldset className="notebook-choice">
      <legend className="notebook-choice__legend">
        {legend}
        {required && (
          <span className="notebook-choice__required" aria-hidden="true">
            *
          </span>
        )}
      </legend>
      <div className="notebook-choice__options">
        {options.map((option) => {
          const id = `${name}-${option.replace(/\s+/g, "-").toLowerCase()}`;
          return (
            <div className="option" key={option}>
              <input
                type="radio"
                id={id}
                name={name}
                value={option}
                checked={value === option}
                onChange={() => onChange(option)}
                required={required}
                className="option__input sr-only"
              />
              <label htmlFor={id} className="option__label">
                <span className="option__mark" aria-hidden="true" />
                <span className="option__text">{option}</span>
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
