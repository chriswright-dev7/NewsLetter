import React from 'react';

export const TierBadge = ({ level, name, small }) => (
  <span className={`tier-badge tier-${level}${small ? ' tier-badge--sm' : ''}`}>
    {Number(level) > 0 && <LockIcon open={false} size={11} />}
    {name}
  </span>
);

export const LockIcon = ({ open, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="11" width="16" height="10" rx="2" />
    {open ? <path d="M8 11V7a4 4 0 0 1 7.8-1.2" /> : <path d="M8 11V7a4 4 0 0 1 8 0v4" />}
  </svg>
);

export const formatDate = (iso, opts = { month: 'long', day: 'numeric', year: 'numeric' }) =>
  iso ? new Date(iso).toLocaleDateString(undefined, opts) : '';

const plural = (n, unit) => `${n} ${unit}${Number(n) === 1 ? '' : 's'}`;

export const formatPlanPrice = (p) => {
  const price = Number(p.price);
  if (price === 0) return `Free for ${plural(p.period_length, p.period_unit)}`;
  const per = Number(p.period_length) === 1 ? `/${p.period_unit}` : ` / ${plural(p.period_length, p.period_unit)}`;
  return `$${price.toFixed(2)}${per}`;
};

// Small auto-dismissing status message: const [toast, notify] = useToast();
export function useToast() {
  const [toast, setToast] = React.useState(null);
  React.useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  return [toast, (text, kind = 'ok') => setToast({ text, kind, at: Date.now() })];
}

export const Toast = ({ toast }) =>
  toast ? <div key={toast.at} className={`toast toast--${toast.kind}`} role="status">{toast.text}</div> : null;

// Body format: blank line between paragraphs, "## " prefix for headings.
export const ArticleBody = ({ body }) => (
  <div className="prose">
    {String(body || '')
      .split(/\n{2,}/)
      .filter((b) => b.trim())
      .map((block, i) =>
        block.startsWith('## ') ? <h2 key={i}>{block.slice(3)}</h2> : <p key={i}>{block}</p>
      )}
  </div>
);
