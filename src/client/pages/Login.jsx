import { CheckCircle2, KeyRound } from 'lucide-react';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Field, Input } from '../components/ui/Form.jsx';
import { Alert } from '../components/ui/Feedback.jsx';

const POINTS = [
  'Every client, project and deadline in one view',
  'Payments and balances that stay reconciled',
  'A shared board the whole team works from',
];

export function Login() {
  const { session, signIn } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (session) return <Navigate to="/" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signIn(code);
    } catch (authError) {
      setError(authError.message);
      setLoading(false);
    }
  };

  return (
    <main className="login">
      <section className="login__brand">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            {'</>'}
          </span>
          <span className="brand-text">
            <strong>DevBiz</strong>
            <span>Client Tracker</span>
          </span>
        </div>

        <div className="login__copy">
          <span className="eyebrow">Your projects, in one place</span>
          <h1>
            Build with clarity.
            <br />
            <em>Deliver with confidence.</em>
          </h1>
          <p>Track every client, payment, deadline and deliverable from one focused workspace.</p>
        </div>

        <ul className="login__points">
          {POINTS.map((point) => (
            <li key={point}>
              <CheckCircle2 size={17} aria-hidden="true" />
              {point}
            </li>
          ))}
        </ul>

        <span className="login__glow login__glow--a" aria-hidden="true" />
        <span className="login__glow login__glow--b" aria-hidden="true" />
      </section>

      <section className="login__panel">
        <form className="card card--pad login__card" onSubmit={submit}>
          {/* The wordmark lives on the card as well as the brand panel, since
              that panel is hidden on narrow screens. */}
          <div className="login__wordmark">
            <span className="brand-mark" aria-hidden="true">
              {'</>'}
            </span>
            <strong>DevBiz</strong>
          </div>
          <span className="eyebrow">Team access</span>
          <h2>Enter access code</h2>
          <p>Use the private code shared with the DevBiz team.</p>

          {error && (
            <div style={{ marginBottom: 'var(--sp-4)' }}>
              <Alert>{error}</Alert>
            </div>
          )}

          <Field label="Access code">
            {(props) => (
              <div className="input-group">
                <KeyRound size={16} aria-hidden="true" />
                <Input
                  {...props}
                  type="password"
                  inputMode="numeric"
                  autoComplete="current-password"
                  minLength={6}
                  required
                  autoFocus
                  value={code}
                  placeholder="Enter your team code"
                  onChange={(event) => setCode(event.target.value)}
                />
              </div>
            )}
          </Field>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            block
            loading={loading}
            className="login__submit"
            style={{ marginTop: 'var(--sp-5)' }}
          >
            {loading ? 'Checking…' : 'Open workspace'}
          </Button>

          <small className="login__footnote">The code is checked securely by the server.</small>
        </form>
      </section>
    </main>
  );
}
