export const initials = (name: string): string => {
  const n = name.trim().split(/\s+/);
  return ((n[n.length - 2]?.[0] ?? '') + (n[n.length - 1]?.[0] ?? '')).toUpperCase() || '?';
};

/** 2026-10-31 → 31/10/2026 */
export const fmtDate = (iso?: string | null): string => {
  if (!iso) return '—';
  const d = iso.slice(0, 10).split('-');
  return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : iso;
};

/** 2026-10-31T09:30:00 → 31/10/2026 09:30 */
export const fmtDateTime = (iso?: string | null): string => {
  if (!iso) return '—';
  return `${fmtDate(iso)} ${iso.slice(11, 16)}`.trim();
};

export const fmtSize = (bytes: number): string =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1).replace('.', ',')} MB`;

export const fmtNumber = (n: number, digits = 1) => n.toFixed(digits).replace('.', ',');
