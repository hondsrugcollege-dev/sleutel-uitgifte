import { BUILDINGS, KEY_PLANS } from './config.js';

export const stepsFor = (mode) =>
  mode === 'in' ? ['recipient', 'items', 'sign', 'preview'] : ['recipient', 'items', 'terms', 'sign', 'preview'];

// Alle teksten die verschillen tussen uitgifte ('out') en inname ('in').
const COPY = {
  out: {
    doc: 'Ontvangstbewijs', prefix: 'UIT', who: 'Wie ontvangt?', nameLabel: 'Naam ontvanger', mailLabel: 'E-mail ontvanger', dateLabel: 'Datum uitgifte',
    what: 'Wat wordt uitgegeven?', signText: 'Ik verklaar onderstaande in goede staat te hebben ontvangen en ga akkoord met de voorwaarden.',
    person: 'Ontvanger', dateWord: 'Uitgegeven', verb: 'uitgegeven', signedNote: 'akkoord voorwaarden', pgNote: 'Akkoord voorwaarden ✓',
    itemsCta: 'Naar voorwaarden', again: 'Nieuwe uitgifte',
  },
  in: {
    doc: 'Innamebewijs', prefix: 'IN', who: 'Wie levert in?', nameLabel: 'Naam inleveraar', mailLabel: 'E-mail inleveraar', dateLabel: 'Datum inname',
    what: 'Wat wordt ingeleverd?', signText: 'Ik verklaar onderstaande middelen te hebben ingeleverd.',
    person: 'Ingeleverd door', dateWord: 'Ingenomen', verb: 'ingenomen', signedNote: 'ingeleverd', pgNote: 'Ingeleverd ✓',
    itemsCta: 'Naar handtekening', again: 'Nieuwe inname',
  },
};
export const copy = (mode) => COPY[mode] || COPY.out;

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());

// Ontvangers voor het klembord: beheer + (optioneel) de ontvanger/inleveraar zelf.
export const mailTo = (beheer, s) => [beheer, s.mail.trim()].filter(Boolean).join(', ');

export const planFor = (id) => KEY_PLANS.find((p) => p.id === id);

// Namen in vaste volgorde van BUILDINGS, ongeacht de volgorde van aanvinken.
const buildingNames = (ids) => BUILDINGS.filter((b) => ids.includes(b.id)).map((b) => b.name).join(', ');

const pad = (n) => String(n).padStart(2, '0');

export function emptyIssue(now = new Date(), mode = 'out') {
  return { mode, name: '', dept: '', mail: '', keyOn: true, keys: [{ plan: '', type: '' }], tagOn: false, tagNo: '', tagBuildings: [], liftOn: false, liftBuildings: [], termsRead: false, agreed: false, sig: null, touched: false, now };
}

export function itemList(s) {
  const out = [];
  if (s.keyOn) {
    for (const k of s.keys) out.push({ label: 'Lokalensleutel', detail: `${planFor(k.plan)?.name || '—'} · ${k.type || '—'}` });
  }
  if (s.tagOn) out.push({ label: 'Tag voordeur', detail: `Tag ${s.tagNo || '—'} · ${buildingNames(s.tagBuildings) || '—'}` });
  if (s.liftOn) out.push({ label: 'Liftsleutel', detail: buildingNames(s.liftBuildings) || '—' });
  return out;
}

export function errors(s) {
  return {
    recipient: !s.name.trim() || (!!s.mail.trim() && !isEmail(s.mail)),
    items: (!s.keyOn && !s.tagOn && !s.liftOn)
      || (s.keyOn && (!s.keys.length || s.keys.some((k) => !k.plan || !k.type)))
      || (s.tagOn && (!s.tagNo.trim() || !s.tagBuildings.length))
      || (s.liftOn && !s.liftBuildings.length),
    terms: !s.agreed,
    sign: !s.sig,
    preview: false,
  };
}

export function meta(name, now, seq, mode = 'out') {
  const c = copy(mode);
  const d = now;
  const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const slug = (name || 'Ontvanger').normalize('NFC').trim().replace(/\s+/g, '_').replace(/[^\p{L}\p{N}_-]/gu, '');
  return {
    dateShort: `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`,
    timeShort: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    dateLong: d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    docNo: `${c.prefix}-${d.getFullYear()}-${String(seq).padStart(4, '0')}`,
    fileName: `${c.doc}_${slug}_${iso}.pdf`,
  };
}

export function subject(s) {
  const n = s.keyOn ? s.keys.length : 0;
  const kinds = [n === 1 ? 'lokalensleutel' : n > 1 ? 'lokalensleutels' : '', s.tagOn ? 'tag' : '', s.liftOn ? 'liftsleutel' : ''].filter(Boolean);
  const list = kinds.length > 1 ? `${kinds.slice(0, -1).join(', ')} en ${kinds.at(-1)}` : kinds[0] || '';
  return `${copy(s.mode).doc} ${list} – ${s.name}`;
}

export const mailBody = (s, m, org) =>
  `In de bijlage het getekende ${copy(s.mode).doc.toLowerCase()} (${m.docNo}) van ${s.name}${s.dept ? ` (${s.dept})` : ''}, ${copy(s.mode).verb} op ${m.dateShort} om ${m.timeShort}.\n\nMet vriendelijke groet,\n${org}`;

export const recentItems = (s) =>
  (s.mode === 'in' ? 'Inname · ' : '') +
  [
    ...(s.keyOn ? s.keys.map((k) => `${k.type} ${planFor(k.plan)?.name || ''}`.trim()) : []),
    ...(s.tagOn ? [`Tag ${s.tagNo}`] : []),
    ...(s.liftOn ? ['Liftsleutel'] : []),
  ].join(' · ');

export function formatWhen(iso, now = new Date()) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const t = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 864e5);
  if (diff === 0) return `Vandaag ${t}`;
  if (diff === 1) return `Gisteren ${t}`;
  return `${d.getDate()} ${d.toLocaleDateString('nl-NL', { month: 'short' }).replace('.', '')} ${t}`;
}

export function prune(recent, now = new Date(), days = 30) {
  const cutoff = now.getTime() - days * 864e5;
  const fresh = (r) => !(new Date(r.when).getTime() < cutoff); // onleesbare datum (NaN) → bewaren
  return { keep: recent.filter(fresh), drop: recent.filter((r) => !fresh(r)).map((r) => r.id) };
}

export const initials = (org) =>
  org.trim().split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';

const badSeq = (v) => !/^\d+$/.test(String(v).trim()) || Number(v) < 1;

export function settingsErrors(d) {
  return {
    org: !String(d.org).trim(),
    email: !isEmail(d.email),
    nextSeq: badSeq(d.nextSeq),
    nextSeqIn: badSeq(d.nextSeqIn),
  };
}
