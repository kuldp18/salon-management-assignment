import { useState } from 'react';
import { Link } from 'react-router';

export default function SavedQueueLinks({ links, onRemove, copy, language }) {
  const [feedback, setFeedback] = useState(null);
  const labels = copy.savedLinks;
  const number = new Intl.NumberFormat(language === 'gu' ? 'gu-IN-u-nu-gujr' : 'en-IN');

  return (
    <section className="panel">
      <h1 className="text-3xl font-semibold">{labels.title}</h1>
      <p className="screen-description mt-3">{labels.localOnly}</p>
      {links.length ? (
        <ul className="mt-4 grid max-w-xl gap-2">
          {links.map(({ id, token }) => (
            <li key={id} className="join-section flex flex-wrap items-center justify-between gap-2">
              <Link className="primary-link" to={`/status/${id}`}>
                {labels.openToken.replace('{token}', number.format(token))}
              </Link>
              <button className="reception-danger" type="button"
                aria-label={labels.removeToken.replace('{token}', number.format(token))}
                onClick={() => setFeedback(onRemove(id) ? 'removed' : 'unavailable')}>{labels.remove}</button>
            </li>
          ))}
        </ul>
      ) : <p className="mt-4">{labels.empty}</p>}
      {feedback && <p className="field-hint mt-3" role="status">{labels[feedback]}</p>}
      <Link className="secondary-button mt-6 inline-flex items-center" to="/join">{copy.join.link}</Link>
    </section>
  );
}
