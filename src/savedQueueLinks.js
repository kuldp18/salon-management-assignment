const storageKey = 'salon-saved-queue-links';
const privateId = /^[a-f0-9]{48}$/;

function readLinks() {
  const value = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
  if (!Array.isArray(value)) return [];
  return value.filter((entry) => entry && typeof entry.id === 'string' &&
    privateId.test(entry.id) && Number.isSafeInteger(entry.token) && entry.token > 0)
    .map(({ id, token }) => ({ id, token }));
}

export function loadSavedLinks() {
  try {
    return readLinks();
  } catch {
    return [];
  }
}

export function setSavedLink(id, token, save) {
  let existing;
  try {
    existing = readLinks();
  } catch {
    existing = [];
  }
  const remaining = existing.filter((entry) => entry.id !== id);
  const links = save ? [{ id, token }, ...remaining] : remaining;
  localStorage.setItem(storageKey, JSON.stringify(links));
  return links;
}

export function isSavedLinksEvent(event) {
  return event.key === storageKey || event.key === null;
}
