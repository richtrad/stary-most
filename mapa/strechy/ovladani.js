const q=s=>document.querySelector(s);
export function roofInterface(data,actions){
 const records=new Map(data.gpt.buildings.map(b=>[b.cp,b])),originals=new Map(data.claude.buildings.map(b=>[b.cp,b]));
 const sources=data.sources,local=new Map(),dialog=q('#roof-dialog');let state=null,shown=null,selectedSource=null,generation=0;
 q('#roof-select').replaceChildren(new Option('Celá Kulová a ústí do náměstí',''),...data.gpt.buildings.map(b=>new Option('Čp. '+b.cp,b.cp)));
 q('#roof-select').onchange=e=>actions.select(e.target.value||null);
 q('#roof-source').onclick=()=>state?.roofFocus&&show({cp:state.roofFocus,kind:'roof'});
 q('#roof-context').onchange=e=>actions.context(e.target.checked);
 q('#roof-dialog-close').onclick=()=>dialog.close();
 q('#roof-source-select').onchange=e=>displaySource(e.target.value);
 q('#roof-show-photo').onclick=()=>{const id=available().find(id=>sources[id]?.type==='photo');if(id){q('#roof-source-select').value=id;displaySource(id)}};
 q('#roof-show-plan').onclick=()=>{const id=available().find(id=>sources[id]?.type==='plan');if(id){q('#roof-source-select').value=id;displaySource(id)}};
 function available(){return shown?.kind==='context'?['city-ortho-1964']:records.get(shown?.cp)?.sources||[]}
 async function displaySource(id){
  const token=++generation;
  selectedSource=id;q('#roof-source-select').value=id;const s=sources[id];let url=local.get(s?.sha256);q('#roof-source-note').textContent=s?[s.title,s.date,s.note].join(' · '):'Pramen není přiřazen.';
  q('#roof-source-id').textContent=s?[s.collection,s.recordId,s.sha256&&'SHA-256 '+s.sha256].filter(Boolean).join(' · '):'';
  const img=q('#roof-scan');img.hidden=!url;if(url){img.src=url;img.alt=s.title}else img.removeAttribute('src');
  q('#roof-source-lock').hidden=!!url;q('#roof-source-lock').textContent=s?.access==='public_service'?'Podklad je dostupný přes odkaz Letecká mapa. Tvar této střechy zůstává neověřeným odhadem.':'Původní archivní snímek není veřejně uložen. Připojte jej níže; ověřený originál se otevře přímo zde.';
  if(!url&&s?.url){
   q('#roof-source-lock').textContent='Načítám veřejný pramen a ověřuji jeho shodu…';
   try {
    const response=await fetch(s.url);if(!response.ok)throw Error('HTTP '+response.status);
    const bytes=await response.arrayBuffer(),sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
    if(sha!==s.sha256)throw Error('Kontrolní součet neodpovídá.');
    if(!local.has(sha))local.set(sha,URL.createObjectURL(new Blob([bytes],{type:response.headers.get('content-type')||'image/jpeg'})));
    if(token!==generation)return;img.src=local.get(sha);img.alt=s.title;img.hidden=false;q('#roof-source-lock').hidden=true;
   }catch(e){if(token===generation)q('#roof-source-lock').textContent='Veřejný pramen se nepodařilo ověřit. Můžete připojit místní originál níže.'}
  }
 }
 async function importFiles(files){
  let found=0;
  for(const f of files){
   const candidates=Object.values(sources).filter(s=>s.bytes===f.size);if(!candidates.length)continue;
   const sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await f.arrayBuffer()))].map(v=>v.toString(16).padStart(2,'0')).join('');
   if(candidates.some(s=>s.sha256===sha)){if(!local.has(sha))local.set(sha,URL.createObjectURL(f));found++}
  }
  q('#roof-import-status').textContent='Ověřeno '+found+' souborů; celkem '+local.size+' originálů připojeno pouze v tomto prohlížeči.';
  if(dialog.open)displaySource(selectedSource);
 }
 q('#roof-import').onchange=e=>importFiles(e.target.files).catch(()=>q('#roof-import-status').textContent='Soubor se nepodařilo ověřit.');
 function show(hit){
  shown=hit;const r=records.get(hit.cp),old=originals.get(hit.cp),isContext=hit.kind==='context';
  q('#roof-dialog-title').textContent=(hit.cp&&hit.cp!=='None'?'Čp. '+hit.cp:'Stavba GIS '+hit.id)+' · '+(hit.kind==='courtyard'?'dvůr / zahrada':'střechy a dvory');
  q('#roof-dialog-author').textContent=isContext?'Algoritmický kontext města · původní generátor projektu, přesný model autora neevidován.':state.layer==='claude'?(old?'Claude · Opus 5.5 · '+old.revision+'. Neutrální materiály a export: Codex.':'Půdorysný kontext GIS. Model Clauda pro tento dům v této vrstvě není.'):data.manifest.layerNotes.gpt;
  q('#roof-dialog-note').textContent=isContext?'Tato střecha je pouze algoritmický odhad z půdorysu. Individuální porovnání s plánem a leteckým snímkem zatím neproběhlo.':state.layer==='claude'?(old?.note||r?.note):r?.note;
  const ids=available();q('#roof-source-select').replaceChildren(...ids.map(id=>new Option(sources[id]?.title||id,id)));
  q('#roof-show-photo').disabled=!ids.some(id=>sources[id]?.type==='photo');q('#roof-show-plan').disabled=!ids.some(id=>sources[id]?.type==='plan');
  displaySource(ids.find(id=>sources[id]?.type==='photo'&&sources[id]?.url)||ids.find(id=>sources[id]?.type==='plan')||ids[0]);if(!dialog.open)dialog.showModal();
 }
 function update(s){
  state=s;q('#roof-select').value=s.roofFocus||'';q('#roof-source').disabled=!s.roofFocus;q('#roof-context').checked=s.roofContext;
  q('#roof-author-note').textContent=data.manifest.layerNotes[s.layer];
  q('#roof-count').textContent=s.layer==='gpt'?'19 domů · 13 dvorů':'15 modelů Clauda';
  if(s.roofFocus&&s.view==='street'){q('#place').textContent='Čp. '+s.roofFocus+' · střechy a dvory';q('#scale').textContent=s.layer==='gpt'?'Nová geometrie GPT · pracovní rekonstrukce':'Původní geometrie Clauda · srovnání'}
 }
 return {show,update,has:cp=>records.has(cp)};
}
