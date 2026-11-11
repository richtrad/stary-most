# Střechy a dvory · 11. listopadu 2026

Nová pracovní vrstva GPT: 19 domů, 13 dvorů/zahrad. Celá Kulová a ústí do Šmeralova náměstí, navíc čp. 256 a 268–270 v navazujícím bloku. Fasády mají pouze neutrální materiály. Čp. 154 je výslovně hypotéza.

## Autoři a verze

- gpt-roofs.json a kulova_gpt_roofs_v1.glb: nová geometrie OpenAI Codex, rodina GPT-6; přesný backend není zpřístupněn. Vychází z původních plánů, fotografií, GIS, leteckého snímku a rozměrových studií Clauda. Autor předchozí studie a její SHA-256 jsou u domu.
- claude-roofs.json: 15 původních modelů Clauda Opus 5.5, předchozí lineage pilotu zahrnuje Claude Fable 5.1. Geometrie zachována, materiály a export do webu provedl Codex. Čp. 267 používá skutečnou variantu Claude r7, nikoli GPT model z míchané uliční sestavy.
- mesto-strechy.json: starší procedurální generátor projektu, přesný model autora neevidován. 1 334 použitelných záznamů, 19 nahrazeno novou skupinou, tedy 1 315 zobrazených okolních střech; 66 plochých/nezdařených výsledků vynecháno. Jde o neověřenou orientační vrstvu, nikoli individuální rekonstrukci z leteckých snímků.
- Starší detailní pilotní GLB 261, 262 a 267 zůstávají ve fasádním režimu a mají vlastní autorské údaje.

## Podklady a míra jistoty

Povinná rešerše plánů proběhla nejdříve, nad místními snapshoty 17. 10. a 5. 11. 2026. Libuše v tomto běhu nebyla dotazována. Nedostupnost API není důkazem absence plánů. Soukromá podrobná rešerše je uložena jako plan_search.json v pracovním balíku.

Otevřeny byly tři blokové plány, plány čp. 263 (říjen 1910), 259 (1871), 1608 (20. 8. 1928), 266 (26. 9. 1927), původní uliční fotografie a letecký detail z 16. 4. 1964 (WMSA08.1964.MOST63.00041). Příloha 1608 není datována 1908; originál uvádí 1928 a parcelu 262/2. Přiřazení podle databáze, situace a morfologie zůstává zaznamenáno.

Střešní členění, otevřené dvory, ploché přístavby, štíty/valby, komíny a vikýře se opírají o viditelné prameny. Přesné rozměry většiny zadních křídel, výšky, zahradní hranice a povrchové barvy jsou odhady. Výška čp. 263 vychází z řezu 1910: 6,45 + 5,70 m, platnost v roce 1964 není definitivně potvrzena. Detaily z fotografie březen 1969 jsou pro stav 1964 časovou extrapolací.

Šířkový rozpor čp. 111/265/266 nebyl historicky uzavřen. Nová GPT varianta respektuje hranu GIS, původní Claude studie má jiné šířky. Obě varianty jsou dostupné. Ground je pro hmotové srovnání normalizován na nulu, nejde o rekonstrukci historického terénu. Letecké porovnání není geodetické zaměření, RMS registrace nebylo vypočteno.

## Zobrazení a prameny

V atlasu přepínejte GPT / Claude. Kliknutí na střechu či dvůr otevře identitu domu, autora a prameny. Již veřejné fotografie/plány z dřívějšího pilotu se načítají s ověřením SHA-256. Soukromé archivní pixely nebyly nově publikovány: lze připojit lokální originály, které zůstávají v prohlížeči.

Dvory leží 0,14 m nad nulovým podkladem kvůli z-fightingu; jejich půdorysy jsou oříznuty proti okolním budovám. Střešní hypotézy jsou oddělené od orientační městské vrstvy.

## Kontrola

19 domů zachyceno v devíti pohledech (čtyři světové osy, čtyři šikmé pohledy, pohled shora) a ve stejných pohledech bez barev. Kontrola se týká střech, dvorků a hmotové geometrie. Detailní fasádní otvory, nápisy, přesné ostění a poškození nejsou součástí tohoto zadání; nejsou označeny jako ověřené. Historické přijetí všech verzí zůstává otevřené.

Rozšíření městem je evidováno po všech 132 ulicích v postup-mestem.json a v [přehledu](prehled.html). Neověřená část není označena jako hotová.
