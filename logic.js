import { BUILDINGS } from './config.js';

export const STEPS = ['recipient', 'items', 'terms', 'sign', 'preview'];

const pad = (n) => String(n).padStart(2, '0');

export function emptyIssue(now = new Date()) {
  return { name: '', dept: '', keyOn: true, building: null, keyNo: '', tagOn: false, tagNo: '', termsRead: false, agreed: false, sig: null, touched: false, now };
}

export function itemList(s) {
  const out = [];
  if (s.keyOn) {
    const b = BUILDINGS.find((x) => x.id === s.building);
    out.push({ label: 'Toegangssleutel', detail: `${b ? b.name : '—'} · ${s.keyNo || '—'}` });
  }
  if (s.tagOn) out.push({ label: 'Alarmtag', detail: `Tag ${s.tagNo || '—'}` });
  return out;
}

export function errors(s) {
  return {
    recipient: !s.name.trim(),
    items: (!s.keyOn && !s.tagOn) || (s.keyOn && (!s.building || !s.keyNo.trim())) || (s.tagOn && !s.tagNo.trim()),
    terms: !s.agreed,
    sign: !s.sig,
    preview: false,
  };
}

export function meta(name, now, seq) {
  const d = now;
  const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const slug = (name || 'Ontvanger').trim().replace(/\s+/g, '_').replace(/[^\p{L}\p{N}_-]/gu, '');
  return {
    dateShort: `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`,
    timeShort: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    dateLong: d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    docNo: `UIT-${d.getFullYear()}-${String(seq).padStart(4, '0')}`,
    fileName: `Ontvangstbewijs_${slug}_${iso}.pdf`,
  };
}

export const subject = (s) => `Ontvangstbewijs ${itemList(s).map((i) => i.label.toLowerCase()).join(' en ')} – ${s.name}`;

export const mailBody = (s, m, org) =>
  `Beste beheerder,\n\nIn de bijlage het getekende ontvangstbewijs (${m.docNo}) van ${s.name}${s.dept ? ` (${s.dept})` : ''}, uitgegeven op ${m.dateShort} om ${m.timeShort}.\n\nMet vriendelijke groet,\n${org}`;

export const recentItems = (s) =>
  itemList(s).map((i) => (i.label === 'Alarmtag' ? i.detail : 'Sleutel ' + i.detail.split(' · ')[0])).join(' · ');

export function formatWhen(iso, now = new Date()) {
  const d = new Date(iso);
  const t = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 864e5);
  if (diff === 0) return `Vandaag ${t}`;
  if (diff === 1) return `Gisteren ${t}`;
  return `${d.getDate()} ${d.toLocaleDateString('nl-NL', { month: 'short' }).replace('.', '')} ${t}`;
}

export function prune(recent, now = new Date(), days = 30) {
  const cutoff = now.getTime() - days * 864e5;
  const fresh = (r) => new Date(r.when).getTime() >= cutoff;
  return { keep: recent.filter(fresh), drop: recent.filter((r) => !fresh(r)).map((r) => r.id) };
}

export const initials = (org) =>
  org.trim().split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';

export function settingsErrors(d) {
  return {
    org: !String(d.org).trim(),
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.email).trim()),
    nextSeq: !/^\d+$/.test(String(d.nextSeq).trim()) || Number(d.nextSeq) < 1,
  };
}
