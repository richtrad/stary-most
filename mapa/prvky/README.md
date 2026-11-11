# Drobné prvky historického Mostu

Stav 11. 11. 2026: 70 pracovních prvků v 10 oblastech. Přehledová mřížka má 40 oblastí po 600 × 600 m; 13 oblastí bylo otevřeno také v rozlišení podkladu. Evidence neznamená úplný soupis všech historických objektů.

- `prvky.json`: souřadnice v místním systému atlasu, geometrie, autorství, zdrojový výřez a nejistoty.
- `prvky.geojson`: stejný soupis ve WGS84, místní geometrie a počátek S-JTSK zůstávají v properties.
- `pruzkum.json`: stav oblastí, rozhodnutí o 29 kandidátech dvorů a vyřazené zákresy.
- `plan_search.json`: rozsah hledání plánů a omezení dostupnosti stavebních příloh.
- `modely.js`: sdílená geometrie pro autorské pohledy Claude a GPT.

Základní podklad: městské ortofoto 1964, Georeal Plzeň, podkladová data © MO ČR. Exporty po 1440 px / 600 m mají 2,4 výstupního pixelu na metr; toto číslo neurčuje rozlišení negativu. Public repo neobsahuje původní archivní rastrové reprodukce této dávky.

Nejprve se prohlédne plán a původní snímek, potom se ručně zakreslí čitelný prvek. Automatické uzavření prostorů mezi GIS domy vytvořilo pouze kandidáty. Z 29 kandidátů dvorů bylo po vizuální kontrole použito 10; obrys se dále stáhl od střech. Povrchy vylučují půdorysy známých domů. Tři další návrhy střech byly vyřazeny jako duplicity a pět zákresů po kontrole detailu.

Hranice pozemků mají symbolickou výšku 0,12 m. Není tím tvrzena existence plotu, zdi či živého plotu. Dva úseky opěrné zdi u nádraží mají podporu fotografie foto-12, ovšem jejich přesné konce, tloušťka a výška zůstávají odhadem. Dvě anonymní drobné stavby jsou jednoduché pracovní objemy s rovnou střešní plochou a odhadnutou výškou 2,4 m, bez ověřeného čp., parcely a stavebních detailů. Nové dopravní ostrůvky tato dávka neobsahuje.

Autor interpretace a geometrie: OpenAI · Codex (rodina GPT-6). Přesný identifikátor běžícího modelu nebyl zpřístupněn. Tato evidence nemění autorství původních modelů Claude a GPT.

V prohlížeči funguje výběr oblasti (`sektor=3B`), přiblížení jednotlivého objektu (`detail=…`), přepínání kategorií a zdrojová karta s ortofotem a plány včetně Granznerova plánu. Geometrie používá odstup výšek povrchů a stávající logaritmický hloubkový buffer.

Kontrola této dávky: vizuální překryvy všech publikovaných zákresů, osm osových/šikmých pohledů obou pracovních stavebních hmot bez textur, 70 geometrických kontrol výběru a viditelnosti, skutečné kliknutí v atlasu a otevření pramene. Jde o ověření funkční pracovní vizualizace; historické přijetí všech tvarů, výšek a materiálů tím není provedeno.
