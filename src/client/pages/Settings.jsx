import { Eye, EyeOff, LogOut, Monitor, Moon, ShieldCheck, Sun, Users } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Segmented } from '../components/ui/Form.jsx';
import { Alert, Skeleton } from '../components/ui/Feedback.jsx';
import { Avatar } from '../components/ui/Data.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { usePrivacy } from '../context/PrivacyContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useResource } from '../hooks/useResource.js';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

const SHORTCUTS = [
  {
    label: 'Command palette',
    key: 'K',
    description: 'Search clients and jump to any section from anywhere in the app.',
  },
];

export function Settings() {
  const { mode, setMode, resolved } = useTheme();
  const { signOut } = useAuth();
  const { hidden: amountsHidden, toggle: toggleAmounts } = usePrivacy();
  const { data: members, loading, error } = useResource('/team-members');

  return (
    <>
      <header className="page-head">
        <div>
          <span className="eyebrow">Workspace</span>
          <h1>Settings</h1>
          <p>Appearance, team and session preferences for this workspace.</p>
        </div>
      </header>

      <section className="card card--pad">
        <div className="card__header">
          <div>
            <h2>Appearance</h2>
            <p>Applies to this browser only, and is remembered between visits.</p>
          </div>
        </div>

        <div className="setting-row">
          <div className="setting-row__text">
            <strong>Theme</strong>
            <p>
              “System” follows your operating system setting. Currently showing the{' '}
              <strong style={{ color: 'var(--brand-text)' }}>{resolved}</strong> theme.
            </p>
          </div>
          <Segmented options={THEME_OPTIONS} value={mode} onChange={setMode} label="Theme" />
        </div>

        <div className="setting-row">
          <div className="setting-row__text">
            <strong>Hide amounts</strong>
            <p>
              Masks every contract value, payment and balance across the app — useful when screen-sharing.
              Also available from the eye icon in the topbar.
            </p>
          </div>
          <Button
            icon={amountsHidden ? EyeOff : Eye}
            onClick={toggleAmounts}
            aria-pressed={amountsHidden}
          >
            {amountsHidden ? 'Amounts hidden' : 'Amounts visible'}
          </Button>
        </div>
      </section>

      <section className="card card--pad" style={{ marginTop: 'var(--sp-4)' }}>
        <div className="card__header">
          <div>
            <h2>Keyboard shortcuts</h2>
            <p>
              Both modifiers work everywhere. The topbar shows whichever one matches the device you are on.
            </p>
          </div>
        </div>

        {SHORTCUTS.map((shortcut) => (
          <div className="setting-row" key={shortcut.label}>
            <div className="setting-row__text">
              <strong>{shortcut.label}</strong>
              <p>{shortcut.description}</p>
            </div>
            <span className="shortcut-keys">
              <span className="shortcut-combo">
                <kbd className="kbd">Ctrl</kbd>
                <kbd className="kbd">{shortcut.key}</kbd>
              </span>
              <span className="shortcut-or">or</span>
              <span className="shortcut-combo">
                <kbd className="kbd">⌘</kbd>
                <kbd className="kbd">{shortcut.key}</kbd>
              </span>
            </span>
          </div>
        ))}
      </section>

      <section className="card card--pad" style={{ marginTop: 'var(--sp-4)' }}>
        <div className="card__header">
          <div>
            <h2>Team</h2>
            <p>People who can be assigned to tasks on any board.</p>
          </div>
        </div>

        {error && <Alert>{error}</Alert>}

        {loading ? (
          <div className="stack" style={{ gap: 'var(--sp-3)' }}>
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} height={40} radius="var(--r-md)" />
            ))}
          </div>
        ) : (
          <ul className="stack" style={{ gap: 'var(--sp-2)' }}>
            {(members ?? []).map((member) => (
              <li className="payment-row" key={member.id} style={{ gridTemplateColumns: 'auto 1fr auto' }}>
                <Avatar name={member.name} color={member.avatar_color} size="lg" />
                <span style={{ minWidth: 0 }}>
                  <strong>{member.name}</strong>
                  <span>Can be assigned to tasks</span>
                </span>
                <span className="badge badge--success">Active</span>
              </li>
            ))}
            {(members ?? []).length === 0 && (
              <li className="muted">
                <Users size={15} aria-hidden="true" /> No team members yet.
              </li>
            )}
          </ul>
        )}
      </section>

      <section className="card card--pad" style={{ marginTop: 'var(--sp-4)' }}>
        <div className="card__header">
          <div>
            <h2>Session</h2>
            <p>This workspace is protected by a shared access code.</p>
          </div>
        </div>

        <div className="setting-row">
          <div className="setting-row__text">
            <strong>
              <ShieldCheck size={15} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} /> Access
              code
            </strong>
            <p>
              The code is verified server-side and stored in a signed, HTTP-only cookie that expires after 12 hours.
              To change it, update the environment variable and redeploy.
            </p>
          </div>
        </div>

        <div className="setting-row">
          <div className="setting-row__text">
            <strong>Sign out</strong>
            <p>Clears the session cookie on this device.</p>
          </div>
          <Button variant="danger" icon={LogOut} onClick={signOut}>
            Sign out
          </Button>
        </div>
      </section>
    </>
  );
}
