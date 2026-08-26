import {
  ArrowRight, LayoutDashboard, ListChecks, Moon, Plus, Search, Settings, Sun, Users, Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.jsx';
import { useDebounced } from '../hooks/useLocalStorage.js';
import { api } from '../lib/api.js';

/**
 * Cmd/Ctrl-K palette: navigation, quick actions and live client search in one
 * place. Search results are fetched from the same endpoint the Clients page
 * uses, so ranking never diverges between the two.
 */
export function CommandPalette({ onClose }) {
  const [query, setQuery] = useState('');
  const [clients, setClients] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const { setMode, resolved } = useTheme();
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const debounced = useDebounced(query, 200);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const term = debounced.trim();
    if (!term) {
      setClients([]);
      return () => {};
    }

    api(`/clients?search=${encodeURIComponent(term)}`)
      .then((results) => {
        if (!cancelled) setClients(results.slice(0, 6));
      })
      .catch(() => {
        if (!cancelled) setClients([]);
      });

    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const go = (path) => {
    onClose();
    navigate(path);
  };

  const commands = useMemo(() => {
    const base = [
      { group: 'Go to', label: 'Dashboard', icon: LayoutDashboard, run: () => go('/') },
      { group: 'Go to', label: 'Clients', icon: Users, run: () => go('/clients') },
      { group: 'Go to', label: 'Tasks', icon: ListChecks, run: () => go('/tasks') },
      { group: 'Go to', label: 'Payments', icon: Wallet, run: () => go('/payments') },
      { group: 'Go to', label: 'Settings', icon: Settings, run: () => go('/settings') },
      {
        group: 'Actions',
        label: 'Add a client',
        icon: Plus,
        run: () => go('/clients?new=1'),
      },
      {
        group: 'Actions',
        label: resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
        icon: resolved === 'dark' ? Sun : Moon,
        run: () => {
          setMode(resolved === 'dark' ? 'light' : 'dark');
          onClose();
        },
      },
    ];

    const term = query.trim().toLowerCase();
    const filtered = term ? base.filter((item) => item.label.toLowerCase().includes(term)) : base;

    const clientItems = clients.map((client) => ({
      group: 'Clients',
      label: client.project_name,
      hint: client.name,
      icon: ArrowRight,
      run: () => go(`/clients/${client.id}`),
    }));

    return [...clientItems, ...filtered];
    // `go` is stable enough for this list; rebuilding on every keystroke is the
    // intent, and the deps below capture everything that changes the result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, clients, resolved]);

  // Any change to the result set must reset the highlight, or the arrow keys
  // would point at an item that has since moved or disappeared.
  useEffect(() => {
    setActiveIndex(0);
  }, [commands.length]);

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % Math.max(commands.length, 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + commands.length) % Math.max(commands.length, 1));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      commands[activeIndex]?.run();
    }
  };

  // Keep the highlighted row inside the scroll viewport.
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  let lastGroup = null;

  return createPortal(
    <div
      className="palette-scrim"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={onKeyDown}
      >
        <div className="palette__input">
          <Search size={18} aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder="Search clients or jump to a page…"
            aria-label="Search clients or commands"
            aria-controls="palette-results"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="palette__results" id="palette-results" ref={listRef} role="listbox" aria-label="Results">
          {commands.length === 0 && (
            <p style={{ padding: 'var(--sp-6)', textAlign: 'center', color: 'var(--text-muted)' }}>
              No matches for “{query}”.
            </p>
          )}

          {commands.map((command, index) => {
            const showGroup = command.group !== lastGroup;
            lastGroup = command.group;
            const Icon = command.icon;

            return (
              <div key={`${command.group}-${command.label}`}>
                {showGroup && <div className="palette__group">{command.group}</div>}
                <button
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  data-active={index === activeIndex}
                  className="palette__item"
                  onMouseMove={() => setActiveIndex(index)}
                  onClick={command.run}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span style={{ minWidth: 0 }}>
                    <strong className="truncate">{command.label}</strong>
                    {command.hint && <span className="truncate">{command.hint}</span>}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        <div className="palette__footer">
          <span>
            <kbd className="kbd">↑</kbd> <kbd className="kbd">↓</kbd> navigate
          </span>
          <span>
            <kbd className="kbd">↵</kbd> open
          </span>
          <span>
            <kbd className="kbd">esc</kbd> close
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
