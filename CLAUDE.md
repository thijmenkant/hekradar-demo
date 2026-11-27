# RekRadar demo – werkafspraken

Demo van RekRadar voor Henk van der Zouwen (Fietsenrekhuren.com, Almkerk). Live via GitHub Pages: https://thijmenkant.github.io/hekradar-demo/

## Taal en houding
- Nederlands, informeel en direct. Eerst kritisch (wat klopt niet, wat ontbreekt), dan pas helpen. Geen "goed idee" uit beleefdheid.
- Grote bouwtaken: eerst brainstorm, dan plan, dan bouwen. Kleine wijzigingen: gewoon doen, niet bij elk detail om toestemming vragen.

## Harde regels
- Geen sleutels, tokens of wachtwoorden in de code of in de chat. De repo is openbaar.
- Henks klantenlijst wordt niet gebruikt. Alle klanten en organisaties in de demo zijn verzonnen (adressen op .voorbeeld).
- Niets automatisch versturen: Henk verstuurt elke mail zelf met één klik.
- Geen fictieve functies: alleen tonen wat echt werkt of duidelijk als voorbeeld gemarkeerd is.
- Commerciële logica (prijzen, annuleringsregels), data, mailboxrechten en externe koppelingen niet veranderen zonder toestemming van Thijmen.
- Demo en echte interface mogen niet uit elkaar groeien.

## Bestanden
- `src/kop.html` – CSS en skelet (opent met `<script>`)
- `src/logica.js` – data en rekenwerk (kans, afstanden, LOC-coördinaten)
- `src/schermen.js` – alle schermen en klik-afhandeling, ook het boekformulier met PDOK-kaart (Leaflet, luchtfoto, losplek-pin, bouwplek tekenen)
- `index.html` – GEBOUWD bestand, niet met de hand aanpassen

## Werkwijze bij elke wijziging
1. Pas aan in `src/`.
2. `python3 src/build.py`
3. `npm test` (eerste keer: `npm install && npx playwright install chromium`). Alle tests moeten slagen.
4. Commit en push naar `main`; na ongeveer een minuut staat het live.

## Kaarten
- Adres zoeken: PDOK Locatieserver (gratis, geen sleutel). Luchtfoto en kaart: PDOK-tegels. Geen Google Maps-API.
- In een Claude-artifactvenster worden kaarten geblokkeerd; daar valt de pagina terug op een schets met een gele melding. Dat is bedoeld.
