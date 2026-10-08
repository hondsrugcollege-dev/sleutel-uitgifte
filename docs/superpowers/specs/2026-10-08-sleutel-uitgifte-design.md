# Sleutel Uitgifte — ontwerp

Datum: 2026-10-08 · Bron: Claude Design-project `ddaabd1a-a282-483a-b2ce-44b2e55d6654`, bestand `Sleutel Uitgifte.dc.html` (+ `design_handoff_sleutel_uitgifte/README.md`).

## Doel
Mobiele web-app (iPhone in beheer van facilitair) waarmee een ontvanger tekent voor ontvangst van een toegangssleutel en/of alarmtag. Het ontvangstbewijs (PDF) gaat via het iOS-deelmenu naar Outlook, gericht aan een instelbaar mailadres. App-teksten in het Nederlands.

## Besluiten
| # | Besluit |
|---|---------|
| Platform | Alleen iOS (Safari / beginscherm-PWA) |
| Stack | Statische PWA, vanilla HTML/CSS/JS, geen build-stap, geen framework |
| Backend | Geen. Alles lokaal op het toestel |
| Offline | Niet vereist; geen service worker. jsPDF via cdnjs, Geist via Google Fonts |
| Hosting | Publieke repo `hondsrugcollege-dev/sleutel-uitgifte`, GitHub Pages vanaf `main` root |
| "Verzonden" | Scherm blijft zoals ontwerp; getoond nadat het deelmenu succesvol sluit |
| Prototype-chrome | Telefoonframe, "Spring naar scherm", demovulling en Outlook-simulatie vervallen |
| PDF-opslag | PDF's 30 dagen in IndexedDB voor opnieuw delen, daarna automatisch gewist |
| Instellingen | Eigen scherm; geen pincode |
| Gebouwen/voorwaarden | In `config.js`; wijziging = nieuwe voorwaardenversie + redeploy |

## Bestanden
- `index.html` — alle schermen als `<section data-screen="…">`, één zichtbaar; CSS inline in `<style>`.
- `app.js` — state, navigatie, validatie, handtekening, PDF, delen, opslag.
- `config.js` — `BUILDINGS`, `TERMS_VERSION` (`2026.1`), `TERMS` (8 artikelen uit prototype `terms()`), `DEFAULTS`.
- `manifest.webmanifest` + `icon.png` (180×180) — beginscherm.
- `test.html` — assert-checks op pure logica.

## Schermen
Volgen het ontwerp pixelgetrouw (tokens, maten, kleuren uit de README). Viewport-referentie 390×844; op brede schermen gecentreerd, max-breedte 480px. Safe-area-insets via `env(safe-area-inset-*)` in plaats van de nep-statusbalk.

1. **Start** — organisatienaam, avatar met initialen (afgeleid uit organisatienaam), titel, CTA "Nieuwe uitgifte", mailadreskaart (alleen-lezen, "Wijzig" → Instellingen), "Recent verzonden". Lege staat: "Nog geen uitgiftes". Tik op recente regel → bijbehorende PDF opnieuw delen (zolang bewaard; anders melding "PDF niet meer beschikbaar").
2. **Ontvanger** (stap 1/5), 3. **Middelen** (2/5), 4. **Voorwaarden** (3/5), 5. **Handtekening** (4/5), 6. **PDF-controle** (5/5), 7. **Verzonden** — exact zoals ontwerp/README.
8. **Instellingen** (nieuw, stijl van wizardvelden; header met terugknop, titel "Instellingen"):
   - Organisatienaam (tekst)
   - Mailadres ontvangstbewijzen (`type=email`)
   - Volgend documentnummer (`inputmode=numeric`, geheel getal ≥ 1)
   - Schakelaar "Voorwaarden eerst doorscrollen" (standaard aan)
   - Opslaan bij elke wijziging (`input`-event). Validatie: leeg mailadres of ongeldig nummer → foutmelding, waarde niet opgeslagen.
   - Openen via avatar en via "Wijzig" op mailadreskaart.

## State
```
step: home | recipient | items | terms | sign | preview | done | settings
name, dept, keyOn(true), building, keyNo, tagOn(false), tagNo
termsRead, agreed, sig (PNG dataURL), touched, now (vast bij start)
settings: { org, email, nextSeq, requireScroll }   → localStorage 'su.settings'
recent: [{ id, name, items, when(ISO), docNo }]     → localStorage 'su.recent'
pdfs: { id → Blob }                                  → IndexedDB 'su' / store 'pdfs'
```
Standaardwaarden (`DEFAULTS`): org "Facilitaire Dienst", email "beveiliging@organisatie.nl", nextSeq 1, requireScroll true.

Documentnummer: `UIT-{jaar van now}-{nextSeq, 4 cijfers}`. Teller loopt door, geen reset per jaar.
Bestandsnaam: `Ontvangstbewijs_{Naam_Met_Underscores}_{jjjj-mm-dd}.pdf`.
Onderwerp en body: zoals README.

## Validatie
Zoals prototype `errors()`: naam niet leeg · minimaal één middel · sleutel ⇒ gebouw + nummer · tag ⇒ nummer · akkoord · handtekening. Fouten pas na tik op CTA (`touched`). CTA grijs op Voorwaarden/Handtekening zolang niet voldaan. Akkoord pas tikbaar na doorscrollen (marge 24px) als `requireScroll` aan staat.

## Handtekening
Canvas zoals prototype `sigRef`: pointer events, devicePixelRatio, lijn 2.6, quadratic smoothing, `touch-action:none`. Opslaan als PNG-dataURL bij `pointerup`; teruggezet bij terugnavigeren. "Wissen" leegt.

## PDF
jsPDF, layout identiek aan prototype `downloadPdf()`, maar retourneert een `Blob` (`doc.output('blob')`). Voorwaardenversie uit `config.js` in kop en tekst. De voorbeeldweergave op PDF-controle is HTML zoals in het ontwerp. Downloadknop rechtsboven = zelfde deelactie zonder status te wijzigen.

## Versturen (iOS)
"Akkoord & verzenden":
1. PDF-blob maken.
2. Mailadres naar klembord (`navigator.clipboard.writeText`), toast "Adres gekopieerd — plak in Aan".
3. `navigator.share({ files:[File], title: onderwerp, text: body })`.
4. Succes → PDF + recent-item opslaan, `nextSeq`+1, naar **Verzonden**.
5. `AbortError` → blijven op PDF-controle, niets opgeslagen, teller ongewijzigd.
6. `navigator.canShare({files})` false → PDF downloaden (`<a download>`) + toast "Delen niet beschikbaar, PDF gedownload"; verder als succes.

Let op: stap 2 en 3 moeten in dezelfde user-gesture blijven; PDF-generatie is synchroon dus dat kan.

## Opschoning
Bij app-start: recent-items en PDF's met `when` ouder dan 30 dagen verwijderen.

## Testen
- `test.html` + `assert`-checks: `errors()` per stap, `docNo`/bestandsnaam, onderwerp, opschoning (`prune(recent, now)`), initialen.
- Visueel in browser (390×844) tegen ontwerp-screenshots.
- Op iPhone: deelmenu → Outlook (bijlage aanwezig; nagaan of onderwerp/body meekomen).

## Buiten scope
Backend, offline, pincode, meerdere toestellen met gedeelde teller, beheer van gebouwen/voorwaarden in de app.
