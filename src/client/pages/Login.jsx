import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Button } from '../components/ui/Button.jsx';
import { CodeInput } from '../components/ui/CodeInput.jsx';
import { Alert } from '../components/ui/Feedback.jsx';

const POINTS = [
  'Every client, project and deadline in one view',
  'Payments and balances that stay reconciled',
  'A shared board the whole team works from',
];

const CODE_LENGTH = 6;
/* A correct code often comes back in well under 100ms, which reads as a glitch
   rather than a check. Holding the verifying state briefly makes the outcome
   legible without meaningfully slowing anyone down. */
const MIN_VERIFY_MS = 900;

export function Login() {
  const { session, signIn } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('idle'); // idle | verifying | success | error
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  if (session) return <Navigate to="/" replace />;

  const wait = (ms) => new Promise((resolve) => timers.current.push(setTimeout(resolve, ms)));

  const verify = async (candidate = code) => {
    if (status === 'verifying' || status === 'success') return;
    if (candidate.length < CODE_LENGTH) {
      setError(`Enter all ${CODE_LENGTH} digits.`);
      setStatus('error');
      return;
    }

    setStatus('verifying');
    setError('');
    const started = Date.now();
    try {
      await signIn(candidate);
      await wait(Math.max(0, MIN_VERIFY_MS - (Date.now() - started)));
      // Hold on the success frame long enough for the tick to land before the
      // redirect swaps the page out.
      setStatus('success');
      await wait(650);
    } catch (authError) {
      await wait(Math.max(0, MIN_VERIFY_MS - (Date.now() - started)));
      setError(authError.message);
      setStatus('error');
      setCode('');
    }
  };

  const submit = (event) => {
    event.preventDefault();
    verify();
  };

  const busy = status === 'verifying' || status === 'success';

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
          <p>Use the {CODE_LENGTH}-digit code shared with the DevBiz team.</p>

          {error && status === 'error' && (
            <div style={{ marginBottom: 'var(--sp-4)' }}>
              <Alert>{error}</Alert>
            </div>
          )}

          <CodeInput
            value={code}
            onChange={(next) => {
              setCode(next);
              if (status === 'error') setStatus('idle');
            }}
            length={CODE_LENGTH}
            status={status}
            invalid={status === 'error'}
            autoFocus
            describedBy="login-code-status"
            onComplete={(complete) => verify(complete)}
          />

          <p className="login__status" id="login-code-status" role="status" aria-live="polite">
            {status === 'verifying' && (
              <>
                <Loader2 size={14} className="login__status-spin" aria-hidden="true" />
                Verifying code…
              </>
            )}
            {status === 'success' && (
              <>
                <ShieldCheck size={14} aria-hidden="true" />
                Code accepted — opening your workspace
              </>
            )}
            {status !== 'verifying' && status !== 'success' && 'The code is checked securely by the server.'}
          </p>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            block
            loading={status === 'verifying'}
            disabled={busy || code.length < CODE_LENGTH}
            className="login__submit"
            style={{ marginTop: 'var(--sp-4)' }}
          >
            {status === 'verifying' ? 'Verifying…' : status === 'success' ? 'Welcome back' : 'Open workspace'}
          </Button>
        </form>
      </section>
    </main>
  );
}
