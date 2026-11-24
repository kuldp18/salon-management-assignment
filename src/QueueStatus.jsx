import { Link, useParams } from 'react-router';
import { useLiveResource } from './api.js';
import { formatWait } from './JoinQueue.jsx';

function StatusDetails({ id, copy, language }) {
  const { data, error, retry } = useLiveResource(`/status/${encodeURIComponent(id)}`);
  const number = new Intl.NumberFormat(language === 'gu' ? 'gu-IN-u-nu-gujr' : 'en-IN');

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
          {data.barberName && <p>{copy.status.assignedBarber
            .replace('{barber}', copy.barberNames[data.barberName] ?? data.barberName)}</p>}
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
