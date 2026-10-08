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
assert.equal(meta('Jose\u0301', now, 1).fileName, 'Ontvangstbewijs_Jos\u00e9_2026-10-08.pdf');
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
assert.equal(formatWhen('rommel', now), '');

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
assert.deepEqual(prune([{ id: 'x', when: 'kapot' }, { id: 'y' }], now), { keep: [{ id: 'x', when: 'kapot' }, { id: 'y' }], drop: [] });

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
