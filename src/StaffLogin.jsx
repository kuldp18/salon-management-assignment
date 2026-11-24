import { useState } from 'react';
import { useNavigate } from 'react-router';
import { postJson } from './api.js';

export default function StaffLogin({ copy }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const labels = copy.login;

  async function signIn(event) {
    event.preventDefault();
    if (busy) return;
    const credentials = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError('');
    try {
      const result = await postJson('/staff/login', credentials);
      const { role, barberSlug } = result.data;
      if (result.ok && role === 'receptionist') navigate('/reception', { replace: true });
      else if (result.ok && role === 'owner') navigate('/admin', { replace: true });
      else if (result.ok && role === 'barber' && barberSlug) {
        navigate(`/barber/${encodeURIComponent(barberSlug)}`, { replace: true });
      } else setError(result.data.error ?? 'accessDenied');
    } catch {
      setError('apiUnavailable');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel mx-auto max-w-lg">
      <h1 className="text-3xl font-semibold">{labels.title}</h1>
      <form className="join-contact staff-login mt-6" onSubmit={signIn}>
        <div>
          <label htmlFor="staff-email">{labels.email}</label>
          <input id="staff-email" name="email" type="email" autoComplete="username" maxLength={254} required />
        </div>
        <div>
          <label htmlFor="staff-password">{labels.password}</label>
          <input id="staff-password" name="password" type="password" autoComplete="current-password" maxLength={128} required />
        </div>
        {error && <p role="alert" className="field-error">{copy[error] ?? copy.apiUnavailable}</p>}
        <button className="primary-link w-fit" type="submit" disabled={busy}>
          {busy ? labels.signingIn : labels.signIn}
        </button>
      </form>
    </section>
  );
}
