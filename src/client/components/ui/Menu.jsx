import { useEffect, useRef, useState } from 'react';
import { IconButton } from './Button.jsx';

/**
 * Dropdown menu anchored to an icon trigger. Closes on outside click, on
 * Escape, and after any item is chosen. Focus returns to the trigger so
 * keyboard users are not dropped at the top of the document.
 */
export function Menu({ icon, label, items, align = 'right', small = false }) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!anchorRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const choose = (item) => {
    setOpen(false);
    triggerRef.current?.focus();
    item.onSelect?.();
  };

  return (
    <div className="menu-anchor" ref={anchorRef}>
      <IconButton
        ref={triggerRef}
        icon={icon}
        label={label}
        small={small}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      />
      {open && (
        <div className={`menu ${align === 'left' ? 'menu--left' : ''}`.trim()} role="menu">
          {items.map((item, index) =>
            item.divider ? (
              <div className="menu__divider" key={`divider-${index}`} role="separator" />
            ) : item.label && item.heading ? (
              <div className="menu__label" key={item.label}>
                {item.label}
              </div>
            ) : (
              <button
                type="button"
                role="menuitem"
                key={item.label}
                className={item.danger ? 'is-danger' : ''}
                onClick={() => choose(item)}
              >
                {item.icon && <item.icon size={15} aria-hidden="true" />}
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
