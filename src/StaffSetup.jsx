import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { apiUrl, postJson } from './api.js';

function SetupForm({ token, copy }) {
  const path = `/staff/setup/${encodeURIComponent(token)}`;
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const labels = copy.setup;

  useEffect(() => {
    const controller = new AbortController();
    fetch(apiUrl + path, { signal: controller.signal })
      .then((response) => {
        if (response.status === 410) setStatus('setupUnavailable');
        else if (response.ok) setStatus('valid');
        else setStatus('apiUnavailable');
      })
      .catch(() => { if (!controller.signal.aborted) setStatus('apiUnavailable'); });
    return () => controller.abort();
  }, [path, attempt]);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const values = new FormData(event.currentTarget);
    const password = values.get('password');
    if (password !== values.get('confirmation')) {
      setError('setupPasswordMismatch');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const result = await postJson(path, { password });
      if (result.ok) setStatus('complete');
      else if (result.status === 410) setStatus('setupUnavailable');
      else setError(result.data.error ?? 'apiUnavailable');
    } catch {
      setError('apiUnavailable');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel mx-auto max-w-lg">
      <h1 className="text-3xl font-semibold">{labels.title}</h1>
      {status === 'valid' ? (
        <form className="join-contact staff-login mt-6" onSubmit={submit}>
          <div>
            <label htmlFor="setup-password">{copy.login.password}</label>
            <input id="setup-password" name="password" type="password" autoComplete="new-password"
              minLength={15} maxLength={128} aria-describedby="setup-hint" required />
            <p id="setup-hint" className="field-hint">{labels.hint}</p>
          </div>
          <div>
            <label htmlFor="setup-confirmation">{labels.confirm}</label>
            <input id="setup-confirmation" name="confirmation" type="password" autoComplete="new-password"
              minLength={15} maxLength={128} required />
          </div>
          {error && <p className="field-error" role="alert">{copy[error] ?? copy.apiUnavailable}</p>}
          <button type="submit" className="primary-link w-fit" disabled={busy}>{labels.save}</button>
        </form>
      ) : (
        <p className="mt-4" role="status">{status === 'complete' ? labels.ready : copy[status]}</p>
      )}
      {status === 'complete' && <Link className="primary-link mt-4" to="/login">{copy.login.signIn}</Link>}
      {status === 'apiUnavailable' && (
        <button className="secondary-button mt-4" type="button" onClick={() => setAttempt(attempt + 1)}>{copy.retry}</button>
      )}
    </section>
  );
}

export default function StaffSetup({ copy }) {
  const { token } = useParams();
  return <SetupForm key={token} token={token} copy={copy} />;
}
