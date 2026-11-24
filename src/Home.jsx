import { Link } from 'react-router';
import { useLiveResource } from './api.js';
import { formatWait } from './JoinQueue.jsx';

export default function Home({ copy, language }) {
  const { data, error, retry } = useLiveResource('/home');
  const labels = copy.home;
  const locale = language === 'gu' ? 'gu-IN-u-nu-gujr' : 'en-IN';
  const number = new Intl.NumberFormat(locale);
  const time = data?.closingTime && new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC', hour: 'numeric', minute: '2-digit',
  }).format(new Date(`1970-01-01T${data.closingTime}:00Z`));

  return (
    <section className="panel">
      <h1 className="text-4xl leading-tight font-semibold md:text-6xl">{labels.title}</h1>
      <p className="screen-description mt-4 max-w-xl text-lg">{labels.description}</p>
      {error && (
        <div className="join-notice mt-6" role="alert">
          <p>{copy[error]}</p>
          <button type="button" className="secondary-button" onClick={retry}>{copy.retry}</button>
        </div>
      )}
      {!data && !error && <p className="field-hint mt-6" role="status">{copy.loading}</p>}
      {data && (
        <>
          <div className="mt-6 flex flex-wrap items-baseline gap-3">
            <span className="queue-badge" data-status={data.closedReason ? 'break' : 'available'}>
              {data.closedReason ? copy[data.closedReason] : labels.joiningOpen}
            </span>
            {time && <p className="field-hint">{labels.closesAt.replace('{time}', time)}</p>}
          </div>
          <div className="join-section mt-6 max-w-2xl">
            <h2 className="text-xl font-semibold">{labels.queue}</h2>
            <p className="mt-2">{data.waitingCount
              ? labels.waitingCount.replace('{count}', number.format(data.waitingCount))
              : labels.empty}</p>
            <p className="field-hint">{copy.join.wait} · {formatWait(data.anyBarber, copy, number)}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {data.barbers.map(({ name, status }, index) => (
                <li key={`${name}-${index}`} className="queue-badge" data-status={status}>
                  {copy.barberNames[name] ?? name} · {copy.display.states[status]}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
      {data && !data.closedReason && !error
        ? <Link className="primary-link mt-8" to="/join">{copy.join.link}</Link>
        : <button className="primary-link mt-8" type="button" disabled>{copy.join.link}</button>}
    </section>
  );
}
