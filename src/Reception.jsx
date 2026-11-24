import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { postJson, useLiveResource } from './api.js';
import WalkInDialog from './WalkInDialog.jsx';

function BarberCard({ barber, copy, number, disabled, act }) {
  const labels = copy.reception;
  const { current } = barber;
  const status = barber.onBreak ? 'break' : current?.status ?? 'available';

  return (
    <article className="barber-card">
      <div className="barber-card-header">
        <h3>{copy.barberNames[barber.name] ?? barber.name}</h3>
        <span className="queue-badge" data-status={status}>{labels.states[status]}</span>
      </div>
      {current ? (
        <>
          <p className="barber-token"><span>{labels.token}</span> #{number.format(current.token)}</p>
          {current.status === 'in_chair' ? (
            <div className="service-progress">
              <label htmlFor={`service-${barber.slug}`}>
                {labels.remaining.replace('{minutes}', number.format(current.remainingMinutes))}
              </label>
              <progress id={`service-${barber.slug}`} max={current.durationMinutes}
                value={current.durationMinutes - current.remainingMinutes} />
            </div>
          ) : (
            <>
              <p className="field-hint">{labels.calledAgo.replace('{minutes}', number.format(current.calledMinutes))}</p>
              <button className="reception-danger" type="button" disabled={disabled || !current.canMarkNoShow}
                onClick={() => act(`/entries/${current.token}/no-show`, 'noShowSuccess')}>
                {labels.noShow}
              </button>
              {!current.canMarkNoShow && <p className="field-hint">{labels.noShowHint}</p>}
            </>
          )}
        </>
      ) : (
        <>
          <p className="field-hint">{labels.noCurrentToken}</p>
          <button className="primary-link" type="button" disabled={disabled || !barber.canCall}
            onClick={() => act(`/barbers/${encodeURIComponent(barber.slug)}/call-next`, 'callSuccess')}>
            {labels.callNext}
          </button>
        </>
      )}
    </article>
  );
}

export default function Reception({ copy, language }) {
  const { data, error, retry } = useLiveResource('/reception');
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const lock = useRef(false);
  const labels = copy.reception;
  const number = new Intl.NumberFormat(language === 'gu' ? 'gu-IN-u-nu-gujr' : 'en-IN');
  const minutes = (value) => copy.minutes.replace('{minutes}', number.format(value));
  const barberNames = new Map(data?.barbers.map(({ slug, name }) => [slug, copy.barberNames[name] ?? name]));

  async function request(path, body) {
    if (lock.current) return { ok: false, data: { error: 'apiUnavailable' } };
    lock.current = true;
    setBusy(true);
    setFeedback(null);
    try {
      const result = await postJson(path, body);
      if (result.status === 401) navigate('/login', { replace: true });
      return result;
    } catch {
      return { ok: false, data: { error: 'apiUnavailable' } };
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function act(path, success) {
    const result = await request(`/reception${path}`);
    setFeedback(result.ok
      ? { message: labels[success].replace('{token}', number.format(result.data.token)) }
      : { message: copy[result.data.error] ?? copy.apiUnavailable, error: true });
    retry();
  }

  async function addWalkIn(input) {
    const result = await request('/reception/walk-ins', input);
    if (result.ok) {
      setFeedback({ message: labels.walkInSuccess.replace('{token}', number.format(result.data.token)) });
      retry();
    }
    return result;
  }

  async function signOut() {
    const result = await request('/staff/logout');
    if (result.ok) navigate('/login', { replace: true });
    else setFeedback({ message: copy[result.data.error] ?? copy.apiUnavailable, error: true });
  }

  if (error === 'signInRequired') return <Navigate to="/login" replace />;

  return (
    <section className="reception">
      <div className="reception-header">
        <div>
          <h1>{labels.title}</h1>
          <p className="connection-state" role="status" data-online={Boolean(data && !error)}>
            {error ? copy[error] : data ? copy.apiConnected : copy.apiChecking}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="secondary-button" type="button" onClick={signOut} disabled={busy}>{copy.login.signOut}</button>
          <button className="primary-link" type="button" onClick={() => setWalkInOpen(true)}
            disabled={busy || !data || !data.services.length}>{labels.addWalkIn}</button>
        </div>
      </div>
      {error === 'apiUnavailable' && (
        <div className="join-notice">
          <p>{labels.reconnect}</p>
          <button type="button" className="secondary-button" onClick={retry}>{copy.retry}</button>
        </div>
      )}
      {feedback && <p className="reception-feedback" data-error={Boolean(feedback.error)}
        role={feedback.error ? 'alert' : 'status'}>{feedback.message}</p>}
      {data && (
        <>
          <dl className="reception-totals">
            <div><dt>{labels.states.waiting}</dt><dd>{number.format(data.totals.waiting)}</dd></div>
            <div><dt>{labels.states.called}</dt><dd>{number.format(data.totals.called)}</dd></div>
            <div><dt>{labels.states.in_chair}</dt><dd>{number.format(data.totals.inChair)}</dd></div>
          </dl>
          <section className="reception-section" aria-labelledby="reception-barbers">
            <h2 id="reception-barbers">{labels.barbers}</h2>
            {data.barbers.length ? (
              <div className="barber-cards">
                {data.barbers.map((barber) => <BarberCard key={barber.slug} barber={barber} copy={copy}
                  number={number} disabled={busy} act={act} />)}
              </div>
            ) : <p className="field-hint">{labels.emptyBarbers}</p>}
          </section>
          <section className="reception-section" aria-labelledby="waiting-heading">
            <h2 id="waiting-heading">{labels.waitingList}</h2>
            {data.waiting.length ? (
              <div className="queue-table-wrapper" tabIndex={0} role="region" aria-labelledby="waiting-heading">
                <table className="queue-table">
                  <thead>
                    <tr>
                      {[labels.token, labels.customer, copy.join.services, copy.join.barber, labels.waitSoFar, labels.actions]
                        .map((label) => <th key={label} scope="col">{label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {data.waiting.map((entry) => (
                      <tr key={entry.token}>
                        <th scope="row" className="queue-token">#{number.format(entry.token)}</th>
                        <td className="queue-customer">{entry.name}</td>
                        <td>{entry.services.map((name) => name[language] ?? name.en).join(', ')}</td>
                        <td>{entry.barberPreference
                          ? barberNames.get(entry.barberPreference) ?? entry.barberPreference
                          : copy.join.anyBarber}</td>
                        <td><span className={entry.waitMinutes > 60 ? 'queue-badge long-wait' : ''}>
                          {minutes(entry.waitMinutes)}{entry.waitMinutes > 60 ? ` · ${labels.longWait}` : ''}
                        </span></td>
                        <td>
                          <button className="reception-danger" type="button" disabled={busy}
                            aria-label={labels.cancelToken.replace('{token}', number.format(entry.token))}
                            onClick={() => {
                              if (window.confirm(labels.confirmCancel.replace('{token}', number.format(entry.token)))) {
                                act(`/entries/${entry.token}/cancel`, 'cancelSuccess');
                              }
                            }}>{labels.cancel}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="queue-empty">{labels.emptyWaiting}</p>}
          </section>
          {walkInOpen && <WalkInDialog data={data} copy={copy} language={language} busy={busy}
            onSubmit={addWalkIn} onClose={() => setWalkInOpen(false)} />}
        </>
      )}
    </section>
  );
}
