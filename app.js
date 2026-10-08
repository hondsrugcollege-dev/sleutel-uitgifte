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
