import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { validateJoin } from '../shared/join-validation.js';
import { apiUrl, useLiveResource } from './api.js';

export function formatWait(wait, copy, number) {
  if (wait?.minutes == null) {
    return wait?.reason ? `${copy.waitUnavailable} · ${copy[wait.reason]}` : copy.waitUnavailable;
  }
  return copy.about.replace('{minutes}', number.format(wait.minutes));
}

function FormError({ id, error, copy }) {
  return error && <p className="field-error" id={id} role="alert">{copy[error]}</p>;
}

export default function JoinQueue({ copy, language }) {
  const navigate = useNavigate();
  const { data, error, retry } = useLiveResource('/join');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [services, setServices] = useState([]);
  const [barber, setBarber] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const form = useRef(null);
  const labels = copy.join;
  const locale = language === 'gu' ? 'gu-IN-u-nu-gujr' : 'en-IN';
  const number = new Intl.NumberFormat(locale);
  const currency = new Intl.NumberFormat(locale, {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
  const selected = data?.services.filter((service) => services.includes(service.slug)) ?? [];
  const duration = selected.reduce((total, service) => total + service.durationMinutes, 0);
  const price = selected.reduce((total, service) => total + service.price, 0);
  const selectedBarber = data?.barbers.find((person) => person.slug === barber);
  const wait = barber ? selectedBarber?.wait : data?.anyBarber;
  const servicesChanged = selected.length !== services.length;
  const serviceError = errors.services ?? (servicesChanged ? 'servicesUnavailable' : undefined);
  const barberError = errors.barber ?? (barber && !selectedBarber ? 'barberUnavailable' : undefined);

  function clearError(field) {
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setSubmitError('');
  }

  function toggleService(slug) {
    if (services.includes(slug)) {
      setServices(selected.filter((service) => service.slug !== slug).map((service) => service.slug));
    } else if (selected.length >= 3) {
      setErrors((previous) => ({ ...previous, services: 'servicesLimit' }));
      return;
    } else {
      setServices([...selected.map((service) => service.slug), slug]);
    }
    clearError('services');
  }

  function focusFirstError(nextErrors) {
    const field = ['name', 'phone', 'services', 'barber'].find((key) => nextErrors[key]);
    if (field) requestAnimationFrame(() => form.current?.querySelector(`[name="${field}"]`)?.focus());
  }

  async function confirm(event) {
    event.preventDefault();
    if (pending.current) return;
    const input = { name, phone, services: selected.map((service) => service.slug), barber };
    const invalid = validateJoin(input);
    if (servicesChanged) invalid.services = 'servicesUnavailable';
    if (barber && !selectedBarber) invalid.barber = 'barberUnavailable';
    setErrors(invalid);
    setSubmitError('');
    if (Object.keys(invalid).length) {
      focusFirstError(invalid);
      return;
    }

    pending.current = true;
    setBusy(true);
    try {
      const response = await fetch(`${apiUrl}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const result = await response.json();
      if (response.ok && result.statusId) {
        navigate(`/status/${result.statusId}`, { replace: true });
      } else if (result.errors) {
        setErrors(result.errors);
        focusFirstError(result.errors);
        retry();
      } else {
        setSubmitError(copy[result.error] ? result.error : 'apiUnavailable');
        retry();
      }
    } catch {
      setSubmitError('apiUnavailable');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="join-shell">
      <div className="join-heading">
        <h1>{labels.title}</h1>
        <p>{labels.description}</p>
      </div>
      {error && (
        <div className="join-notice" role="alert">
          <p>{copy[error]}</p>
          <button className="secondary-button" type="button" onClick={retry}>{copy.retry}</button>
        </div>
      )}
      {!data && !error && <p className="join-notice" role="status">{copy.loading}</p>}
      {data?.closedReason && <p className="join-notice" role="status">{copy[data.closedReason]}</p>}
      {data && !data.services.length && <p className="join-notice" role="status">{labels.emptyServices}</p>}
      {data?.services.length > 0 && (
        <form className="join-form" ref={form} onSubmit={confirm} noValidate>
          <div className="join-fields">
            <fieldset className="join-section" disabled={busy}>
              <legend>{labels.details}</legend>
              <div className="join-contact">
                <div>
                  <label htmlFor="join-name">{labels.name}</label>
                  <input id="join-name" name="name" value={name} autoComplete="name"
                    required maxLength={80} aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? 'name-error' : undefined}
                    onChange={(event) => { setName(event.target.value); clearError('name'); }} />
                  <FormError id="name-error" error={errors.name} copy={copy} />
                </div>
                <div>
                  <label htmlFor="join-phone">{labels.phone}</label>
                  <input id="join-phone" name="phone" type="tel" value={phone} inputMode="tel"
                    autoComplete="tel" required maxLength={24} aria-invalid={Boolean(errors.phone)}
                    aria-describedby={errors.phone ? 'phone-hint phone-error' : 'phone-hint'}
                    onChange={(event) => { setPhone(event.target.value); clearError('phone'); }} />
                  <p className="field-hint" id="phone-hint">{labels.phoneHint}</p>
                  <FormError id="phone-error" error={errors.phone} copy={copy} />
                </div>
              </div>
            </fieldset>

            <fieldset className="join-section" disabled={busy}
              aria-describedby={serviceError ? 'service-hint services-error' : 'service-hint'}>
              <legend>{labels.services}</legend>
              <p className="field-hint" id="service-hint">{labels.serviceHint}</p>
              <div className="choices">
                {data.services.map((service) => (
                  <label className="choice" key={service.slug}>
                    <input type="checkbox" name="services" value={service.slug}
                      checked={services.includes(service.slug)} onChange={() => toggleService(service.slug)} />
                    <span className="choice-main">
                      <strong>{service.name[language] ?? service.name.en}</strong>
                      <span>{copy.minutes.replace('{minutes}', number.format(service.durationMinutes))}</span>
                    </span>
                    <span className="choice-price">{currency.format(service.price)}</span>
                  </label>
                ))}
              </div>
              <FormError id="services-error" error={serviceError} copy={copy} />
            </fieldset>

            <fieldset className="join-section" disabled={busy}
              aria-describedby={barberError ? 'barber-error' : undefined}>
              <legend>{labels.barber}</legend>
              <div className="choices barber-choices">
                {[{ slug: null, name: labels.anyBarber }, ...data.barbers].map((person) => (
                  <label className="choice" key={person.slug ?? 'any'}>
                    <input type="radio" name="barber" value={person.slug ?? ''} checked={barber === person.slug}
                      onChange={() => { setBarber(person.slug); clearError('barber'); }} />
                    <span className="choice-main">
                      <strong>{copy.barberNames[person.name] ?? person.name}</strong>
                      {!person.slug && <span>{labels.firstAvailable}</span>}
                      {person.onBreak && <span className="break-label">{labels.onBreak}</span>}
                    </span>
                  </label>
                ))}
              </div>
              <FormError id="barber-error" error={barberError} copy={copy} />
            </fieldset>
          </div>

          <div className="join-summary">
            <dl className="summary-values" aria-live="polite" aria-atomic="true">
              <div><dt>{labels.duration}</dt><dd>{copy.minutes.replace('{minutes}', number.format(duration))}</dd></div>
              <div><dt>{labels.price}</dt><dd>{currency.format(price)}</dd></div>
              <div><dt>{labels.wait}</dt><dd>{error ? copy.waitUnavailable : formatWait(wait, copy, number)}</dd></div>
            </dl>
            <FormError id="submit-error" error={submitError} copy={copy} />
            <button className="primary-link confirm-button" type="submit"
              disabled={busy || Boolean(data.closedReason)}>{busy ? labels.confirming : labels.confirm}</button>
          </div>
        </form>
      )}
    </section>
  );
}
