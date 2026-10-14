export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const ramp = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
export const RM =
  typeof matchMedia !== 'undefined' &&
  matchMedia('(prefers-reduced-motion:reduce)').matches;
export const fmt = (s) => {
  s = Math.max(0, s | 0);
  return ((s / 60) | 0) + ':' + String(s % 60).padStart(2, '0');
};
export const stars = (r) => {
  const n = Math.round(r);
  return '★'.repeat(n) + '☆'.repeat(5 - n);
};

export const store = {
  get: (k) => {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k, v) => {
    try {
      window.localStorage.setItem(k, v);
    } catch {}
  },
};

export function getMe() {
  let id = store.get('vp_id');
  if (!id) {
    id =
      Math.random().toString(36).slice(2, 10) +
      Date.now().toString(36).slice(-4);
    store.set('vp_id', id);
  }
  return { id, name: store.get('vp_name') || '' };
}
export const code5 = () => {
  const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from(
    { length: 5 },
    () => a[(Math.random() * a.length) | 0],
  ).join('');
};
export const parseCode = (s) => {
  s = String(s || '');
  const m = s.match(/(?:#\/r\/|\/r\/)([A-Za-z0-9]{3,8})/);
  return (m ? m[1] : s)
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 8);
};
export const routeCode = () => {
  const m = window.location.hash.match(/^#\/r\/([A-Za-z0-9]{3,8})$/);
  return m ? m[1].toUpperCase() : null;
};

export async function copyText(t, inp) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(t);
      return true;
    }
  } catch {}
  try {
    let el = inp;
    if (!el) {
      el = document.createElement('textarea');
      el.value = t;
      el.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(el);
    }
    el.select();
    const ok = document.execCommand('copy');
    if (!inp) el.remove();
    return ok;
  } catch {
    return false;
  }
}

function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [
    i,
    ...Array(b.length).fill(0),
  ]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
  return d[a.length][b.length];
}
export function fz(q, s) {
  q = q.toLowerCase().trim();
  s = s.toLowerCase();
  if (!q) return 1;
  if (s.includes(q)) return 3;
  let i = 0,
    g = 0;
  for (const c of s) {
    if (c === q[i]) i++;
    else if (i) g++;
  }
  if (i === q.length) return 1 / (1 + g * 0.08);
  return s
    .split(/\W+/)
    .some((w) => w.length > 2 && lev(q, w.slice(0, q.length + 1)) <= 1)
    ? 0.4
    : 0;
}
