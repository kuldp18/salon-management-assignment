import { useEffect, useState } from 'react';

export const apiUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
const pollInterval = Number(import.meta.env.VITE_POLL_INTERVAL_MS) || 3000;

export function useLiveResource(path) {
  const [result, setResult] = useState({});
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let timer;
    const controller = new AbortController();

    async function refresh() {
      try {
        const response = await fetch(apiUrl + path, { signal: controller.signal });
        if (!response.ok) throw new Error(response.status === 404 ? 'statusMissing' : 'apiUnavailable');
        const data = await response.json();
        if (!controller.signal.aborted) setResult({ data });
      } catch (error) {
        if (!controller.signal.aborted) {
          const code = error.message === 'statusMissing' ? 'statusMissing' : 'apiUnavailable';
          setResult((previous) => ({ ...previous, error: code }));
          if (code === 'statusMissing') return;
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
