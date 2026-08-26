import { usePrivacy } from '../../context/PrivacyContext.jsx';
import { currency, currencyCompact } from '../../lib/format.js';

/**
 * A currency figure that respects the workspace privacy toggle.
 *
 * Every money value in the UI goes through this so one switch hides all of
 * them. When hidden, the real figure is not rendered at all — not merely
 * covered — so it cannot be read from the DOM or a screenshot.
 */
export function Amount({ value, code = 'PHP', compact = false }) {
  const { hidden } = usePrivacy();

  if (hidden) {
    return (
      <span className="amount-masked" role="img" aria-label="Amount hidden">
        ••••
      </span>
    );
  }

  return <>{compact ? currencyCompact(value, code) : currency(value, code)}</>;
}
