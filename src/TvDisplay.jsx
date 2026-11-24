import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useLiveResource } from './api.js';

function playBuzzer(audio) {
  const start = audio.currentTime;
  const tone = audio.createOscillator();
  const volume = audio.createGain();

  tone.frequency.value = 520;
  volume.gain.setValueAtTime(0.001, start);
  volume.gain.exponentialRampToValueAtTime(0.025, start + 0.03);
  volume.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
  tone.connect(volume);
  volume.connect(audio.destination);
  tone.start(start);
  tone.stop(start + 0.17);
}

export default function TvDisplay({ copy, language, preferences }) {
  const { data, error, retry } = useLiveResource('/display');
  const [highlights, setHighlights] = useState([]);
  const [sound, setSound] = useState(false);
  const [soundError, setSoundError] = useState(false);
  const previous = useRef(null);
  const timer = useRef(null);
  const audio = useRef(null);
  const labels = copy.display;
  const numbers = new Intl.NumberFormat(language === 'gu' ? 'gu-IN-u-nu-gujr' : 'en-IN');
  const tokenNumbers = new Intl.NumberFormat(language === 'gu' ? 'gu-IN-u-nu-gujr' : 'en-IN', {
    minimumIntegerDigits: 3, useGrouping: false,
  });

  useEffect(() => {
    if (!data) return;
    const called = data.barbers.filter(({ status }) => status === 'called').map(({ token }) => token);
    const newCalls = previous.current && called.filter((token) => !previous.current.includes(token));
    previous.current = called;
    if (!newCalls?.length) return;

    setHighlights(newCalls);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setHighlights([]), 6000);
    if (sound && audio.current?.state === 'running') playBuzzer(audio.current);
  }, [data, sound]);

  useEffect(() => () => {
    clearTimeout(timer.current);
    if (audio.current) audio.current.close().catch(() => {});
  }, []);

  async function toggleSound() {
    if (sound) {
      setSound(false);
      return;
    }
    try {
      audio.current ??= new AudioContext();
      await audio.current.resume();
      setSound(true);
      setSoundError(false);
    } catch {
      setSoundError(true);
    }
  }

  return (
    <div className="tv-display">
      <header className="tv-heading">
        <div className="tv-heading-title">
          <Link to="/">{copy.brand}</Link>
          <h1>{labels.title}</h1>
        </div>
        <div className="tv-heading-controls">
          <div className="tv-preferences">{preferences}</div>
          {typeof AudioContext === 'function' && (
            <button className="tv-control" type="button" onClick={toggleSound} aria-pressed={sound} aria-label={labels.buzzer}>
              {sound ? labels.buzzerOn : labels.enableBuzzer}
            </button>
          )}
        </div>
      </header>
      {soundError && <p className="tv-notice" role="alert">{labels.soundError}</p>}
      {error && (
        <div className="tv-notice" role="alert">
          <p>{data ? labels.stale : copy.apiUnavailable}</p>
          <button className="tv-control" type="button" onClick={retry}>{copy.retry}</button>
        </div>
      )}
      {!data && !error && <p className="tv-notice" role="status">{copy.loading}</p>}
      {data && (
        <div className="tv-layout">
          <section aria-labelledby="tv-chairs-heading">
            <h2 id="tv-chairs-heading">{labels.chairs}</h2>
            {data.barbers.length ? (
              <ul className="tv-chairs">
                {data.barbers.map(({ name, status, token }, index) => (
                  <li className="tv-chair" key={`${name}-${index}`} data-status={status} data-highlight={highlights.includes(token)}>
                    <div>
                      <p className="tv-barber">{copy.barberNames[name] ?? name}</p>
                      <p className="tv-chair-status" data-status={status}>{labels.states[status]}</p>
                    </div>
                    <p className="tv-chair-token">
                      {token === null ? <span aria-label={labels.noToken}>—</span> : tokenNumbers.format(token)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : <p className="tv-empty">{labels.noBarbers}</p>}
          </section>
          <section aria-labelledby="tv-next-heading">
            <h2 id="tv-next-heading">{labels.next}</h2>
            {data.next.length ? (
              <ol className="tv-waiting">
                {data.next.map(({ token, waitMinutes }) => (
                  <li key={token}>
                    <strong>{tokenNumbers.format(token)}</strong>
                    <span>{waitMinutes === null ? copy.waitUnavailable
                      : copy.about.replace('{minutes}', numbers.format(waitMinutes))}</span>
                  </li>
                ))}
              </ol>
            ) : <p className="tv-empty">{labels.empty}</p>}
          </section>
        </div>
      )}
      <p className="sr-only" role="status">
        {highlights.length ? labels.newCall.replace('{tokens}', highlights.map((token) => tokenNumbers.format(token)).join(', ')) : ''}
      </p>
    </div>
  );
}
