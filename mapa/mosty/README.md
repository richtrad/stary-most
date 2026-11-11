# Mosty přes tok a náhon
Doplnění atlasu 11. 11. 2026: osm přechodů v centrálním vodním koridoru.

Poloha je odečtená z orientačního plánu 50. let a porovnaná s plánem města z roku 1938 a městským ortofotem 1964. Mapa: Mapový archiv města Mostu. Odkazy na konkrétní výřezy a SHA-256 použitých podkladů obsahuje [katalog](mosty.json).

## Rozsah a jistota
Most u Smetanova náměstí, u Jungmannových sadů, přes náhon u Římské, náměstí gen. Svobody, Jiráskovy a Poštovské, přes hlavní tok v Škroupově (dnešní pojmenování uličního záznamu Kapitána Jaroše) a U Kamenného mostu. Názvy jsou orientační lokátory; nejsou katalogem ověřených historických názvů mostů.

Plán dokládá topologii přechodů. Zábradlí, materiál, výška, konstrukční typ a přesné rozměry nejsou doloženy konstrukčním výkresem. Model je proto schematický, provisional, locked: false, historicalAcceptance: false. Ortofoto slouží ke kontrole uliční návaznosti; malé konstrukční detaily nerozlišuje. Hodnota deckHeight 0,30 m je výhradně výška nad normalizovanou rovinou zobrazení, nikoli historicky zaměřená světlá výška nad hladinou.

Jeden kandidát v severní Tyršově zůstal odložený kvůli nejednoznačnému zobrazení. Železniční křížení a další nejasné propustky mimo tento soupis nebyly dokončeny. V tomto průchodu byly hledány dostupné místní plánové podklady a existující veřejné fotografické záznamy; živá databáze Libuše nebyla prohledávána. Nenalezení konstrukčních výkresů v tomto rozsahu není důkazem jejich neexistence.

## Autor a vrstvy
Odečet a procedurální 3D model: OpenAI · Codex, rodina GPT-6. Přesný identifikátor varianty běhu není zpřístupněn; nevydáváme rodinu za přesný model. Mosty jsou společná vrstva prostředí pro přepínání budov Claude/GPT. Autorské vrstvy domů a jejich původní označení zůstaly zachovány.

## Ovládání a data
V Městských vrstvách je přepínač Mosty a přechody a výběr Mosty přes tok a náhon. Výběr přiblíží most a otevře podklad. Kliknutí na mostovku nebo zábradlí otevírá stejný doklad. Vypnutí zákresů z 50. let skryje i tuto datovanou vrstvu.

[Katalog](mosty.json) obsahuje rozměry a původ každého záznamu. [GeoJSON EPSG:5514](mosty.geojson) obsahuje půdorysy mostovek. Modely generuje modely.js; mostovka, nízké nájezdy, koncové opěry a otevřené zábradlí jsou odhadnuté, bez domyšlených oblouků a pilířů v toku.

## Kontrola
Všech osm prvků bylo skutečně otevřeno v místním WebGL atlasu, včetně dialogů pramenů. Ověřeno přesné přiblížení, skrytí vrstvy, datový filtr a zachování mostů při přepnutí Claude/GPT. Zkouška přímého kliknutí na lávku u Jiráskovy otevřela odpovídající plán. Kontrola půdorysů mostovek i nájezdů proti aktuálním půdorysům budov nezjistila průnik. Tento technický test nepotvrzuje historickou přesnost ani geodetickou přesnost plánů.

Původní vodní polygony jsou ponechány; malé bílé mezery mezi jejich zjednodušenými okraji a mostovkou nejsou dokladem přerušení toku. Břehy a výškový profil vody vyžadují samostatné zpřesnění. Fasády, dosavadní stromy a předchozí modely nebyly v této dávce změněny.
