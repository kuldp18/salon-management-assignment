import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { postJson, useLiveResource } from './api.js';

function ServiceTimer({ startedAt, locale, label }) {
  const [time, setTime] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const elapsed = Math.max(0, Math.floor((time - Date.parse(startedAt)) / 1000));
  const minutes = new Intl.NumberFormat(locale).format(Math.floor(elapsed / 60));
  const seconds = new Intl.NumberFormat(locale, { minimumIntegerDigits: 2 }).format(elapsed % 60);

  return (
    <div className="rounded-xl bg-[var(--surface-soft)] px-4 py-3">
      <p className="field-hint">{label}</p>
      <p className="text-3xl font-semibold tabular-nums" role="timer" aria-label={label}>
        {minutes}:{seconds}
      </p>
    </div>
  );
}

function BarberDashboard({ slug, copy, language }) {
  const navigate = useNavigate();
  const path = `/barber/${encodeURIComponent(slug)}`;
  const { data, error, retry } = useLiveResource(path);
  const [busy, setBusy] = useState(false);
  const [writeError, setWriteError] = useState(null);
  const lock = useRef(false);
  const labels = copy.barber;
  const locale = language === 'gu' ? 'gu-IN-u-nu-gujr' : 'en-IN';
  const number = new Intl.NumberFormat(locale);
  const { current, next } = data ?? {};
  const serviceNames = (entry) => entry.services.map(({ name }) => name[language] ?? name.en).join(', ');

  async function write(url, body) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setWriteError(null);
    try {
      const result = await postJson(url, body);
      if (result.status === 401 || (result.ok && url === '/staff/logout')) {
        navigate('/login', { replace: true });
        return;
      }
      if (!result.ok) setWriteError(result.data.error ?? 'apiUnavailable');
      if (result.ok || result.status === 409 || result.status === 403) retry();
    } catch {
      setWriteError('apiUnavailable');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  if (error === 'signInRequired') return <Navigate to="/login" replace />;

  const action = current?.status === 'called' ? 'start' : 'done';
  return (
    <section className="panel mx-auto max-w-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">{data ? copy.barberNames[data.name] ?? data.name : labels.title}</h1>
        <button className="secondary-button" type="button" disabled={busy}
          onClick={() => write('/staff/logout')}>{copy.login.signOut}</button>
      </div>
      {error && (
        <div className="join-notice mt-4" role="alert">
          <p>{copy[error]}</p>
          {error === 'apiUnavailable' && <button className="secondary-button" type="button" onClick={retry}>{copy.retry}</button>}
        </div>
      )}
      {!data && !error && <p className="field-hint mt-4" role="status">{copy.loading}</p>}
      {writeError && <p className="field-error" role="alert">{copy[writeError] ?? copy.apiUnavailable}</p>}
      {data && (
        <>
          <div className="my-5 flex flex-wrap items-center justify-between gap-3">
            <p className="queue-badge" role="status" data-status={data.onBreak ? 'break' : 'available'}>
              {!data.onDuty ? labels.offDuty : copy.reception.states[data.onBreak ? 'break' : 'available']}
            </p>
            <button className="secondary-button" type="button" disabled={busy || !data.onDuty}
              onClick={() => write(`${path}/break`, { onBreak: !data.onBreak })}>
              {data.onBreak ? labels.endBreak : labels.takeBreak}
            </button>
          </div>
          <div className="join-section grid gap-3">
            <h2 className="text-lg font-semibold">{labels.current}</h2>
            {current ? (
              <>
                <p className="text-3xl font-semibold tabular-nums">#{number.format(current.token)} · {current.name}</p>
                <p className="screen-description">{serviceNames(current)}</p>
                {current.status === 'in_chair' && current.startedAt && (
                  <ServiceTimer key={current.startedAt} startedAt={current.startedAt} locale={locale} label={labels.elapsed} />
                )}
                <button className="primary-link justify-center text-lg" type="button" disabled={busy}
                  onClick={() => write(`${path}/entries/${current.token}/${action}`)}>
                  {labels[action]}
                </button>
              </>
            ) : <p className="screen-description" role="status">{labels.idle}</p>}
          </div>
          <div className="join-section mt-4">
            <h2 className="text-lg font-semibold">{labels.next}</h2>
            <p className="screen-description mt-2">
              {next ? `#${number.format(next.token)} · ${serviceNames(next)}` : labels.noNext}
            </p>
          </div>
        </>
      )}
    </section>
  );
}

export default function BarberView(props) {
  const { name } = useParams();
  return name ? <BarberDashboard key={name} slug={name} {...props} /> : <BarberHome copy={props.copy} />;
}

function BarberHome({ copy }) {
  const { data, error, retry } = useLiveResource('/barber');
  if (data?.slug) return <Navigate to={`/barber/${encodeURIComponent(data.slug)}`} replace />;
  if (error === 'signInRequired') return <Navigate to="/login" replace />;

  return (
    <section className="panel mx-auto max-w-xl">
      <h1 className="text-3xl font-semibold">{copy.barber.title}</h1>
      <p className="mt-4" role="status">{error ? copy[error] : copy.loading}</p>
      {error === 'apiUnavailable' && <button className="secondary-button mt-4" type="button" onClick={retry}>{copy.retry}</button>}
      {error === 'accessDenied' && <Link className="primary-link mt-4" to="/login">{copy.login.switchAccount}</Link>}
    </section>
  );
}
