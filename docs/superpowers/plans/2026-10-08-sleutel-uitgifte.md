# Sleutel Uitgifte Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Each task names its **Model** — dispatch the subagent with that model.

**Goal:** Statische iOS-PWA waarmee een ontvanger tekent voor een sleutel/alarmtag; de PDF gaat via het iOS-deelmenu naar Outlook.

**Architecture:** Vanilla HTML/CSS/ES-modules, geen build-stap. `index.html` bevat alle schermen als `<section data-screen>`; `app.js` houdt één state-object bij en een `render()` die zichtbaarheid, teksten en klassen bijwerkt. Pure logica in `logic.js` (getest met `node test.mjs`), opslag in `store.js`, handtekening in `sign.js`, PDF + delen in `pdf.js`.

**Tech Stack:** HTML/CSS/JS (ES2022 modules), jsPDF 2.5.1 (cdnjs), Geist/Geist Mono (Google Fonts), Web Share API Level 2, IndexedDB, localStorage, Node 26 (alleen voor tests), GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-08-sleutel-uitgifte-design.md`
**Ontwerpbron:** Claude Design-project `ddaabd1a-a282-483a-b2ce-44b2e55d6654`, bestanden `Sleutel Uitgifte.dc.html` en `design_handoff_sleutel_uitgifte/README.md` (lezen via `DesignSync get_file`).

## Global Constraints

- Alle UI-teksten Nederlands; code-identifiers Engels.
- Alleen iOS Safari / beginscherm-PWA hoeft te werken; desktop-browser alleen voor ontwikkeling.
- Geen npm-dependencies, geen build-stap, geen framework. Externe scripts alleen `https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js`.
- Geen backend, geen service worker.
- Kleuren/maten exact uit de spec-tokens: ink `#15171A`, secundair `#5E636B`, body `#3A3E45`, placeholder `#9A9EA5`, achtergrond `#F6F5F2`, ingedrukt `#ECEAE5`, tegel `#F1EFEA`, lijnen `#E2DFD8`/`#D6D2CA`/`#ECEAE5`/`#C9C5BC`/`#B8B4AB`/`#D9D5CD`, accent `#1E6B4A`, accent-tint `#E3EFE8`, fout `#B3261E`, fout-tint `#FBEAE8`.
- Invoervelden ≥ 16px font-size (anders zoomt iOS in).
- Minimale tikgrootte 44pt.
- Voorwaardenversie `2026.1`.
- Documentnummer `UIT-{jaar}-{volgnummer 4 cijfers}`, teller loopt door, geen reset per jaar.
- PDF's en recent-items ouder dan 30 dagen worden bij start verwijderd.
- Commits eindigen met `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Model per taak

| Taak | Model | Waarom |
|------|-------|--------|
| 1 Scaffold, config, manifest, icoon | **haiku** | Overtypen van gegeven bestanden |
| 2 `logic.js` + tests (TDD) | **sonnet** | Logica met edge cases (datum, locale, regex) |
| 3 `index.html` + `style.css` | **sonnet** | Veel markup, pixelgetrouw tegen ontwerp |
| 4 `sign.js` + `pdf.js` | **opus** | Canvas/DPR, jsPDF-layout, Web Share-gedrag op iOS |
| 5 `store.js` + `app.js` + browsertest | **sonnet** | Bedrading volgens gegeven code, doorklikken |
| 6 GitHub-repo + Pages | **haiku** | Vaste commando's |
| 7 Eindreview tegen spec + ontwerp | **opus** | Oordeel, fouten vinden over bestanden heen |

## Bestandsoverzicht

```
index.html            alle schermen (Taak 3)
style.css             tokens + componenten (Taak 3)
config.js             gebouwen, voorwaarden, defaults (Taak 1)
logic.js              pure functies (Taak 2)
test.mjs              node-asserts (Taak 2)
sign.js               handtekening-canvas (Taak 4)
pdf.js                buildPdf + shareFile (Taak 4)
store.js              localStorage + IndexedDB (Taak 5)
app.js                state, render, events (Taak 5)
manifest.webmanifest  PWA-manifest (Taak 1)
icon.svg / icon.png   beginschermicoon (Taak 1)
package.json          "type": "module" voor node-tests (Taak 1)
.gitignore            .claude/ (Taak 1)
```

---

### Task 1: Scaffold, config, manifest, icoon

**Model:** haiku

**Files:**
- Create: `package.json`, `.gitignore`, `config.js`, `manifest.webmanifest`, `icon.svg`, `icon.png`, `.claude/launch.json`

**Interfaces:**
- Produces: `config.js` exporteert `TERMS_VERSION: string`, `BUILDINGS: {id,name,addr}[]`, `DEFAULTS: {org,email,nextSeq,requireScroll}`, `terms(org: string): {n,title,body}[]`.

- [ ] **Step 1: `package.json`**

```json
{ "private": true, "type": "module", "scripts": { "test": "node test.mjs" } }
```

- [ ] **Step 2: `.gitignore`**

```
.claude/
.DS_Store
```

- [ ] **Step 3: `config.js`**

```js
// Wijzig je de voorwaarden? Verhoog dan TERMS_VERSION; die gaat mee in de PDF.
export const TERMS_VERSION = '2026.1';

export const BUILDINGS = [
  { id: 'A', name: 'Hoofdgebouw A', addr: 'Stationsplein 1' },
  { id: 'B', name: 'Gebouw B – Logistiek', addr: 'Havenweg 14' },
  { id: 'C', name: 'Gebouw C – Kantoren', addr: 'Stationsplein 3' },
  { id: 'P', name: 'Parkeergarage', addr: 'Ingang Havenweg' },
];

export const DEFAULTS = {
  org: 'Facilitaire Dienst',
  email: 'beveiliging@organisatie.nl',
  nextSeq: 1,
  requireScroll: true,
};

export function terms(o) {
  return [
    ['Eigendom', `De uitgegeven sleutel(s) en alarmtag(s) blijven eigendom van ${o}. Ze zijn persoonsgebonden en uitsluitend bestemd voor gebruik door de ontvanger.`],
    ['Gebruik', 'Het is niet toegestaan sleutels of tags uit te lenen, over te dragen of te (laten) kopiëren. Toegang wordt alleen gebruikt voor werkzaamheden binnen de afgesproken tijden.'],
    ['Verlies of diefstal', `Verlies, diefstal of beschadiging meldt de ontvanger binnen 24 uur bij ${o}. Een alarmtag wordt dan direct geblokkeerd.`],
    ['Kosten', 'Bij verlies door nalatigheid kunnen vervangingskosten worden doorberekend: € 75 per sleutel en € 25 per alarmtag. Moet een cilinder worden vervangen, dan kunnen ook die kosten in rekening worden gebracht.'],
    ['Alarmsysteem', 'De ontvanger is verantwoordelijk voor het correct in- en uitschakelen van het alarm. Kosten van een loos alarm of opvolging door een beveiligingsbedrijf door onjuist gebruik kunnen worden doorberekend.'],
    ['Inleveren', 'Bij einde van dienstverband of opdracht, of op eerste verzoek, levert de ontvanger alle middelen direct in. Inname wordt schriftelijk bevestigd.'],
    ['Registratie', 'Het gebruik van alarmtags wordt geregistreerd (tijdstip en toegangspunt). Deze gegevens worden verwerkt conform de AVG en maximaal 12 maanden bewaard.'],
    ['Ondertekening', 'Door te ondertekenen verklaart de ontvanger de middelen in goede staat te hebben ontvangen en akkoord te gaan met deze voorwaarden.'],
  ].map(([title, body], i) => ({ n: String(i + 1), title, body }));
}
```

- [ ] **Step 4: `manifest.webmanifest`**

```json
{
  "name": "Sleutel Uitgifte",
  "short_name": "Sleutels",
  "lang": "nl",
  "start_url": "./",
  "display": "standalone",
  "background_color": "#F6F5F2",
  "theme_color": "#F6F5F2",
  "icons": [{ "src": "icon.png", "sizes": "180x180", "type": "image/png" }]
}
```

- [ ] **Step 5: `icon.svg` en `icon.png`**

`icon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 24 24"><rect width="24" height="24" fill="#15171A"/><g transform="translate(4.8 4.8) scale(.6)" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/></g></svg>
```

Run:
```bash
qlmanage -t -s 180 -o "$TMPDIR" icon.svg >/dev/null && mv "$TMPDIR/icon.svg.png" icon.png && sips -g pixelWidth -g pixelHeight icon.png
```
Expected: `pixelWidth: 180`, `pixelHeight: 180`. Open `icon.png` with the Read tool: witte sleutel op donkere achtergrond. Is het niet 180×180, run `sips -z 180 180 icon.png`.

- [ ] **Step 6: `.claude/launch.json`** (lokale dev-server voor de browserpane; niet gecommit)

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "web", "runtimeExecutable": "python3", "runtimeArgs": ["-m", "http.server", "8000"], "port": 8000 }
  ]
}
```

- [ ] **Step 7: Verify config loads**

Run: `node -e "import('./config.js').then(c => console.log(c.terms('X').length, c.BUILDINGS.length, c.TERMS_VERSION))"`
Expected: `8 4 2026.1`

- [ ] **Step 8: Commit**

```bash
git add package.json .gitignore config.js manifest.webmanifest icon.svg icon.png
git commit -m "Scaffold: config, manifest, icoon

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `logic.js` + tests (TDD)

**Model:** sonnet

**Files:**
- Create: `test.mjs`, `logic.js`

**Interfaces:**
- Consumes: `BUILDINGS` uit `config.js`.
- Produces (alle exports van `logic.js`):
  - `STEPS: ['recipient','items','terms','sign','preview']`
  - `emptyIssue(now?: Date) → {name,dept,keyOn,building,keyNo,tagOn,tagNo,termsRead,agreed,sig,touched,now}`
  - `itemList(s) → {label,detail}[]`
  - `errors(s) → {recipient,items,terms,sign,preview: boolean}`
  - `meta(name: string, now: Date, seq: number) → {dateShort,timeShort,dateLong,docNo,fileName}`
  - `subject(s) → string`, `mailBody(s, m, org) → string`, `recentItems(s) → string`
  - `formatWhen(iso: string, now?: Date) → string`
  - `prune(recent: {id,when}[], now?: Date, days = 30) → {keep: item[], drop: id[]}`
  - `initials(org: string) → string`
  - `settingsErrors({org,email,nextSeq}) → {org,email,nextSeq: boolean}`

- [ ] **Step 1: Write the failing test — `test.mjs`**

```js
import assert from 'node:assert/strict';
import { STEPS, emptyIssue, errors, itemList, meta, subject, mailBody, recentItems, formatWhen, prune, initials, settingsErrors } from './logic.js';
import { terms, TERMS_VERSION, BUILDINGS } from './config.js';

const now = new Date(2026, 9, 8, 9, 5);
const s = emptyIssue(now);

assert.deepEqual(STEPS, ['recipient', 'items', 'terms', 'sign', 'preview']);
assert.equal(s.keyOn, true);
assert.equal(s.tagOn, false);
assert.equal(s.now, now);

// errors
assert.equal(errors(s).recipient, true);
assert.equal(errors({ ...s, name: '  ' }).recipient, true);
assert.equal(errors({ ...s, name: 'Sanne' }).recipient, false);
assert.equal(errors({ ...s, keyOn: false, tagOn: false }).items, true);
assert.equal(errors({ ...s, building: 'B', keyNo: '' }).items, true);
assert.equal(errors({ ...s, building: null, keyNo: 'K-1' }).items, true);
assert.equal(errors({ ...s, building: 'B', keyNo: 'K-1' }).items, false);
assert.equal(errors({ ...s, keyOn: false, tagOn: true, tagNo: ' ' }).items, true);
assert.equal(errors({ ...s, keyOn: false, tagOn: true, tagNo: '0417' }).items, false);
assert.equal(errors(s).terms, true);
assert.equal(errors({ ...s, agreed: true }).terms, false);
assert.equal(errors(s).sign, true);
assert.equal(errors({ ...s, sig: 'data:image/png;base64,x' }).sign, false);
assert.equal(errors(s).preview, false);

// itemList / subject / recentItems
const full = { ...s, name: 'Sanne de Vries', dept: 'Schoonmaak', building: 'B', keyNo: 'K-1042', tagOn: true, tagNo: '0417' };
assert.deepEqual(itemList(full), [
  { label: 'Toegangssleutel', detail: 'Gebouw B – Logistiek · K-1042' },
  { label: 'Alarmtag', detail: 'Tag 0417' },
]);
assert.deepEqual(itemList({ ...s, keyOn: true }), [{ label: 'Toegangssleutel', detail: '— · —' }]);
assert.equal(subject(full), 'Ontvangstbewijs toegangssleutel en alarmtag – Sanne de Vries');
assert.equal(subject({ ...full, tagOn: false }), 'Ontvangstbewijs toegangssleutel – Sanne de Vries');
assert.equal(recentItems(full), 'Sleutel Gebouw B – Logistiek · Tag 0417');

// meta
const m = meta('José  de Vries', now, 7);
assert.equal(m.docNo, 'UIT-2026-0007');
assert.equal(m.fileName, 'Ontvangstbewijs_José_de_Vries_2026-10-08.pdf');
assert.equal(m.dateShort, '08-10-2026');
assert.equal(m.timeShort, '09:05');
assert.equal(m.dateLong, 'donderdag 8 oktober 2026');
assert.equal(meta('', now, 1).fileName, 'Ontvangstbewijs_Ontvanger_2026-10-08.pdf');
assert.equal(meta('a/b', now, 12345).docNo, 'UIT-2026-12345');
assert.equal(meta('a/b', now, 1).fileName, 'Ontvangstbewijs_ab_2026-10-08.pdf');

// mailBody
assert.equal(
  mailBody(full, m, 'Facilitaire Dienst'),
  'Beste beheerder,\n\nIn de bijlage het getekende ontvangstbewijs (UIT-2026-0007) van Sanne de Vries (Schoonmaak), uitgegeven op 08-10-2026 om 09:05.\n\nMet vriendelijke groet,\nFacilitaire Dienst',
);
assert.ok(mailBody({ ...full, dept: '' }, m, 'X').includes('van Sanne de Vries, uitgegeven'));

// formatWhen
assert.equal(formatWhen(new Date(2026, 9, 8, 8, 42).toISOString(), now), 'Vandaag 08:42');
assert.equal(formatWhen(new Date(2026, 9, 7, 16, 10).toISOString(), now), 'Gisteren 16:10');
assert.equal(formatWhen(new Date(2026, 9, 6, 11, 25).toISOString(), now), '6 okt 11:25');

// prune
const day = 864e5;
const rec = [
  { id: 'a', when: new Date(now - 29 * day).toISOString() },
  { id: 'b', when: new Date(now - 31 * day).toISOString() },
];
const p = prune(rec, now);
assert.deepEqual(p.keep.map((r) => r.id), ['a']);
assert.deepEqual(p.drop, ['b']);
assert.deepEqual(prune([], now), { keep: [], drop: [] });

// initials
assert.equal(initials('Facilitaire Dienst'), 'FD');
assert.equal(initials('hondsrug college beheer'), 'HC');
assert.equal(initials('  '), '?');

// settingsErrors
assert.deepEqual(settingsErrors({ org: 'X', email: 'a@b.nl', nextSeq: '12' }), { org: false, email: false, nextSeq: false });
assert.deepEqual(settingsErrors({ org: ' ', email: 'ab.nl', nextSeq: '0' }), { org: true, email: true, nextSeq: true });
assert.equal(settingsErrors({ org: 'X', email: 'a@b.nl', nextSeq: '1.5' }).nextSeq, true);
assert.equal(settingsErrors({ org: 'X', email: 'a b@c.nl', nextSeq: '1' }).email, true);

// config
assert.equal(TERMS_VERSION, '2026.1');
assert.equal(BUILDINGS.length, 4);
const t = terms('Org X');
assert.equal(t.length, 8);
assert.ok(t[0].body.includes('Org X'));
assert.equal(t[7].n, '8');

console.log('OK');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test.mjs`
Expected: FAIL with `Cannot find module` … `logic.js`

- [ ] **Step 3: Write `logic.js`**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test.mjs`
Expected: `OK`

If only `formatWhen` fails on `'6 okt 11:25'`: print `new Date(2026,9,6).toLocaleDateString('nl-NL',{month:'short'})` and fix the normalisation in `formatWhen` (not the test).

- [ ] **Step 5: Commit**

```bash
git add logic.js test.mjs
git commit -m "Logic: validatie, metadata, opschoning + tests

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `index.html` + `style.css`

**Model:** sonnet

**Files:**
- Create: `index.html`, `style.css`

**Interfaces:**
- Produces: DOM-contract dat `app.js` (Taak 5) gebruikt. Exact deze id's/attributen:
  - Schermen: `section[data-screen=home|recipient|items|terms|sign|preview|done|settings]`
  - Tekstbindingen: `[data-text=org|initials|email|name|deptOrDash|dateLong|dateShort|timeShort|docNo|fileName|termsVersion]`
  - Invoer: `[data-field=name|dept|keyNo|tagNo]`, `[data-setting=org|email|nextSeq]`
  - Acties: `[data-act=start|settings|back|cancel|next|toggleKey|toggleTag|building|agree|clearSig|download|resend|toggleScroll]`
  - Id's: `#recent #wizhead #stepno #progress #f-name #e-name #keycard #tagcard #keybody #tagbody #buildings #e-items #e-building #f-keyNo #e-keyNo #f-tagNo #e-tagNo #tscroll #terms #agree #agree-l #summary #sigbox #sig #sig-ph #e-sig #pg-items #pg-terms #pg-sig #cta #cta-edit #cta-main #toast #s-org #s-email #s-nextSeq #e-s-org #e-s-email #e-s-nextSeq #s-scroll #s-scroll-row`
  - CSS-statusklassen die `app.js` togglet: `.on` (progress-`i`, `.mcard`, `.agree`, `.switch`), `.sel` (`.radio`), `.err` (input, `.sigbox`), `.filled` (input), `.locked` (`.agree`), `.blocked`/`.go` (`.btn`).

- [ ] **Step 1: `style.css`**

```css
:root{
  --ink:#15171A;--muted:#5E636B;--body:#3A3E45;--ph:#9A9EA5;
  --bg:#F6F5F2;--press:#ECEAE5;--tile:#F1EFEA;--surface:#fff;
  --line-card:#E2DFD8;--line-input:#D6D2CA;--divider:#ECEAE5;--sigline:#C9C5BC;--radio-off:#B8B4AB;--prog-off:#D9D5CD;
  --ok:#1E6B4A;--ok-tint:#E3EFE8;--err:#B3261E;--err-tint:#FBEAE8;
  --mono:'Geist Mono',ui-monospace,monospace;
}
*{box-sizing:border-box}
[hidden]{display:none!important}
html{-webkit-text-size-adjust:100%}
html,body{margin:0;height:100%;background:var(--bg)}
body{font-family:'Geist',system-ui,sans-serif;color:var(--ink);-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent}
button{all:unset;box-sizing:border-box;cursor:pointer}
button:focus-visible{outline:2px solid var(--ok);outline-offset:2px}
input{appearance:none;font-family:inherit;color:var(--ink);background:var(--surface);outline:none;border:1.5px solid var(--line-input);border-radius:14px;height:54px;padding:0 16px;font-size:17px;width:100%}
input::placeholder{color:var(--ph)}
input:focus,input.filled{border-color:var(--ink)}
input.err{border-color:var(--err)}
input.code{height:50px;border-radius:12px;padding:0 14px;font:500 16px var(--mono);background:var(--bg)}

.app{max-width:480px;margin:0 auto;height:100dvh;display:flex;flex-direction:column;background:var(--bg);padding-top:env(safe-area-inset-top);position:relative}

/* layout-hulpjes */
.row{display:flex;align-items:center}
.between{justify-content:space-between}
.col{display:flex;flex-direction:column}
.grow{flex:1}
.min0{min-width:0}
.end{align-items:flex-end;flex:none}
.muted{color:var(--muted)}
.ellipsis{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* schermen */
.screen{flex:1;min-height:0;overflow-y:auto;padding:10px 22px 24px;display:flex;flex-direction:column;gap:24px}
.home{padding-top:12px;gap:26px}
.screen.terms{overflow:hidden;gap:14px;padding-bottom:16px}
.screen.preview{background:var(--press);padding:10px 16px 24px;gap:14px}
.screen.done{padding:24px 26px;justify-content:center;gap:28px}

/* gaps (na .screen zodat ze winnen) */
.g1{gap:1px}.g2{gap:2px}.g3{gap:3px}.g4{gap:4px}.g6{gap:6px}.g8{gap:8px}.g10{gap:10px}.g14{gap:14px}.g16{gap:16px}.g18{gap:18px}

/* typografie */
.eyebrow{font:500 12px/1.2 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
h1{margin:0;font-size:34px;line-height:1.05;font-weight:600;letter-spacing:-.02em;text-wrap:pretty}
h2{margin:0;font-size:28px;font-weight:600;letter-spacing:-.02em}
h2.big{font-size:32px;line-height:1.1}
.sub{margin:0;color:var(--muted);font-size:15px;line-height:1.45;text-wrap:pretty}
.sub16{margin:0;font-size:16px;color:var(--muted);line-height:1.45;text-wrap:pretty}
.small{font-size:12px;color:var(--muted)}
.mono14{font:500 14px var(--mono)}
.mono12{font:500 12px var(--mono);color:var(--muted)}

/* start */
.avatar{width:44px;height:44px;margin:-4px -4px -4px 0;display:flex;align-items:center;justify-content:center}
.avatar span{width:36px;height:36px;border-radius:50%;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px}
.hero{background:var(--ink);color:#fff;border-radius:20px;padding:22px;display:flex;justify-content:space-between;align-items:center}
.hero:active,.btn:active{transform:scale(.98)}
.hero-t{font-size:19px;font-weight:600}
.hero-s{font-size:13px;color:#B9BCC2}
.plus{width:44px;height:44px;border-radius:50%;background:#fff;color:var(--ink);display:flex;align-items:center;justify-content:center;flex:none}
.card{background:var(--surface);border:1px solid var(--line-card);border-radius:16px}
.mailcard{padding:14px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px}
.link{font-size:14px;font-weight:600;color:var(--ok);padding:12px 0;flex:none}
.list{overflow:hidden}
.rrow{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 16px;width:100%}
.rrow+.rrow{border-top:1px solid var(--divider)}
.rrow:active{background:var(--bg)}
.rname{font-size:15px;font-weight:600}
.rsub{font-size:13px;color:var(--muted)}
.rwhen{font-size:12px;color:var(--muted)}
.badge{font-size:11px;font-weight:600;color:var(--ok);background:var(--ok-tint);padding:2px 7px;border-radius:6px}
.empty{padding:14px 16px;font-size:14px;color:var(--muted)}

/* wizard-chrome */
.wiz{flex:none;padding:4px 16px 14px;display:flex;flex-direction:column;gap:12px}
.iconbtn{width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:50%;flex:none}
.iconbtn:hover,.iconbtn:active{background:var(--press)}
.stepno{font:500 12px var(--mono);letter-spacing:.06em;color:var(--muted)}
.textbtn{font-size:15px;color:var(--muted);padding:10px 6px}
.progress{display:flex;gap:4px;padding:0 6px}
.progress i{flex:1;height:4px;border-radius:2px;background:var(--prog-off);transition:background .3s}
.progress i.on{background:var(--ink)}

/* formulier */
.field{display:flex;flex-direction:column;gap:8px}
.flabel{font-size:14px;font-weight:600}
.opt{font-weight:400;color:var(--muted)}
.errtxt{font-size:13px;color:var(--err)}
.readonly{height:54px;border-radius:14px;padding:0 16px;display:flex;align-items:center;justify-content:space-between;gap:8px;background:var(--press);font-size:17px}
.auto{font:500 13px var(--mono);color:var(--muted);flex:none}
.banner{font-size:14px;color:var(--err);background:var(--err-tint);padding:10px 14px;border-radius:12px}

/* middelen */
.mcard{background:var(--surface);border:1.5px solid var(--line-card);border-radius:18px;overflow:hidden;transition:border-color .2s;flex:none}
.mcard.on{border-color:var(--ink)}
.mhead{display:flex;align-items:center;gap:14px;padding:16px;width:100%}
.tile{width:44px;height:44px;border-radius:12px;background:var(--tile);display:flex;align-items:center;justify-content:center;flex:none}
.mt{font-size:17px;font-weight:600}
.ms{font-size:13px;color:var(--muted)}
.switch{width:50px;height:30px;border-radius:15px;background:var(--line-input);position:relative;transition:background .2s;flex:none}
.switch::after{content:'';position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:12px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:left .2s}
.mcard.on .switch,.switch.on{background:var(--ok)}
.mcard.on .switch::after,.switch.on::after{left:23px}
.mbody{padding:0 16px 16px;display:flex;flex-direction:column;gap:14px}
.divider{height:1px;background:var(--divider)}
.radio{display:flex;align-items:center;gap:12px;padding:12px 14px;min-height:48px;border-radius:12px;border:1.5px solid var(--line-card);background:var(--surface);width:100%}
.radio.sel{border-color:var(--ink);background:var(--bg)}
.ring{width:20px;height:20px;border-radius:50%;border:2px solid var(--radio-off);display:flex;align-items:center;justify-content:center;flex:none}
.ring::after{content:'';width:10px;height:10px;border-radius:50%}
.radio.sel .ring{border-color:var(--ink)}
.radio.sel .ring::after{background:var(--ink)}
.bname{font-size:15px;font-weight:500}
.baddr{font-size:12px;color:var(--muted)}

/* voorwaarden */
.tscroll{flex:1;min-height:0;overflow-y:auto;background:var(--surface);border:1px solid var(--line-card);border-radius:16px;padding:18px 18px 8px;display:flex;flex-direction:column;gap:16px}
.tkop{font:500 11px var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.art{display:flex;gap:12px}
.artn{font:500 13px var(--mono);color:var(--muted);width:18px;flex:none;padding-top:1px}
.artt{font-size:15px;font-weight:600}
.artb{font-size:14px;line-height:1.5;color:var(--body);text-wrap:pretty}
.tfoot{font-size:12px;color:var(--muted);padding:6px 0 10px;border-top:1px dashed var(--line-card)}
.agree{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:14px;background:var(--surface);transition:all .2s;flex:none}
.agree.on{background:var(--ok-tint)}
.agree.locked{opacity:.55;cursor:default}
.check{width:26px;height:26px;border-radius:8px;border:2px solid var(--ph);background:#fff;display:flex;align-items:center;justify-content:center;flex:none;transition:all .15s}
.agree.on .check{border-color:var(--ok);background:var(--ok)}
.agree-l{font-size:15px;line-height:1.35;font-weight:500}

/* handtekening */
.sumrow{display:flex;justify-content:space-between;gap:12px;padding:12px 14px;background:var(--surface);border:1px solid var(--line-card);border-radius:12px}
.suml{font-size:14px;font-weight:600}
.sumd{font:500 13px var(--mono);color:var(--body);text-align:right}
.sigbox{position:relative;background:var(--surface);border:1.5px solid var(--line-input);border-radius:18px;height:230px;overflow:hidden;flex:none}
.sigbox.err{border-color:var(--err)}
.sigbox canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:crosshair}
.sigline{position:absolute;left:20px;right:20px;bottom:46px;border-bottom:1.5px dashed var(--sigline);pointer-events:none}
.sigx{position:absolute;left:20px;bottom:50px;font-size:22px;color:var(--sigline);pointer-events:none}
.sigph{position:absolute;inset:0 0 60px;display:flex;align-items:center;justify-content:center;color:var(--ph);font-size:15px;pointer-events:none}
.sigfoot{position:absolute;left:20px;right:12px;bottom:8px;display:flex;justify-content:space-between;align-items:center;pointer-events:none}
.sigfoot>span{font-size:13px;color:var(--muted)}
.sigfoot button{pointer-events:auto;font-size:14px;font-weight:600;padding:8px 10px;border-radius:8px}
.sigfoot button:hover{background:var(--tile)}

/* PDF-controle */
.pvhead{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;padding:0 6px}
.roundbtn{width:44px;height:44px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;flex:none}
.roundbtn:hover{background:var(--bg)}
.page{background:#fff;border-radius:4px;box-shadow:0 8px 24px -8px rgba(0,0,0,.2);aspect-ratio:1/1.414;padding:22px 20px;display:flex;flex-direction:column;gap:12px;font-size:8px;line-height:1.45;flex:none;overflow:hidden}
.pg-head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1.5px solid var(--ink);padding-bottom:8px}
.pg-title{font-size:12.5px;font-weight:700;letter-spacing:-.01em}
.pg-sub{font-size:7.5px;color:var(--muted)}
.pg-mono7{font-family:var(--mono);font-size:7px}
.pg-grid{display:grid;grid-template-columns:62px 1fr;gap:3px 8px}
.pg-row{display:grid;grid-template-columns:62px 1fr;gap:8px;padding:4px 0;border-bottom:.5px solid #DDD}
.pg-th{padding:3px 0;border-bottom-color:var(--ink);font-weight:600;font-size:7px;text-transform:uppercase;letter-spacing:.04em}
.pg-th0{font-weight:600;font-size:7px;text-transform:uppercase;letter-spacing:.04em}
.pg-mono{font-family:var(--mono);font-size:7.5px}
.pg-term{font-size:6px;line-height:1.4;color:var(--body)}
.pg-foot{margin-top:auto;display:flex;flex-direction:column;gap:2px}
.pg-sig{height:46px;width:150px;background:left center/contain no-repeat}
.pg-signline{border-top:.5px solid var(--ink);padding-top:3px;display:flex;justify-content:space-between}
.note{margin:0;padding:0 6px;font-size:13px;color:var(--muted);line-height:1.45;text-wrap:pretty}
.note b{color:var(--ink);font-weight:600}

/* verzonden */
.okcircle{width:72px;height:72px;border-radius:50%;background:var(--ok);display:flex;align-items:center;justify-content:center}
.kvcard{padding:4px 16px}
.kv{display:flex;justify-content:space-between;gap:12px;padding:12px 0}
.kv+.kv{border-top:1px solid var(--divider)}
.kv>span:first-child{color:var(--muted);font-size:14px}
.kv>span:last-child{font:500 14px var(--mono)}

/* instellingen */
.sethead{margin-left:-11px}
.setrow{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 16px;width:100%}
.mt16{font-size:16px;font-weight:600}

/* CTA + toast */
.cta{flex:none;padding:12px 22px max(20px,env(safe-area-inset-bottom));background:var(--bg);border-top:1px solid var(--divider);display:flex;gap:10px}
.btn{flex:1;height:56px;border-radius:16px;background:var(--ink);color:#fff;font-size:17px;font-weight:600;display:flex;align-items:center;justify-content:center;transition:background .2s}
.btn.blocked{background:var(--ph)}
.btn.go{background:var(--ok)}
.btn2{height:56px;padding:0 20px;border-radius:16px;border:1.5px solid var(--line-input);font-size:16px;font-weight:600;display:flex;align-items:center;flex:none}
.toast{position:fixed;left:50%;bottom:calc(100px + env(safe-area-inset-bottom));transform:translateX(-50%);background:var(--ink);color:#fff;font-size:14px;padding:10px 14px;border-radius:12px;max-width:calc(100% - 44px);z-index:10;text-align:center}
```

- [ ] **Step 2: `index.html`**

```html
<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Sleutels">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="theme-color" content="#F6F5F2">
<title>Sleutel Uitgifte</title>
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script type="module" src="app.js"></script>
</head>
<body>
<div class="app">

<section class="screen home" data-screen="home">
  <div class="row between">
    <span class="eyebrow" data-text="org"></span>
    <button class="avatar" data-act="settings" aria-label="Instellingen"><span data-text="initials"></span></button>
  </div>
  <div class="col g8">
    <h1>Uitgifte sleutels &amp; alarmtags</h1>
    <p class="sub">Laat de ontvanger tekenen voor ontvangst. Het ontvangstbewijs gaat als PDF via Outlook naar beheer.</p>
  </div>
  <button class="hero" data-act="start">
    <span class="col g4"><span class="hero-t">Nieuwe uitgifte</span><span class="hero-s">Ontvanger · middelen · handtekening</span></span>
    <span class="plus"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span>
  </button>
  <div class="card mailcard">
    <div class="col g3 min0"><span class="small">Ontvangstbewijzen versturen naar</span><span class="mono14 ellipsis" data-text="email"></span></div>
    <button class="link" data-act="settings">Wijzig</button>
  </div>
  <div class="col g10">
    <div class="eyebrow">Recent verzonden</div>
    <div class="card list" id="recent"></div>
  </div>
</section>

<header class="wiz" id="wizhead" hidden>
  <div class="row between">
    <button class="iconbtn" data-act="back" aria-label="Terug"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>
    <span class="stepno" id="stepno"></span>
    <button class="textbtn" data-act="cancel">Annuleren</button>
  </div>
  <div class="progress" id="progress"><i></i><i></i><i></i><i></i><i></i></div>
</header>

<section class="screen" data-screen="recipient" hidden>
  <h2>Wie ontvangt?</h2>
  <label class="field"><span class="flabel">Naam ontvanger</span>
    <input id="f-name" data-field="name" placeholder="Voor- en achternaam" autocomplete="off" autocapitalize="words">
    <span class="errtxt" id="e-name" hidden>Vul de naam van de ontvanger in.</span>
  </label>
  <label class="field"><span class="flabel">Afdeling of bedrijf <span class="opt">(optioneel)</span></span>
    <input data-field="dept" placeholder="Bijv. Schoonmaak, Facilitair" autocomplete="off">
  </label>
  <div class="field"><span class="flabel">Datum uitgifte</span>
    <div class="readonly"><span data-text="dateLong"></span><span class="auto">automatisch</span></div>
  </div>
</section>

<section class="screen g16" data-screen="items" hidden>
  <div class="col g6"><h2>Wat wordt uitgegeven?</h2><p class="sub">Kies één of beide.</p></div>
  <div class="banner" id="e-items" hidden>Selecteer minimaal een sleutel of een alarmtag.</div>
  <div class="mcard" id="keycard">
    <button class="mhead" data-act="toggleKey" role="switch">
      <span class="tile"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#15171A" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/></svg></span>
      <span class="col g2 grow"><span class="mt">Toegangssleutel</span><span class="ms">Fysieke sleutel voor een gebouw</span></span>
      <span class="switch"></span>
    </button>
    <div class="mbody" id="keybody">
      <div class="divider"></div>
      <span class="flabel">Gebouw</span>
      <div class="col g8" id="buildings"></div>
      <span class="errtxt" id="e-building" hidden>Kies een gebouw.</span>
      <label class="field"><span class="flabel">Sleutelnummer</span>
        <input class="code" id="f-keyNo" data-field="keyNo" placeholder="K-1042" autocomplete="off" autocapitalize="characters">
        <span class="errtxt" id="e-keyNo" hidden>Vul het sleutelnummer in.</span>
      </label>
    </div>
  </div>
  <div class="mcard" id="tagcard">
    <button class="mhead" data-act="toggleTag" role="switch">
      <span class="tile"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#15171A" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="7" width="14" height="14" rx="4"/><path d="M12 7V3M9.5 14a3.5 3.5 0 015 0"/></svg></span>
      <span class="col g2 grow"><span class="mt">Alarmtag</span><span class="ms">Tag voor in- en uitschakelen alarm</span></span>
      <span class="switch"></span>
    </button>
    <div class="mbody" id="tagbody" hidden>
      <div class="divider"></div>
      <label class="field"><span class="flabel">Tagnummer</span>
        <input class="code" id="f-tagNo" data-field="tagNo" placeholder="0417" inputmode="numeric" autocomplete="off">
        <span class="errtxt" id="e-tagNo" hidden>Vul het tagnummer in.</span>
      </label>
    </div>
  </div>
</section>

<section class="screen terms" data-screen="terms" hidden>
  <div class="col g6"><h2>Voorwaarden</h2><p class="sub">Laat de ontvanger de voorwaarden lezen.</p></div>
  <div class="tscroll" id="tscroll">
    <div class="tkop">Bruikleenvoorwaarden · versie <span data-text="termsVersion"></span></div>
    <div class="col g16" id="terms"></div>
    <div class="tfoot">Voorbeeldtekst — laat de definitieve voorwaarden juridisch toetsen.</div>
  </div>
  <button class="agree" id="agree" data-act="agree" role="checkbox">
    <span class="check"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>
    <span class="agree-l" id="agree-l"></span>
  </button>
</section>

<section class="screen g18" data-screen="sign" hidden>
  <div class="col g6"><h2>Handtekening</h2><p class="sub">Ik verklaar onderstaande in goede staat te hebben ontvangen en ga akkoord met de voorwaarden.</p></div>
  <div class="col g8" id="summary"></div>
  <div class="sigbox" id="sigbox">
    <canvas id="sig"></canvas>
    <div class="sigline"></div>
    <div class="sigx">×</div>
    <div class="sigph" id="sig-ph">Teken hier met je vinger</div>
    <div class="sigfoot"><span><span data-text="name"></span> · <span data-text="dateShort"></span></span><button data-act="clearSig">Wissen</button></div>
  </div>
  <span class="errtxt" id="e-sig" hidden>Een handtekening is verplicht.</span>
</section>

<section class="screen preview" data-screen="preview" hidden>
  <div class="pvhead">
    <div class="col g4 min0"><h2>Controleer PDF</h2><span class="mono12 ellipsis" data-text="fileName"></span></div>
    <button class="roundbtn" data-act="download" aria-label="PDF opslaan of delen"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#15171A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg></button>
  </div>
  <div class="page">
    <div class="pg-head">
      <div class="col g2"><span class="pg-title">Ontvangstbewijs</span><span class="pg-sub">Sleutels &amp; alarmtags · <span data-text="org"></span></span></div>
      <div class="col g2 end pg-mono7"><span data-text="docNo"></span><span class="muted"><span data-text="dateShort"></span> <span data-text="timeShort"></span></span></div>
    </div>
    <div class="pg-grid">
      <span class="muted">Ontvanger</span><b data-text="name"></b>
      <span class="muted">Afdeling</span><span data-text="deptOrDash"></span>
      <span class="muted">Uitgegeven</span><span data-text="dateLong"></span>
    </div>
    <div class="col">
      <div class="pg-row pg-th"><span>Middel</span><span>Omschrijving</span></div>
      <div id="pg-items"></div>
    </div>
    <div class="col g3">
      <span class="pg-th0">Voorwaarden (v<span data-text="termsVersion"></span>)</span>
      <div class="col g3" id="pg-terms"></div>
    </div>
    <div class="pg-foot">
      <div class="pg-sig" id="pg-sig"></div>
      <div class="pg-signline"><span data-text="name"></span><span class="muted">Akkoord voorwaarden ✓</span></div>
    </div>
  </div>
  <p class="note">Na akkoord opent Outlook met deze PDF als bijlage, gericht aan <b data-text="email"></b>.</p>
</section>

<section class="screen done" data-screen="done" hidden>
  <div class="okcircle"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
  <div class="col g10">
    <h2 class="big">Verzonden</h2>
    <p class="sub16">Het ontvangstbewijs voor <span data-text="name"></span> is via Outlook verstuurd naar <span data-text="email"></span>.</p>
  </div>
  <div class="card kvcard">
    <div class="kv"><span>Documentnr.</span><span data-text="docNo"></span></div>
    <div class="kv"><span>Tijdstip</span><span><span data-text="dateShort"></span> <span data-text="timeShort"></span></span></div>
  </div>
</section>

<section class="screen" data-screen="settings" hidden>
  <div class="row g8 sethead">
    <button class="iconbtn" data-act="back" aria-label="Terug"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>
    <h2>Instellingen</h2>
  </div>
  <label class="field"><span class="flabel">Organisatienaam</span>
    <input id="s-org" data-setting="org" autocomplete="organization">
    <span class="errtxt" id="e-s-org" hidden>Vul de organisatienaam in.</span>
  </label>
  <label class="field"><span class="flabel">Ontvangstbewijzen versturen naar</span>
    <input id="s-email" class="code" data-setting="email" type="email" autocomplete="email" autocapitalize="off" spellcheck="false">
    <span class="errtxt" id="e-s-email" hidden>Vul een geldig mailadres in.</span>
  </label>
  <label class="field"><span class="flabel">Volgend documentnummer</span>
    <input id="s-nextSeq" class="code" data-setting="nextSeq" inputmode="numeric" autocomplete="off">
    <span class="errtxt" id="e-s-nextSeq" hidden>Vul een geheel getal van 1 of hoger in.</span>
  </label>
  <button class="card setrow" id="s-scroll-row" data-act="toggleScroll" role="switch">
    <span class="col g2"><span class="mt16">Voorwaarden eerst doorscrollen</span><span class="ms">Akkoord pas mogelijk na lezen tot onderen</span></span>
    <span class="switch" id="s-scroll"></span>
  </button>
</section>

<footer class="cta" id="cta" hidden>
  <button class="btn2" id="cta-edit" data-act="back" hidden>Wijzigen</button>
  <button class="btn" id="cta-main" data-act="next"></button>
</footer>

<div class="toast" id="toast" role="status" hidden></div>
</div>
</body>
</html>
```

- [ ] **Step 3: Visual check of the static home screen**

Start de dev-server met `preview_start` (naam `web`). Zet de viewport op 390×844 (`resize_window` met width 390, height 844) en navigeer naar `http://localhost:8000/`. De console toont een 404 voor `app.js`; dat is verwacht tot Taak 5. Maak een screenshot.
Expected: startscherm met titel, zwarte "Nieuwe uitgifte"-kaart, mailkaart (adres nog leeg) en lege recent-kaart. Geef 'Geist' als font weer (`document.fonts.check('16px Geist')` → `true`).

Controleer daarna alle schermen visueel: zet via `javascript_tool` per scherm `document.querySelectorAll('[data-screen]').forEach(e=>e.hidden=e.dataset.screen!=='items')` (vervang `items` door elk scherm) en vergelijk met het ontwerp (`DesignSync get_file` op `Sleutel Uitgifte.dc.html`, project `ddaabd1a-a282-483a-b2ce-44b2e55d6654`). Herstel afwijkingen in maat/kleur/spacing in `style.css`.

- [ ] **Step 4: Commit**

```bash
git add index.html style.css
git commit -m "UI: schermen en stijlen volgens ontwerp

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `sign.js` + `pdf.js`

**Model:** opus

**Files:**
- Create: `sign.js`, `pdf.js`

**Interfaces:**
- Consumes: `TERMS_VERSION`, `terms(org)` uit `config.js`; `itemList(s)` uit `logic.js`; global `window.jspdf.jsPDF` (cdnjs-script in `index.html`).
- Produces:
  - `createSignature(canvas: HTMLCanvasElement, onChange: (dataUrl: string|null) => void) → { setup(dataUrl: string|null): void, clear(): void }` — `setup` aanroepen telkens als het tekenscherm zichtbaar wordt.
  - `buildPdf(s, m, org: string) → Blob` (`s` = issue-state, `m` = `meta()`-resultaat).
  - `shareFile(file: File, title?: string, text?: string) → Promise<'shared'|'downloaded'>` — gooit `AbortError` als de gebruiker annuleert. Moet synchroon binnen een tik-handler worden aangeroepen (iOS user-activation).

- [ ] **Step 1: `sign.js`**

```js
export function createSignature(canvas, onChange) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, drawing = false, last = null;

  function setup(dataUrl) {
    const dpr = window.devicePixelRatio || 1;
    w = canvas.offsetWidth;
    h = canvas.offsetHeight;
    canvas.width = w * dpr; // reset ook de context-state
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = ctx.fillStyle = '#15171A';
    if (dataUrl) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, w, h);
      img.src = dataUrl;
    }
  }

  const pt = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  canvas.addEventListener('pointerdown', (e) => {
    drawing = true;
    last = pt(e);
    canvas.setPointerCapture(e.pointerId);
    ctx.beginPath();
    ctx.arc(last.x, last.y, 1.2, 0, Math.PI * 2);
    ctx.fill();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = pt(e);
    const mid = { x: (last.x + p.x) / 2, y: (last.y + p.y) / 2 };
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.quadraticCurveTo(last.x, last.y, mid.x, mid.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last = p;
  });
  const end = () => {
    if (!drawing) return;
    drawing = false;
    onChange(canvas.toDataURL('image/png'));
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  return {
    setup,
    clear() {
      ctx.clearRect(0, 0, w, h);
      onChange(null);
    },
  };
}
```

- [ ] **Step 2: `pdf.js`**

```js
import { TERMS_VERSION, terms } from './config.js';
import { itemList } from './logic.js';

export function buildPdf(s, m, org) {
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
  let y = 22;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.text('Ontvangstbewijs', 20, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(`${m.docNo}   ${m.dateShort} ${m.timeShort}`, 190, y, { align: 'right' });
  y += 6; doc.setTextColor(90); doc.text(`Sleutels & alarmtags · ${org}`, 20, y); doc.setTextColor(0);
  y += 4; doc.setLineWidth(0.5); doc.line(20, y, 190, y); y += 10;

  doc.setFontSize(10);
  [['Ontvanger', s.name], ['Afdeling', s.dept || '—'], ['Uitgegeven', m.dateLong]].forEach(([k, v]) => {
    doc.setTextColor(90); doc.text(k, 20, y); doc.setTextColor(0); doc.text(v, 55, y); y += 6;
  });

  y += 6; doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text('MIDDEL', 20, y); doc.text('OMSCHRIJVING', 55, y); y += 2; doc.line(20, y, 190, y); y += 6;
  doc.setFontSize(10);
  itemList(s).forEach((it) => {
    doc.setFont('helvetica', 'bold'); doc.text(it.label, 20, y);
    doc.setFont('helvetica', 'normal'); doc.text(it.detail, 55, y);
    y += 3; doc.setDrawColor(210); doc.setLineWidth(0.2); doc.line(20, y, 190, y); doc.setDrawColor(0); y += 6;
  });

  y += 6; doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text(`VOORWAARDEN (v${TERMS_VERSION})`, 20, y); y += 5;
  doc.setFont('helvetica', 'normal');
  terms(org).forEach((t) => {
    const lines = doc.splitTextToSize(`${t.n}. ${t.title}. ${t.body}`, 170);
    doc.text(lines, 20, y);
    y += lines.length * 3.6 + 1.6;
  });

  y = Math.max(y + 10, 240);
  if (s.sig) {
    // Passend binnen 72×26 mm met behoud van verhouding (prototype rekte uit).
    const { width, height } = doc.getImageProperties(s.sig);
    const k = Math.min(72 / width, 26 / height);
    doc.addImage(s.sig, 'PNG', 20, y - height * k, width * k, height * k);
  }
  doc.setLineWidth(0.3); doc.line(20, y, 120, y); y += 5;
  doc.setFontSize(9); doc.text(s.name, 20, y);
  doc.setTextColor(90); doc.text(`Getekend ${m.dateShort} ${m.timeShort} · akkoord voorwaarden`, 20, y + 5);
  return doc.output('blob');
}

export async function shareFile(file, title, text) {
  const data = { files: [file] };
  if (title) data.title = title;
  if (text) data.text = text;
  if (navigator.canShare?.(data)) {
    await navigator.share(data);
    return 'shared';
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return 'downloaded';
}
```

- [ ] **Step 3: Syntax check**

Run: `node --check sign.js && node --check pdf.js && node test.mjs`
Expected: geen output van `--check`, daarna `OK`.

- [ ] **Step 4: PDF smoke test in de browser**

Met de dev-server uit Taak 3 actief, voer via `javascript_tool` op `http://localhost:8000/` uit:

```js
const { buildPdf } = await import('/pdf.js');
const { emptyIssue, meta } = await import('/logic.js');
const s = { ...emptyIssue(), name: 'Sanne de Vries', dept: 'Schoonmaak', building: 'B', keyNo: 'K-1042', tagOn: true, tagNo: '0417' };
const c = document.createElement('canvas'); c.width = 600; c.height = 200;
const x = c.getContext('2d'); x.lineWidth = 4; x.beginPath(); x.moveTo(40, 130); x.bezierCurveTo(200, 20, 300, 180, 560, 60); x.stroke();
s.sig = c.toDataURL();
const blob = buildPdf(s, meta(s.name, new Date(), 1), 'Facilitaire Dienst');
window.__pdfUrl = URL.createObjectURL(blob);
[blob.type, blob.size > 5000];
```
Expected: `["application/pdf", true]`. Open `window.__pdfUrl` in een nieuwe tab van de browserpane en screenshot: kop, gegevens, tabel met 2 rijen, 8 artikelen, handtekening niet uitgerekt boven de lijn, `€`, `–`, `·` en `ë` correct weergegeven.

- [ ] **Step 5: Commit**

```bash
git add sign.js pdf.js
git commit -m "Handtekening-canvas, PDF-opbouw en delen

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `store.js` + `app.js` + browsertest

**Model:** sonnet

**Files:**
- Create: `store.js`, `app.js`

**Interfaces:**
- Consumes: alles uit `config.js`, `logic.js`, `sign.js`, `pdf.js` (signatures hierboven) en het DOM-contract uit Taak 3.
- Produces: `store.js` exporteert `loadSettings() → settings`, `saveSettings(settings)`, `loadRecent() → item[]`, `saveRecent(item[])`, `putPdf(id, ArrayBuffer) → Promise`, `getPdf(id) → Promise<ArrayBuffer|undefined>`, `delPdf(id) → Promise`.

- [ ] **Step 1: `store.js`**

```js
import { DEFAULTS } from './config.js';

const KS = 'su.settings', KR = 'su.recent';
const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* opslag vol of geblokkeerd */ } };

export const loadSettings = () => ({ ...DEFAULTS, ...read(KS, {}) });
export const saveSettings = (s) => write(KS, s);
export const loadRecent = () => read(KR, []);
export const saveRecent = (r) => write(KR, r);

function db() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('su', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('pdfs');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction('pdfs', mode);
    const req = fn(t.objectStore('pdfs'));
    t.oncomplete = () => resolve(req.result);
    t.onerror = () => reject(t.error);
  });
}

// ponytail: ArrayBuffer i.p.v. Blob — Blobs in IndexedDB zijn op oudere iOS onbetrouwbaar.
export const putPdf = (id, buf) => tx('readwrite', (st) => st.put(buf, id));
export const getPdf = (id) => tx('readonly', (st) => st.get(id));
export const delPdf = (id) => tx('readwrite', (st) => st.delete(id));
```

- [ ] **Step 2: `app.js`**

```js
import { BUILDINGS, TERMS_VERSION, terms } from './config.js';
import { STEPS, emptyIssue, errors, itemList, meta, subject, mailBody, recentItems, formatWhen, prune, initials, settingsErrors } from './logic.js';
import { loadSettings, saveSettings, loadRecent, saveRecent, putPdf, getPdf, delPdf } from './store.js';
import { createSignature } from './sign.js';
import { buildPdf, shareFile } from './pdf.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const esc = (v) => String(v).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

let settings = loadSettings();
let draft = null; // ruwe invoer op het instellingenscherm
let recent = [];
let s = { step: 'home', ...emptyIssue(), sent: null };
let busy = false;
const pdfCache = new Map();

const sig = createSignature($('#sig'), (data) => { s.sig = data; s.touched = false; render(); });

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

function renderStatic() {
  $('#buildings').innerHTML = BUILDINGS.map((b) =>
    `<button class="radio" data-act="building" data-id="${esc(b.id)}"><span class="ring"></span><span class="col g1"><span class="bname">${esc(b.name)}</span><span class="baddr">${esc(b.addr)}</span></span></button>`).join('');
  const t = terms(settings.org);
  $('#terms').innerHTML = t.map((a) =>
    `<div class="art"><span class="artn">${a.n}</span><div class="col g4"><span class="artt">${esc(a.title)}</span><span class="artb">${esc(a.body)}</span></div></div>`).join('');
  $('#pg-terms').innerHTML = t.map((a) => `<span class="pg-term"><b>${a.n}. ${esc(a.title)}.</b> ${esc(a.body)}</span>`).join('');
}

function renderRecent() {
  $('#recent').innerHTML = recent.length
    ? recent.map((r) =>
      `<button class="rrow" data-act="resend" data-id="${esc(r.id)}"><span class="col g3 min0"><span class="rname">${esc(r.name)}</span><span class="rsub">${esc(r.items)}</span></span><span class="col g4 end"><span class="rwhen">${esc(formatWhen(r.when))}</span><span class="badge">Verzonden</span></span></button>`).join('')
    : '<div class="empty">Nog geen uitgiftes</div>';
}

function render() {
  const idx = STEPS.indexOf(s.step), e = errors(s), t = s.touched;
  const m = meta(s.name, s.now, settings.nextSeq);
  const shown = s.step === 'done' ? s.sent : m;
  const flag = (sel, cls, on) => $(sel).classList.toggle(cls, on);
  const showIf = (sel, on) => { $(sel).hidden = !on; };

  $$('[data-screen]').forEach((el) => { el.hidden = el.dataset.screen !== s.step; });
  $('#wizhead').hidden = idx < 0;
  $('#stepno').textContent = `STAP ${idx + 1} / 5`;
  $$('#progress i').forEach((el, i) => el.classList.toggle('on', i <= idx));

  const text = {
    org: settings.org, initials: initials(settings.org), email: settings.email,
    name: s.name, deptOrDash: s.dept || '—', dateLong: m.dateLong, fileName: m.fileName, termsVersion: TERMS_VERSION,
    dateShort: shown.dateShort, timeShort: shown.timeShort, docNo: shown.docNo,
  };
  $$('[data-text]').forEach((el) => { el.textContent = text[el.dataset.text]; });
  $$('[data-field]').forEach((el) => { if (el.value !== s[el.dataset.field]) el.value = s[el.dataset.field]; });

  // Ontvanger
  flag('#f-name', 'filled', !!s.name);
  flag('#f-name', 'err', t && e.recipient);
  showIf('#e-name', t && e.recipient);

  // Middelen
  flag('#keycard', 'on', s.keyOn);
  flag('#tagcard', 'on', s.tagOn);
  $('#keycard .mhead').setAttribute('aria-checked', s.keyOn);
  $('#tagcard .mhead').setAttribute('aria-checked', s.tagOn);
  $('#keybody').hidden = !s.keyOn;
  $('#tagbody').hidden = !s.tagOn;
  $$('#buildings .radio').forEach((el) => el.classList.toggle('sel', el.dataset.id === s.building));
  showIf('#e-items', t && !s.keyOn && !s.tagOn);
  showIf('#e-building', t && s.keyOn && !s.building);
  const keyBad = t && s.keyOn && !s.keyNo.trim();
  const tagBad = t && s.tagOn && !s.tagNo.trim();
  flag('#f-keyNo', 'err', keyBad); showIf('#e-keyNo', keyBad);
  flag('#f-tagNo', 'err', tagBad); showIf('#e-tagNo', tagBad);

  // Voorwaarden
  const canAgree = s.termsRead || !settings.requireScroll;
  flag('#agree', 'on', s.agreed);
  flag('#agree', 'locked', !canAgree);
  $('#agree').setAttribute('aria-checked', s.agreed);
  $('#agree-l').textContent = canAgree ? 'Ik heb de voorwaarden gelezen en ga akkoord' : 'Scroll de voorwaarden door om akkoord te geven';

  // Handtekening + PDF-voorbeeld
  const items = itemList(s);
  $('#summary').innerHTML = items.map((i) => `<div class="sumrow"><span class="suml">${esc(i.label)}</span><span class="sumd">${esc(i.detail)}</span></div>`).join('');
  $('#pg-items').innerHTML = items.map((i) => `<div class="pg-row"><b>${esc(i.label)}</b><span class="pg-mono">${esc(i.detail)}</span></div>`).join('');
  $('#sig-ph').hidden = !!s.sig;
  flag('#sigbox', 'err', t && !s.sig);
  showIf('#e-sig', t && !s.sig);
  $('#pg-sig').style.backgroundImage = s.sig ? `url(${s.sig})` : 'none';

  // CTA
  const labels = { recipient: 'Volgende', items: 'Naar voorwaarden', terms: 'Naar handtekening', sign: 'PDF bekijken', preview: 'Akkoord & verzenden', done: 'Nieuwe uitgifte' };
  $('#cta').hidden = !(idx >= 0 || s.step === 'done');
  $('#cta-edit').hidden = s.step !== 'preview';
  $('#cta-main').textContent = labels[s.step] || '';
  flag('#cta-main', 'blocked', (s.step === 'terms' && !s.agreed) || (s.step === 'sign' && !s.sig));
  flag('#cta-main', 'go', s.step === 'preview');

  // Instellingen
  if (draft) {
    const se = settingsErrors(draft);
    for (const k of ['org', 'email', 'nextSeq']) {
      const el = $(`#s-${k}`);
      if (el.value !== String(draft[k])) el.value = draft[k];
      el.classList.toggle('err', se[k]);
      showIf(`#e-s-${k}`, se[k]);
    }
  }
  flag('#s-scroll', 'on', settings.requireScroll);
  $('#s-scroll-row').setAttribute('aria-checked', settings.requireScroll);

  renderRecent();
}

function checkTermsRead() {
  const el = $('#tscroll');
  if (!s.termsRead && el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
    s.termsRead = true;
    render();
  }
}

function go(step) {
  s.step = step;
  s.touched = false;
  if (step !== 'settings') draft = null;
  render();
  $(`[data-screen="${step}"]`).scrollTop = 0;
  if (step === 'sign') sig.setup(s.sig);
  if (step === 'terms') checkTermsRead(); // korte tekst op groot scherm: niets te scrollen
}

function start() {
  s = { step: 'home', ...emptyIssue(new Date()), sent: null };
  renderStatic();
  $('#tscroll').scrollTop = 0;
  go('recipient');
}

function next() {
  if (s.step === 'done') return start();
  if (errors(s)[s.step]) { s.touched = true; return render(); }
  if (s.step === 'preview') return send();
  go(STEPS[STEPS.indexOf(s.step) + 1]);
}

function back() {
  if (s.step === 'settings') return go('home');
  const i = STEPS.indexOf(s.step);
  go(i <= 0 ? 'home' : STEPS[i - 1]);
}

function pdfFile(m) {
  return new File([buildPdf(s, m, settings.org)], m.fileName, { type: 'application/pdf' });
}

// Alles tot navigator.share() moet synchroon in de tik-handler blijven (iOS user activation).
async function send() {
  if (busy) return;
  busy = true;
  try {
    const m = meta(s.name, s.now, settings.nextSeq);
    const file = pdfFile(m);
    navigator.clipboard?.writeText(settings.email)?.catch(() => {});
    toast('Adres gekopieerd — plak in Aan');
    let how;
    try {
      how = await shareFile(file, subject(s), mailBody(s, m, settings.org));
    } catch (err) {
      if (err.name !== 'AbortError') toast('Delen mislukt. Probeer het opnieuw.');
      return;
    }
    if (how === 'downloaded') toast('Delen niet beschikbaar, PDF gedownload');
    const buf = await file.arrayBuffer();
    pdfCache.set(m.docNo, buf);
    try { await putPdf(m.docNo, buf); } catch { /* PDF is al gedeeld; alleen opnieuw delen vervalt */ }
    recent = [{ id: m.docNo, docNo: m.docNo, fileName: m.fileName, name: s.name, items: recentItems(s), when: new Date().toISOString() }, ...recent];
    saveRecent(recent);
    s.sent = { docNo: m.docNo, dateShort: m.dateShort, timeShort: m.timeShort };
    settings.nextSeq += 1;
    saveSettings(settings);
    go('done');
  } finally {
    busy = false;
  }
}

// ponytail: eerste tik laadt de PDF uit IndexedDB; verliest iOS daardoor de user activation,
// dan vraagt de toast om een tweede tik (dan uit cache, synchroon). Preload alles als dit stoort.
async function resend(id) {
  const r = recent.find((x) => x.id === id);
  if (r && !pdfCache.has(id)) { try { pdfCache.set(id, await getPdf(id)); } catch { /* niet beschikbaar */ } }
  const buf = pdfCache.get(id);
  if (!r || !buf) return toast('PDF niet meer beschikbaar');
  navigator.clipboard?.writeText(settings.email)?.catch(() => {});
  try {
    await shareFile(new File([buf], r.fileName, { type: 'application/pdf' }), `Ontvangstbewijs ${r.docNo}`);
  } catch (err) {
    if (err.name === 'NotAllowedError') toast('Tik nogmaals om te delen');
  }
}

const actions = {
  start, next, back,
  cancel: () => { s = { step: 'home', ...emptyIssue(), sent: null }; go('home'); },
  settings: () => { draft = { org: settings.org, email: settings.email, nextSeq: String(settings.nextSeq) }; go('settings'); },
  toggleKey: () => { s.keyOn = !s.keyOn; render(); },
  toggleTag: () => { s.tagOn = !s.tagOn; render(); },
  building: (el) => { s.building = el.dataset.id; render(); },
  agree: () => { if (s.termsRead || !settings.requireScroll) { s.agreed = !s.agreed; render(); } },
  clearSig: () => sig.clear(),
  download: () => { shareFile(pdfFile(meta(s.name, s.now, settings.nextSeq))).catch(() => {}); },
  resend: (el) => resend(el.dataset.id),
  toggleScroll: () => { settings.requireScroll = !settings.requireScroll; saveSettings(settings); render(); },
};

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (el) actions[el.dataset.act](el);
});

document.addEventListener('input', (ev) => {
  const f = ev.target.dataset.field;
  if (f) { s[f] = ev.target.value; return render(); }
  const k = ev.target.dataset.setting;
  if (k && draft) {
    draft[k] = ev.target.value;
    if (!settingsErrors(draft)[k]) {
      settings[k] = k === 'nextSeq' ? Number(draft[k]) : draft[k].trim();
      saveSettings(settings);
    }
    render();
  }
});

$('#tscroll').addEventListener('scroll', checkTermsRead, { passive: true });

const pruned = prune(loadRecent(), new Date());
recent = pruned.keep;
saveRecent(recent);
pruned.drop.forEach((id) => delPdf(id).catch(() => {}));

renderStatic();
render();
```

- [ ] **Step 3: Unit tests still pass**

Run: `node --check app.js && node --check store.js && node test.mjs`
Expected: `OK`

- [ ] **Step 4: Browser walkthrough (viewport 390×844)**

Herlaad `http://localhost:8000/`. Check `read_console_messages` met `onlyErrors: true` → leeg. Doorloop en screenshot elk scherm:

1. Start: "FACILITAIRE DIENST", avatar "FD", `beveiliging@organisatie.nl`, "Nog geen uitgiftes".
2. Avatar → Instellingen. Typ in mailadres `x` → foutmelding "Vul een geldig mailadres in.", rode rand. Typ `test@hondsrug.nl` → fout weg. Volgend documentnummer `0` → fout; `5` → ok. Terug → mailkaart toont `test@hondsrug.nl`. Herlaad pagina → waarde blijft.
3. Nieuwe uitgifte → "STAP 1 / 5", 1 segment zwart. "Volgende" zonder naam → rode rand + "Vul de naam van de ontvanger in." Naam `Sanne de Vries` → Volgende.
4. Middelen: sleutel aan, tag uit. Volgende → "Kies een gebouw." + "Vul het sleutelnummer in." Beide uitzetten → rode banner. Sleutel aan, Gebouw B, `K-1042`, tag aan, `0417` → Volgende.
5. Voorwaarden: akkoord-rij 55% opacity, tikken doet niets. Scroll `#tscroll` naar onderen → label "Ik heb de voorwaarden gelezen en ga akkoord", CTA nog grijs. Tik akkoord → groen, CTA zwart. Volgende.
6. Handtekening: samenvatting 2 rijen. Teken met `left_click_drag` over het canvas → placeholder weg. Wissen → placeholder terug. Opnieuw tekenen. Terug naar stap 3 en weer vooruit → handtekening staat er nog.
7. PDF-controle: bestandsnaam `Ontvangstbewijs_Sanne_de_Vries_<datum>.pdf`, docNo `UIT-<jaar>-0005`, handtekening zichtbaar in voorbeeld, groene CTA, knop "Wijzigen" gaat naar stap 4.
8. "Akkoord & verzenden": in desktop-browser opent het systeem-deelmenu of de PDF wordt gedownload. Annuleer het deelmenu → blijft op PDF-controle (teller ongewijzigd). Nogmaals en voltooien → Verzonden met `UIT-<jaar>-0005`. "Nieuwe uitgifte" → leeg formulier; Instellingen toont volgend nummer `6`.
9. Annuleren in de wizard → start, Recent toont "Sanne de Vries · Sleutel Gebouw B – Logistiek · Tag 0417 · Vandaag hh:mm".
10. Opschoning: zet via `javascript_tool` een item met `when` van 40 dagen geleden in `localStorage['su.recent']`, herlaad → item weg.

Herstel gevonden fouten in `app.js`/`style.css`/`index.html` voordat je commit.

- [ ] **Step 5: Commit**

```bash
git add store.js app.js
git commit -m "App: navigatie, validatie, instellingen, verzenden en recent

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: GitHub-repo + Pages

**Model:** haiku

**Files:** geen codewijzigingen.

Werkaccount is `hondsrugcollege-dev` (staat in `gh auth status`, niet actief). Persoonlijk account `RamonM77` is actief en moet dat na afloop weer zijn.

- [ ] **Step 1: Create public repo and push**

```bash
gh auth switch --user hondsrugcollege-dev
gh repo create hondsrugcollege-dev/sleutel-uitgifte --public --description "Uitgifte sleutels & alarmtags — ontvangstbewijs via Outlook" --source . --remote origin --push
```
Expected: URL `https://github.com/hondsrugcollege-dev/sleutel-uitgifte` en `main` gepusht.
Faalt alleen de push (403), run dan: `git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push -u origin main`.

- [ ] **Step 2: Enable Pages from `main` root**

```bash
gh api -X POST repos/hondsrugcollege-dev/sleutel-uitgifte/pages -f "source[branch]=main" -f "source[path]=/"
```
Expected: JSON met `"html_url": "https://hondsrugcollege-dev.github.io/sleutel-uitgifte/"`.

- [ ] **Step 3: Switch back to personal account**

```bash
gh auth switch --user RamonM77
gh auth status | grep -A1 "RamonM77"
```
Expected: `Active account: true` bij RamonM77. Doe deze stap ook als Step 1 of 2 faalde.

- [ ] **Step 4: Wait for build and verify**

Herhaal maximaal 10× met 30 s ertussen tot `built`:
```bash
GH_TOKEN=$(gh auth token -u hondsrugcollege-dev) gh api repos/hondsrugcollege-dev/sleutel-uitgifte/pages --jq .status
```
Daarna:
```bash
curl -sI https://hondsrugcollege-dev.github.io/sleutel-uitgifte/ | head -1
curl -sI https://hondsrugcollege-dev.github.io/sleutel-uitgifte/app.js | grep -i content-type
```
Expected: `HTTP/2 200` en `content-type: application/javascript`.

---

### Task 7: Eindreview tegen spec en ontwerp

**Model:** opus

**Files:** alleen fixes waar nodig.

- [ ] **Step 1: Spec-dekking**

Lees de spec en loop elke sectie langs (Schermen 1–8, State, Validatie, Handtekening, PDF, Versturen stap 1–6, Opschoning). Noteer per eis het bestand:regel waar die is geïmplementeerd. Ontbreekt iets of wijkt het af? Fix het, met een eigen commit.

- [ ] **Step 2: Ontwerp-vergelijking**

Haal `Sleutel Uitgifte.dc.html` op via `DesignSync get_file` (project `ddaabd1a-a282-483a-b2ce-44b2e55d6654`). Open de live site `https://hondsrugcollege-dev.github.io/sleutel-uitgifte/` in de browserpane op 390×844 en vergelijk per scherm: maten, kleuren, teksten (letterlijk), spacing. Fix afwijkingen.

- [ ] **Step 3: Tests + push**

```bash
node test.mjs
gh auth switch --user hondsrugcollege-dev && git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push; gh auth switch --user RamonM77
```
Expected: `OK`, push geslaagd, RamonM77 weer actief.

- [ ] **Step 4: iPhone-checklist aan de gebruiker geven**

Dit kan alleen de gebruiker op een echt toestel doen. Lever deze lijst op:
1. Open `https://hondsrugcollege-dev.github.io/sleutel-uitgifte/` in Safari → Deel → "Zet op beginscherm". Open vanaf het beginscherm: geen Safari-balk, icoon zichtbaar.
2. Teken met de vinger: lijn volgt vloeiend, pagina scrolt niet mee.
3. "Akkoord & verzenden" → deelmenu opent met PDF → kies Outlook → bijlage aanwezig? Onderwerp/body ingevuld? Plak adres in "Aan" werkt?
4. Terug in de app → "Verzonden".
5. Op start: tik recent item → deelmenu opent met dezelfde PDF (zo nodig na tweede tik).
6. Open de PDF in Outlook: handtekening, €-teken en ë correct.
