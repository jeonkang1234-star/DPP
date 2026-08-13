export function formatDateTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function maskEmail(email) {
  if (!email || !email.includes('@')) return email || '';
  const [id, domain] = email.split('@');
  const head = id.slice(0, Math.min(5, Math.max(1, id.length - 3)));
  return `${head}***@${domain}`;
}

export function initials(name) {
  if (!name) return '';
  return name.length <= 2 ? name : name.slice(0, 2);
}