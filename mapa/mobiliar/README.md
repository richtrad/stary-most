# Další ulice: první fotografické prvky · 11. 11. 2026

Devět nových objektů z pěti původních pramenů rozšiřuje pilot na Šmeralovo náměstí, Minoritskou, U jeptišek a Dobrovolců / Kostelní náměstí. Celkem vrstva obsahuje 28 objektů: 23 procedurálních GPT/Codex a pět původních Claude Opus 5.5 GLB. Původních 19 záznamů a pět Claudeových souborů zůstávají zachované.

- Šmeralovo náměstí: vysoká lampa a plakátovací sloup ze starší tištěné pohlednice.
- Minoritská a fronta u čp. 169: nástěnné svítidlo, dřevěný sloup a konzola s izolátory.
- U jeptišek: dvě nástěnné lampy a trojice izolátorů pod okapem.
- Dobrovolců / Kostelní náměstí: viditelný úsek nízkého zábradlí u děkanského kostela.

Každá fotografie tvoří vlastní nedatovanou scénu. Přesný rok, neznámé rozměry a materiálové barvy se neodvozují automaticky z typu předmětu. Přiřazení lampy k čp. 271 a prvků U jeptišek k jednotlivým domům jsou pracovní interpretace sousednosti; nejistota polohy je uvedena jednotlivě. Barvy starší pohlednice jsou tisk, nikoli barevná materiálová reference. Zábradlí se neprodlužuje do neviděných částí a elektrické sítě se nedoplňují mimo doložený detail.

Před modelováním byly otevřeny situační plány čp. 167/168, 169, 254, 256/257, kláštera čp. 228 a stavební listy čp. 271. Dohromady byly ve čtyřech aktuálních metadatových soupisech nalezeny 217 přílohové vazby na plány; nejde o 217 jedinečných otevřených listů. Obnovená Libuše byla využita jedním cíleným GET původního snímku U jeptišek (7 590 622 B), s limitem jednoho požadavku a nejméně 10 s mezi přenosy. Ostatní podklady pocházejí z ověřených místních kopií.

Čekárna a dispečerská věž v proluce po čp. 256, projektovaný dvorní komín čp. 651 z roku 1931 a vzdálené autobusy čekají na dataci či přesnější registraci. Nejsou vydávány za dokončené modely. Ulice s prvním doplněním stále vyžadují další průzkum; [fronta 132 úseků](postup.html) zachovává tento rozdíl.

Nové objekty: OpenAI · Codex, rodina GPT-6, přesné backendové ID není dostupné. Společná fotografická vrstva prostředí zachovává autora každého prvku; změna autora domů nepřipisuje GPT objekty Claudovi. Fasády ani domovní modely se v této dávce neměnily. Soukromé originály jsou nadále připojovány pouze lokálně s ověřením SHA-256; veřejný repozitář obsahuje jen identifikaci pramenů, geometrii a evidenci.

Kontrola v prohlížeči: všech devět prvků v detailu a šikmém pohledu, správné originály s ověřeným SHA-256 u všech devíti karet, přepínání ulic a autorů a kliknutí na prvek ve 3D. Výšky, rozměry a přesné polohy zůstávají odhady; tato kontrola nepotvrzuje historickou přesnost.

---

## Zachovaný záznam pilotu Kulové

# Kulová: mobiliář z původních fotografií

Pilot z 11. listopadu 2026 obsahuje **19 objektů podle šesti původních snímků Libuše**. Kliknutí na objekt otevře kartu konkrétní fotografie. Výběr fotografické scény odděluje 1957–58, nedatovaný pohled dolů Kulovou, přibližně 1968, březen 1969 a přibližně 1900–1910.

Přepínač mění pouze tento mobiliář a vozidla. Budovy a okolní terén jsou kontext z více pramenů, zejména z roku 1964; nejde o kompletní rekonstrukci města ke každému datu.

## Autorství

| Autor geometrie | Počet | Rozsah |
| --- | ---: | --- |
| Anthropic · Claude Opus 5.5, deklarované ID `claude-opus-5-5` | 5 | dvě popelnice, lavička, ochranný sloupek, plakátovací sloup kolem 1900 |
| OpenAI · Codex, rodina GPT-6 | 14 | zábradlí, schodišťová podnož, tři lampy, elektrický sloup a konzola, plakátovací sloup, dvě lavičky, dva dopravní prvky, autobus a užitkové vozidlo |

Přesné backendové ID tohoto běhu Codexu není dostupné. Usazení, příjem Claudeových geometrií, nové čtení pramenů a webovou integraci provedl Codex 11. 11. 2026. Autorství je také u každého jednotlivého objektu v `mobiliar.json` a GeoJSON.

Pět Claudeových GLB vzniklo bezeztrátovým výběrem původních uzlů, bez přetvarování geometrie. Každý obsahuje původní SHA-256 a prefix uzlů. Ve scéně se pouze usazuje k povrchu; geometrie zůstává Claudeova. Příjem se týká jen těchto pěti objektů, nikoli všech domů úkolu `KULOVA_CLAUDE_CLOSURE_20261105_01`.

Souhrnný manifest Claudeovy dávky nesouhlasil s dříve deklarovaným hashem. Oba jednotlivé zdrojové GLB souhlasily; přejímka je proto omezena na jejich samostatně ověřené bajty. Původní rozpracované varianty se nemažou.

## Co fotografie skutečně dokládají

- S01: plakátovací sloup na rohu u čp. 266; přibližná datace 1900–1910.
- S02: elektrické sloupy, malá lampa a ochranný sloupek; na kartě III. 1969.
- S03: popelnice, lavička a zákaz vjezdu; na kartě **1957–58**, opraveno starší neurčité označení „1960s“.
- S11: oboustranné zábradlí a lampa schodiště za školou; na kartě ~1968.
- S16: dlouhé nástěnné svítidlo, elektrická konzola a světlé užitkové vozidlo. Rok a typ vozidla nejsou doložené. Plán potvrdil lampu na **čp. 260**, nikoli 262; protější nároží je čp. 259.
- S27: autobus, střešní nosič, plakátovací sloup, nízké zábradlí, lavičky a označník stanoviště; na kartě **1957–58**.

Úplná archivní ID, názvy, počty bajtů a SHA-256 jsou v katalogu. Barevné nebo generované odvozeniny se nepoužily jako důkaz původní podoby mobiliáře.

Autobus je interpretován jako **pravděpodobná Škoda 706 RO**. Rozměrovou analogii poskytuje [Technické muzeum v Brně](https://expozicemhd.cz/exponaty/autobusy/skoda-706-ro/); muzejní vůz není identitou vozu na mostecké fotografii. Stávající RTO v jiné městské vrstvě zůstávají samostatné.

## Poloha a nejistota

Před modelováním byly otevřeny situační plány bloků 260–263 a 256–257 a porovnány s původními fotografiemi a publikovanými GIS půdorysy. Plány zde určují sousednost a uliční orientaci, nikoli neznámé metrické rozměry mobiliáře.

Živé API při aktuálním ověření odmítalo TCP spojení. Rozsah hledání a datum použitých místních snapshotů (17. 10. a 5. 11. 2026) uvádí `plan_search.json`. Nedostupnost API neznamená, že další podklady neexistují.

Poloha je odečet z vazeb na fasády, běžně s odhadovanou nejistotou ±1 až ±4 m, u vzdáleného vozidla ±8 m. Výšky, nedoložené boky, barvy a skryté detaily jsou modelové hypotézy (`provisional`, `locked:false`). Barva není určena černobílým snímkem. Nečitelné plakáty, SPZ, linková čísla a loga se nevymýšlejí.

Schodiště je orientační podnož doloženého zábradlí: neznáme přesný výškový profil ani počet stupňů. Nadhled ukazuje úzký koridor podél školy; okolní půdorysy zahrnují i objekty z jiného období.

## Otevření původního snímku

Soukromé archivní skeny nejsou součástí veřejného repozitáře. V panelu **Připojit vlastní archivní snímky** lze vybrat více originálů naráz. Prohlížeč ověří velikost a SHA-256, soubory neodesílá na server. Následné kliknutí na objekt otevře připojený originál. Bez místní kopie karta nabídne evidenci Libuše a přesnou identitu souboru.

Dočasný soukromý náhled může stejné soubory poskytovat pouze na localhostu; tato funkce nepublikuje skeny ani přístupový token.

## Technická podoba

- `mobiliar.json`: jednotlivé objekty, epochy, autoři, zdroje a nejistoty.
- `mobiliar.geojson`: bodové kotvy v EPSG:5514; u dlouhého zábradlí jde o kotvu, nikoli geodeticky zaměřenou stopu.
- `modely.js`: editovatelné procedurální geometrie GPT/Codexu.
- `modely/*.glb`: pět vybraných původních Claudeových geometrií.
- Dosednutí se vypočítává z existujících výškových rovin chodníků. Fasády zůstávají beze změny.
- Ovládání obsahuje volbu epochy, druhu objektu a autora, vypnutí vrstvy, přiblížení jednotlivého prvku a kliknutí na jeho pramen.

Vizuální QA a pracovní originály jsou uchovány odděleně od veřejných souborů na E a F. Technické načtení není historickým schválením; nejistoty zůstávají viditelné.
