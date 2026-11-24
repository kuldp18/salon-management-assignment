import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { postJson, useLiveResource } from './api.js';
import { formatWait } from './JoinQueue.jsx';

function CalledStatus({ data, copy, number, error, lastUpdate, retry }) {
  const heading = useRef(null);
  const attempted = useRef(false);
  const { token, barberName } = data;

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (typeof navigator.vibrate !== 'function') return;

    const key = `salon-call-vibration:${token}`;

    function vibrateOnce() {
      if (attempted.current || document.visibilityState !== 'visible' ||
          navigator.userActivation?.hasBeenActive === false) return;

      attempted.current = true;
      try {
        if (localStorage.getItem(key)) return;
        localStorage.setItem(key, '1');
      } catch {
        // The in-memory guard still works when storage is unavailable.
      }
      navigator.vibrate(160);
    }

    document.addEventListener('visibilitychange', vibrateOnce);
    document.addEventListener('click', vibrateOnce, true);
    document.addEventListener('keydown', vibrateOnce, true);
    vibrateOnce();

    return () => {
      document.removeEventListener('visibilitychange', vibrateOnce);
      document.removeEventListener('click', vibrateOnce, true);
      document.removeEventListener('keydown', vibrateOnce, true);
    };
  }, [token]);

  return (
    <section className="called-status" aria-labelledby="called-heading">
      <h1 id="called-heading" ref={heading} tabIndex={-1}
        aria-describedby={barberName ? 'called-token called-barber' : 'called-token'}>
        {copy.status.states.called}
      </h1>
      <p className="called-status-token" id="called-token">
        <span>{copy.status.token}</span>
        <strong>{number.format(token)}</strong>
      </p>
      {barberName && (
        <p className="called-status-barber" id="called-barber">
          {copy.status.assignedBarber.replace('{barber}', copy.barberNames[barberName] ?? barberName)}
        </p>
      )}
      {error && (
        <div className="called-status-error" role="alert">
          <p>{lastUpdate ? copy.reconnecting : copy[error]}</p>
          {lastUpdate && <p>{lastUpdate}</p>}
          <button type="button" onClick={retry}>{copy.retry}</button>
        </div>
      )}
      <Link className="called-status-home" to="/">{copy.backHome}</Link>
    </section>
  );
}

function StatusDetails({ id, copy, language }) {
  const path = `/status/${encodeURIComponent(id)}`;
  const { data, error, lastUpdatedAt, retry } = useLiveResource(path);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const locale = language === 'gu' ? 'gu-IN-u-nu-gujr' : 'en-IN';
  const number = new Intl.NumberFormat(locale);
  const lastUpdate = error === 'apiUnavailable' && lastUpdatedAt
    ? copy.status.lastUpdate.replace('{time}', new Intl.DateTimeFormat(locale, { timeStyle: 'medium' }).format(lastUpdatedAt))
    : null;

  async function cancel() {
    if (cancelling || !window.confirm(copy.status.confirmCancel)) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const result = await postJson(`${path}/cancel`);
      if (!result.ok) setCancelError(result.data.error ?? 'apiUnavailable');
      if (result.ok || result.status === 409) retry();
    } catch {
      setCancelError('apiUnavailable');
    } finally {
      setCancelling(false);
    }
  }

  if (data?.status === 'called') {
    return <CalledStatus key={data.token} data={data} copy={copy} number={number} error={error}
      lastUpdate={lastUpdate} retry={retry} />;
  }

  return (
    <section className="panel">
      <h1 className="text-4xl font-semibold">{copy.status.title}</h1>
      {error && (
        <div className="join-notice mt-4" role="alert">
          <div>
            <p>{lastUpdate ? copy.reconnecting : copy[error]}</p>
            {lastUpdate && <p className="field-hint">{lastUpdate}</p>}
          </div>
          {error !== 'statusMissing' && <button type="button" className="secondary-button" onClick={retry}>{copy.retry}</button>}
        </div>
      )}
      {!data && !error && <p className="mt-4" role="status">{copy.loading}</p>}
      {data && (
        <div className="mt-5" aria-live="polite">
          <p className="field-hint">{copy.status.token}</p>
          <p className="text-5xl font-semibold tabular-nums">{number.format(data.token)}</p>
          <p className="mt-4 font-semibold">{copy.status.states[data.status]}</p>
          {data.position != null && (
            <div className="mt-3 flex items-center gap-3">
              <span className="status-progress" aria-hidden="true" style={{ '--status-arc': `${100 / data.position}%` }} />
              <div>
                <p>{copy.status[data.barberPreference ? 'barberPosition' : 'position']
                  .replace('{position}', number.format(data.position))}</p>
                {data.wait && <p>{copy.join.wait} · {formatWait(data.wait, copy, number)}</p>}
              </div>
            </div>
          )}
          {!error && data.position <= 2 && data.position > 0 && data.wait?.minutes != null && (
            <p className="queue-badge mt-3" data-status="available">
              {data.position === 1 ? copy.status.yourNext : copy.status.startComing}
            </p>
          )}
          <p className="field-hint mt-4">{copy.status.keepLink}</p>
        </div>
      )}
      {data?.status === 'waiting' && (
        <div className="mt-6">
          {cancelError && <p className="field-error" role="alert">{copy[cancelError] ?? copy.apiUnavailable}</p>}
          <button className="reception-danger" type="button" disabled={cancelling} onClick={cancel}>
            {copy.status.cancelSpot}
          </button>
        </div>
      )}
      <Link className="primary-link mt-8" to="/">{copy.backHome}</Link>
    </section>
  );
}

export default function QueueStatus(props) {
  const { id } = useParams();
  return <StatusDetails key={id} id={id} {...props} />;
}
