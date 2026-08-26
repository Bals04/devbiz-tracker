import {
  ChevronRight, Eye, EyeOff, LayoutDashboard, ListChecks, LogOut, Menu as MenuIcon, Monitor,
  Moon, Search, Settings, Sun, Users, Wallet, X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { usePrivacy } from '../context/PrivacyContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useHotkey } from '../hooks/useLocalStorage.js';
import { altModKeyLabel, altPlatformName, modKeyLabel } from '../lib/platform.js';
import { CommandPalette } from './CommandPalette.jsx';
import { IconButton } from './ui/Button.jsx';
import { Menu } from './ui/Menu.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/tasks', label: 'Tasks', icon: ListChecks },
  { to: '/payments', label: 'Payments', icon: Wallet },
];

const SECONDARY = [{ to: '/settings', label: 'Settings', icon: Settings }];

/** Breadcrumb trail derived from the path, so it never drifts from the router. */
function useCrumbs(pathname, crumbLabel) {
  if (pathname === '/') return [{ label: 'Dashboard' }];

  const [, first, id] = pathname.split('/');
  const root = [...NAV, ...SECONDARY].find((item) => item.to === `/${first}`);
  const trail = [{ label: root?.label ?? statusOf(first), to: root?.to }];

  if (first === 'clients' && id) trail.push({ label: crumbLabel ?? 'Project' });
  return trail;
}

const statusOf = (segment) => segment.charAt(0).toUpperCase() + segment.slice(1);

function ThemeToggle() {
  const { mode, resolved, setMode } = useTheme();
  const Icon = resolved === 'dark' ? Moon : Sun;

  return (
    <Menu
      icon={Icon}
      label={`Theme: ${mode}`}
      items={[
        { label: 'Theme', heading: true },
        { label: 'Light', icon: Sun, onSelect: () => setMode('light') },
        { label: 'Dark', icon: Moon, onSelect: () => setMode('dark') },
        { label: 'System', icon: Monitor, onSelect: () => setMode('system') },
      ]}
    />
  );
}

export function AppShell({ children, crumbLabel }) {
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { pathname } = useLocation();
  const { session, signOut } = useAuth();
  const { hidden: amountsHidden, toggle: toggleAmounts } = usePrivacy();
  const crumbs = useCrumbs(pathname, crumbLabel);

  useHotkey('k', () => setPaletteOpen(true), { meta: true });

  // A route change should never leave the mobile drawer covering the page.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  const isActive = (to) => (to === '/' ? pathname === '/' : pathname.startsWith(to));

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <aside className={`sidebar ${navOpen ? 'is-open' : ''}`.trim()}>
        <div className="sidebar__head">
          <div className="brand-lockup">
            <span className="brand-mark" aria-hidden="true">
              {'</>'}
            </span>
            <span className="brand-text">
              <strong>DevBiz</strong>
              <span>Client Tracker</span>
            </span>
          </div>
          <IconButton
            icon={X}
            label="Close navigation"
            className="sidebar__close"
            onClick={() => setNavOpen(false)}
          />
        </div>

        <nav className="sidebar__nav" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`nav-link ${isActive(to) ? 'is-active' : ''}`.trim()}
              aria-current={isActive(to) ? 'page' : undefined}
            >
              <Icon size={17} aria-hidden="true" />
              {label}
            </Link>
          ))}

          <div className="sidebar__section">Workspace</div>
          {SECONDARY.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`nav-link ${isActive(to) ? 'is-active' : ''}`.trim()}
              aria-current={isActive(to) ? 'page' : undefined}
            >
              <Icon size={17} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="sidebar__foot">
          <div className="team-strip">
            <span className="avatar avatar--lg" style={{ backgroundColor: 'var(--brand)' }} aria-hidden="true">
              DB
            </span>
            <span className="team-strip__meta">
              <strong className="truncate">{session?.member?.full_name || 'DevBiz Team'}</strong>
              <span>Shared workspace</span>
            </span>
          </div>
          <button type="button" className="nav-link" style={{ width: '100%', marginTop: 'var(--sp-1)' }} onClick={signOut}>
            <LogOut size={17} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      {navOpen && (
        <button type="button" className="scrim" aria-label="Close navigation" onClick={() => setNavOpen(false)} />
      )}

      <div className="shell__main">
        <header className="topbar">
          <IconButton
            icon={MenuIcon}
            label="Open navigation"
            className="nav-toggle"
            bordered
            onClick={() => setNavOpen(true)}
          />

          <nav className="topbar__crumbs" aria-label="Breadcrumb">
            {crumbs.map((crumb, index) => {
              const last = index === crumbs.length - 1;
              return (
                <span key={crumb.label} style={{ display: 'contents' }}>
                  {index > 0 && <ChevronRight size={14} aria-hidden="true" />}
                  {crumb.to && !last ? (
                    <Link to={crumb.to}>{crumb.label}</Link>
                  ) : (
                    <span className="truncate" aria-current={last ? 'page' : undefined}>
                      {crumb.label}
                    </span>
                  )}
                </span>
              );
            })}
          </nav>

          <div className="topbar__spacer" />

          <div className="topbar__actions">
            <button
              type="button"
              className="palette-trigger"
              onClick={() => setPaletteOpen(true)}
              title={`Search or jump to — ${modKeyLabel}+K (or ${altModKeyLabel}+K on ${altPlatformName})`}
            >
              <Search size={15} aria-hidden="true" />
              <span className="palette-trigger__label">Search or jump to…</span>
              {/* Both combos are shown, the viewer's platform first, because the
                  team runs a mix of Windows and macOS and either key works. */}
              <span className="palette-trigger__keys" aria-hidden="true">
                <span className="shortcut-combo">
                  <kbd className="kbd">{modKeyLabel}</kbd>
                  <kbd className="kbd">K</kbd>
                </span>
                <span className="palette-trigger__sep">/</span>
                <span className="shortcut-combo">
                  <kbd className="kbd">{altModKeyLabel}</kbd>
                  <kbd className="kbd">K</kbd>
                </span>
              </span>
            </button>
            <IconButton
              icon={amountsHidden ? EyeOff : Eye}
              label={amountsHidden ? 'Show amounts' : 'Hide amounts'}
              aria-pressed={amountsHidden}
              onClick={toggleAmounts}
            />
            <ThemeToggle />
          </div>
        </header>

        <main id="main" className="page">
          {children}
        </main>
      </div>

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </div>
  );
}
