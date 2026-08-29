import { useEffect, useId, useRef } from 'react';

/**
 * Segmented code entry — one box per character, like an OTP field.
 *
 * The value is owned by the parent as a plain string; the boxes are a
 * presentation of it, so paste, backspace and arrow navigation all just
 * rewrite that one string. `status` drives the verifying/success/error
 * animations declaratively rather than the caller poking at DOM.
 */
export function CodeInput({
  value,
  onChange,
  length = 6,
  status = 'idle',
  masked = false,
  autoFocus = false,
  onComplete,
  label = 'Access code',
  describedBy,
  invalid = false,
}) {
  const id = useId();
  const inputs = useRef([]);
  const busy = status === 'verifying' || status === 'success';
  const chars = Array.from({ length }, (_, i) => value[i] ?? '');

  // Return focus to the first empty box after a rejected code so the user can
  // simply retype without reaching for the mouse.
  useEffect(() => {
    if (status === 'error') inputs.current[0]?.focus();
  }, [status]);

  const commit = (next) => {
    const clean = next.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    return clean;
  };

  const focusAt = (index) => {
    const target = inputs.current[Math.max(0, Math.min(length - 1, index))];
    target?.focus();
    target?.select();
  };

  const handleChange = (index) => (event) => {
    const typed = event.target.value.replace(/\D/g, '');
    if (!typed) return;

    // Typing into a filled box replaces that digit; a multi-character value
    // (autofill, or a fast paste into one box) fills forward from here.
    const chunk = typed.slice(0, length - index);
    const next = commit(
      (value.slice(0, index) + chunk + value.slice(index + chunk.length)).slice(0, length),
    );

    const cursor = index + chunk.length;
    if (cursor >= length) {
      inputs.current[length - 1]?.blur();
      if (next.length === length) onComplete?.(next);
    } else {
      focusAt(cursor);
    }
  };

  const handleKeyDown = (index) => (event) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (chars[index]) {
        commit(value.slice(0, index) + value.slice(index + 1));
      } else if (index > 0) {
        commit(value.slice(0, index - 1) + value.slice(index));
        focusAt(index - 1);
      }
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusAt(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusAt(index + 1);
    } else if (event.key === 'Delete') {
      event.preventDefault();
      commit(value.slice(0, index) + value.slice(index + 1));
    }
  };

  const handlePaste = (index) => (event) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    event.preventDefault();
    const next = commit((value.slice(0, index) + pasted).slice(0, length));
    if (next.length >= length) {
      inputs.current[length - 1]?.blur();
      onComplete?.(next);
    } else {
      focusAt(next.length);
    }
  };

  return (
    <div
      className={`code-input code-input--${status}${invalid ? ' code-input--invalid' : ''}`}
      role="group"
      aria-label={label}
      aria-describedby={describedBy}
      aria-busy={status === 'verifying' || undefined}
      style={{ '--code-slots': length }}
    >
      {chars.map((char, index) => (
        <input
          key={index}
          ref={(node) => {
            inputs.current[index] = node;
          }}
          id={index === 0 ? id : undefined}
          className={`code-input__slot${char ? ' is-filled' : ''}`}
          style={{ '--slot': index }}
          type={masked && char ? 'password' : 'text'}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          pattern="\d*"
          maxLength={length}
          aria-label={`${label}, digit ${index + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          value={char}
          disabled={busy}
          autoFocus={autoFocus && index === 0}
          onChange={handleChange(index)}
          onKeyDown={handleKeyDown(index)}
          onPaste={handlePaste(index)}
          onFocus={(event) => event.target.select()}
        />
      ))}
      <span className="code-input__scan" aria-hidden="true">
        <i />
      </span>
    </div>
  );
}

