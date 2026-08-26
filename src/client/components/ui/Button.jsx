import { LoaderCircle } from 'lucide-react';
import { forwardRef } from 'react';

/**
 * The one button. `variant` picks intent, `loading` swaps the leading icon for
 * a spinner and disables interaction without collapsing the button's width.
 */
export const Button = forwardRef(function Button(
  { variant = 'secondary', size, icon: Icon, loading = false, block = false, className = '', children, ...rest },
  ref,
) {
  const classes = [
    'btn',
    `btn--${variant}`,
    size ? `btn--${size}` : '',
    block ? 'btn--block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // `rest` is spread first so an explicit `disabled={false}` on a loading
  // button cannot re-enable it.
  return (
    <button ref={ref} type="button" {...rest} className={classes} disabled={loading || rest.disabled}>
      {loading ? (
        <LoaderCircle className="btn__spinner" size={16} aria-hidden="true" />
      ) : (
        Icon && <Icon size={16} aria-hidden="true" />
      )}
      {children}
    </button>
  );
});

/**
 * Icon-only button. `label` is mandatory because there is no visible text to
 * announce — it becomes both the accessible name and the hover tooltip.
 */
export const IconButton = forwardRef(function IconButton(
  { icon: Icon, label, size = 16, tone, bordered = false, small = false, className = '', ...rest },
  ref,
) {
  const classes = [
    'icon-btn',
    small ? 'icon-btn--sm' : '',
    bordered ? 'icon-btn--bordered' : '',
    tone === 'danger' ? 'icon-btn--danger' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button ref={ref} type="button" className={classes} aria-label={label} title={label} {...rest}>
      <Icon size={size} aria-hidden="true" />
    </button>
  );
});

export function LinkButton({ icon: Icon, children, className = '', ...rest }) {
  return (
    <button type="button" className={`link-btn ${className}`.trim()} {...rest}>
      {Icon && <Icon size={15} aria-hidden="true" />}
      {children}
    </button>
  );
}
