import { useEffect, useRef, useState } from 'react';
import { validateJoin } from '../shared/join-validation.js';

export default function WalkInDialog({ data, copy, language, onClose, onSubmit, busy }) {
  const dialog = useRef(null);
  const [errors, setErrors] = useState({});
  const labels = copy.reception;

  useEffect(() => {
    dialog.current.showModal();
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const values = new FormData(event.currentTarget);
    const input = {
      name: values.get('name'), phone: values.get('phone'),
      services: values.getAll('services'), barber: values.get('barber') || null,
    };
    const invalid = validateJoin(input);
    setErrors(invalid);
    if (Object.keys(invalid).length) return;

    const result = await onSubmit(input);
    if (result.ok) dialog.current?.close();
    else setErrors(result.data.errors ?? { form: result.data.error ?? 'apiUnavailable' });
  }

  const error = (field) => errors[field] &&
    <p className="field-error" id={`walkin-error-${field}`} role="alert">{copy[errors[field]]}</p>;

  return (
    <dialog className="walk-in-dialog" ref={dialog} onClose={onClose}
      aria-labelledby="walk-in-title" onCancel={(event) => { if (busy) event.preventDefault(); }}>
      <h2 id="walk-in-title" className="text-2xl font-semibold">{labels.addWalkIn}</h2>
      <form onSubmit={submit} noValidate className="mt-4 grid gap-4">
        <div className="join-contact">
          <div>
            <label htmlFor="walk-in-name">{copy.join.name}</label>
            <input id="walk-in-name" name="name" maxLength={80} required
              aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'walkin-error-name' : undefined} />
            {error('name')}
          </div>
          <div>
            <label htmlFor="walk-in-phone">{copy.join.phone}</label>
            <input id="walk-in-phone" name="phone" type="tel" maxLength={24} required
              aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'walkin-error-phone' : undefined} />
            {error('phone')}
          </div>
        </div>
        <fieldset className="join-section" aria-describedby={errors.services ? 'walkin-error-services' : undefined}>
          <legend>{copy.join.services}</legend>
          <p className="field-hint">{copy.join.serviceHint}</p>
          <div className="choices">
            {data.services.map(({ slug, name }) => (
              <label className="choice" key={slug}>
                <input type="checkbox" name="services" value={slug} />
                <span>{name[language] ?? name.en}</span>
              </label>
            ))}
          </div>
          {error('services')}
        </fieldset>
        <div className="join-contact !grid-cols-1">
          <div>
            <label htmlFor="walk-in-barber">{copy.join.barber}</label>
            <select id="walk-in-barber" name="barber"
              aria-invalid={Boolean(errors.barber)} aria-describedby={errors.barber ? 'walkin-error-barber' : undefined}>
              <option value="">{copy.join.anyBarber}</option>
              {data.barbers.map(({ slug, name, onBreak }) => (
                <option key={slug} value={slug}>
                  {copy.barberNames[name] ?? name}{onBreak ? ` · ${copy.join.onBreak}` : ''}
                </option>
              ))}
            </select>
            {error('barber')}
          </div>
        </div>
        {error('form')}
        <div className="flex flex-wrap justify-end gap-2">
          <button className="secondary-button" type="button" disabled={busy}
            onClick={() => dialog.current.close()}>{labels.close}</button>
          <button className="primary-link" type="submit" disabled={busy}>
            {busy ? labels.saving : labels.addWalkIn}
          </button>
        </div>
      </form>
    </dialog>
  );
}
