import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router';
import { useLiveResource } from './api.js';
import { formatWait } from './JoinQueue.jsx';

function CalledStatus({ data, copy, number, error, retry }) {
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
          <p>{copy[error]}</p>
          <button type="button" onClick={retry}>{copy.retry}</button>
        </div>
      )}
      <Link className="called-status-home" to="/">{copy.backHome}</Link>
    </section>
  );
}

function StatusDetails({ id, copy, language }) {
  const { data, error, retry } = useLiveResource(`/status/${encodeURIComponent(id)}`);
  const number = new Intl.NumberFormat(language === 'gu' ? 'gu-IN-u-nu-gujr' : 'en-IN');

  if (data?.status === 'called') {
    return <CalledStatus key={data.token} data={data} copy={copy} number={number} error={error} retry={retry} />;
  }

  return (
    <section className="panel">
      <h1 className="text-4xl font-semibold">{copy.status.title}</h1>
      {error && (
        <div className="join-notice mt-4" role="alert">
          <p>{copy[error]}</p>
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
            <p>{copy.status[data.barberPreference ? 'barberPosition' : 'position']
              .replace('{position}', number.format(data.position))}</p>
          )}
          {data.wait && <p>{copy.join.wait} · {formatWait(data.wait, copy, number)}</p>}
          <p className="field-hint mt-4">{copy.status.keepLink}</p>
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
