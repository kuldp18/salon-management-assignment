export function normalizePhone(value) {
  if (typeof value !== 'string') return '';

  return value.trim()
    .replace(/[૦-૯]/g, (digit) => String(digit.charCodeAt(0) - 0x0ae6))
    .replace(/[\s().-]/g, '')
    .replace(/^\+91(?=\d{10}$)/, '');
}

export function validateJoin(input) {
  const { name, phone, services } = input ?? {};
  const errors = {};

  if (typeof name !== 'string' || !name.trim() || name.trim().length > 80) {
    errors.name = 'nameInvalid';
  }
  if (!/^\d{10}$/.test(normalizePhone(phone))) errors.phone = 'phoneInvalid';
  if (!Array.isArray(services) || services.length < 1 || services.length > 3 ||
      new Set(services).size !== services.length ||
      services.some((slug) => typeof slug !== 'string' || !slug)) {
    errors.services = 'servicesLimit';
  }

  return errors;
}
