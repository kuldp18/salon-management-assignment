import { useEffect, useState } from 'react';

export const apiUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
const pollInterval = Number(import.meta.env.VITE_POLL_INTERVAL_MS) || 3000;
const accessErrors = { 401: 'signInRequired', 403: 'accessDenied' };

export async function postJson(path, body) {
  const response = await fetch(apiUrl + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = response.status === 204 ? {} : await response.json();
  return { ok: response.ok, status: response.status, data };
}

export function useLiveResource(path) {
  const [result, setResult] = useState({});
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let timer;
    const controller = new AbortController();

    async function refresh() {
      try {
        const response = await fetch(apiUrl + path, { signal: controller.signal });
        if (!response.ok) {
          const code = accessErrors[response.status] ?? (response.status === 404 &&
            (path.startsWith('/barber/') ? 'barberUnavailable' : 'statusMissing'));
          if (code) {
            if (!controller.signal.aborted) setResult({ error: code });
            return;
          }
          throw new Error('apiUnavailable');
        }
        const data = await response.json();
        if (!controller.signal.aborted) setResult({ data, lastUpdatedAt: Date.now() });
      } catch {
        if (!controller.signal.aborted) {
          setResult((previous) => ({ ...previous, error: 'apiUnavailable' }));
        }
      }
      if (!controller.signal.aborted) timer = setTimeout(refresh, pollInterval);
    }

    refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [path, attempt]);

  return { ...result, retry: () => setAttempt((previous) => previous + 1) };
}
