# Dobová vozidla

První sada (2026-11-11): dva modely Škoda 706 RTO u starého nádraží a jeden neurčený osobní automobil na I. náměstí. Všechny tři odečty mají stav provisional, confidence probable a locked false.

- `vozidla.json` uchovává polohu, podélnou osu, autora, zdrojový výřez, jeho SHA-256 a oddělené nejistoty polohy, typu, rozměrů a materiálů.
- Souřadnice scény: worldX = EPSG:5514 X − originX; worldZ = originY − EPSG:5514 Y. Příď modelu míří v lokální soustavě k −Z. Bearing je úhel po směru hodinových ručiček od mřížkového severu; rotace Three.js je záporná. Směr přídě z leteckého odečtu není ověřený.
- `vozidla.geojson` je GIS export modelových půdorysů do EPSG:4326, s původním středem v S-JTSK v properties.
- `modely.js` vytváří parametrickou geometrii, kterou sdílejí pohledy Claude i GPT. Autor: OpenAI · Codex, rodina GPT-6; přesné runtime ID není zpřístupněné.
- Katalog vozidel je samostatný, aby jej nepřepsal sestavovací skript celoměstských ploch. Při změně katalogu aktualizujte GeoJSON a ověřte celý otočený obrys proti půdorysům budov.
- Odkaz `../?view=street&street=128&vozidlo=rto-nadrazi-1` přiblíží autobus. Kliknutí otevře letecký podklad; karta navíc odkazuje na nedatovanou fotografii nádraží a typový pramen.
- Městské ortofoto při příliš podrobném požadavku vrací „MAP OUT“. Modul podkladů omezuje požadavek na 5 výstupních pixelů na metr a výřez zvětšuje až na plátně. Tento údaj není fyzické rozlišení negativu.

Rozměry RTO vycházejí z veřejné dokumentace historického vozu Dopravního podniku Ostrava. Konkrétní podtyp mosteckých vozidel, rozložení detailů, barvy a směr přídě jsou modelové hypotézy. Nedatovaný snímek před nádražím neprokazuje identitu konkrétních vozů v ortofotu 1964. Fotografie II. náměstí z roku 1975 nebyla použita pro rozmístění do roku 1964. Nepřidáváme nápisy, čísla linek ani vozidel bez pramene.

Ověření této sady: kontrola rozměrů a normál, výběru paprskem, skryté vrstvy; nulový průnik tří modelových půdorysů s budovami. V prohlížeči ověřeny oba RTO, osobní auto, otočení pohledu, přepnutí viditelnosti, přiblížení a zdrojové karty. Technické ověření nemění historický stav provisional.
