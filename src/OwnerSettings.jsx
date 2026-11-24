import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { postJson, useLiveResource } from './api.js';

export default function OwnerSettings({ copy, language }) {
  const { data, error, retry } = useLiveResource('/admin');
  const navigate = useNavigate();
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [role, setRole] = useState('receptionist');
  const [link, setLink] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const labels = copy.admin;
  const number = new Intl.NumberFormat(language === 'gu' ? 'gu-IN-u-nu-gujr' : 'en-IN');

  async function write(path, input) {
    if (lock.current) return null;
    lock.current = true;
    setPending(true);
    setFeedback(null);
    try {
      const result = await postJson(path, input);
      if (result.status === 401 || (path === '/staff/logout' && result.ok)) {
        navigate('/login', { replace: true });
        return null;
      }
      if (!result.ok) setFeedback({ error: result.data.error ?? 'apiUnavailable' });
      return result.ok ? result.data : null;
    } catch {
      setFeedback({ error: 'apiUnavailable' });
      return null;
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  async function toggleJoining() {
    const saved = await write('/admin/online-joining', { open: !data.onlineJoiningOpen });
    if (saved) {
      setFeedback({ saved: true });
      retry();
    }
  }

  async function invite(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setLink(null);
    const saved = await write('/admin/staff-invitations', values);
    if (saved) setLink(new URL(saved.path, window.location.origin).href);
  }

  if (error === 'signInRequired') return <Navigate to="/login" replace />;

  return (
    <section className="panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl leading-tight font-semibold md:text-6xl">{labels.title}</h1>
        <button className="secondary-button" type="button" disabled={pending}
          onClick={() => write('/staff/logout')}>{copy.login.signOut}</button>
      </div>
      <p className="screen-description mt-4 max-w-xl text-lg">{labels.description}</p>
      {error && (
        <div className="join-notice mt-6" role="alert">
          <p>{copy[error]}</p>
          {error === 'apiUnavailable' && <button type="button" className="secondary-button" onClick={retry}>{copy.retry}</button>}
        </div>
      )}
      {!data && !error && <p className="field-hint mt-6" role="status">{copy.loading}</p>}
      {feedback && (
        <p className={feedback.error ? 'field-error' : 'reception-feedback mt-4'} role={feedback.error ? 'alert' : 'status'}>
          {feedback.error ? copy[feedback.error] ?? copy.apiUnavailable : labels.saved}
        </p>
      )}
      {data && (
        <div className="mt-6 grid max-w-3xl gap-4">
          <section className="join-section">
            <h2 className="text-xl font-semibold">{labels.today}</h2>
            <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
              <div><dt>{labels.served}</dt><dd className="text-lg font-semibold">{number.format(data.stats.served)}</dd></div>
              <div><dt>{labels.averageWait}</dt><dd className="text-lg font-semibold">{data.stats.averageWaitMinutes == null
                ? '—' : copy.minutes.replace('{minutes}', number.format(data.stats.averageWaitMinutes))}</dd></div>
              <div><dt>{labels.noShows}</dt><dd className="text-lg font-semibold">{number.format(data.stats.noShows)}</dd></div>
            </dl>
          </section>
          <section className="join-section">
            <h2 className="text-xl font-semibold">{labels.onlineJoining}</h2>
            <p className="my-3 screen-description">
              {data.closedReason ? copy[data.closedReason] : copy.home.joiningOpen}
              {data.closedReason && ` ${labels.walkInsAvailable}`}
            </p>
            <button className="primary-link" type="button" disabled={pending} onClick={toggleJoining}>
              {data.onlineJoiningOpen ? labels.closeJoining : labels.openJoining}
            </button>
          </section>
          <section className="join-section">
            <h2 className="text-xl font-semibold">{labels.invite}</h2>
            <form className="mt-4" onSubmit={invite}>
              <div className="join-contact">
                <div><label htmlFor="invite-name">{labels.name}</label>
                  <input id="invite-name" name="name" maxLength={80} required /></div>
                <div><label htmlFor="invite-email">{copy.login.email}</label>
                  <input id="invite-email" name="email" type="email" maxLength={254} required /></div>
                <div><label htmlFor="invite-role">{labels.role}</label>
                  <select id="invite-role" name="role" value={role} onChange={(event) => setRole(event.target.value)}>
                    <option value="receptionist">{labels.receptionist}</option>
                    <option value="barber">{copy.barber.link}</option>
                  </select></div>
                {role === 'barber' && (
                  <div><label htmlFor="invite-barber">{labels.barberProfile}</label>
                    <select id="invite-barber" name="barberSlug" required>
                      <option value="">{labels.chooseBarber}</option>
                      {data.barbers.map(({ slug, name }) => <option key={slug} value={slug}>{copy.barberNames[name] ?? name}</option>)}
                    </select></div>
                )}
              </div>
              <button type="submit" className="primary-link mt-4" disabled={pending}>{labels.createLink}</button>
            </form>
            {link && (
              <div className="mt-4" role="status">
                <p className="field-hint">{labels.shareLink}</p>
                <a className="break-all underline" href={link}>{link}</a>
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
