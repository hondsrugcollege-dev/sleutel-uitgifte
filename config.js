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
  nextSeqIn: 1,
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
