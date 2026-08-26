import { AlertCircle, Search, X } from 'lucide-react';
import { useId } from 'react';

/**
 * Labelled form control wrapper. Wires label/hint/error to the input through
 * generated ids so the association survives without hand-written htmlFor.
 */
export function Field({ label, hint, error, optional = false, span = false, children }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className={`field ${span ? 'span-2' : ''}`.trim()}>
      <label className="field__label" htmlFor={id}>
        {label}
        {optional && <span className="field__optional">Optional</span>}
      </label>
      {children({
        id,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? 'true' : undefined,
      })}
      {hint && !error && (
        <span className="field__hint" id={hintId}>
          {hint}
        </span>
      )}
      {error && (
        <span className="field__error" id={errorId}>
          <AlertCircle size={13} aria-hidden="true" />
          {error}
        </span>
      )}
    </div>
  );
}

export function Input({ className = '', ...rest }) {
  return <input className={`input ${className}`.trim()} {...rest} />;
}

export function Textarea({ className = '', rows = 4, ...rest }) {
  return <textarea className={`textarea ${className}`.trim()} rows={rows} {...rest} />;
}

export function Select({ className = '', children, ...rest }) {
  return (
    <select className={`select ${className}`.trim()} {...rest}>
      {children}
    </select>
  );
}

/** Search input with an inline clear affordance once it has a value. */
export function SearchInput({ value, onChange, placeholder = 'Search', label, className = '' }) {
  return (
    <div className={`search ${className}`.trim()}>
      <Search size={16} aria-hidden="true" />
      <input
        type="search"
        value={value}
        aria-label={label ?? placeholder}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button
          type="button"
          className="icon-btn icon-btn--sm"
          style={{ position: 'absolute', right: 3 }}
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

/** Mutually exclusive options, small enough that a select would be overkill. */
export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.icon && <option.icon size={14} aria-hidden="true" />}
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function FilterSelect({ label, value, onChange, options }) {
  return (
    <select
      className="filter-select"
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
