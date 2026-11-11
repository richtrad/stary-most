const q=s=>document.querySelector(s);
export function furnitureInterface(catalog,actions){
  const records=new Map(catalog.objects.map(r=>[r.id,r])),sources=catalog.sources,epochs=catalog.epochs.map(e=>e.id),kinds=catalog.categories.map(c=>c.id);
  const dialog=q('#furniture-source'),image=q('#furniture-scan'),local=new Map();
  let current=null,shown=null,generation=0;
  const objectUrls=[];
  function parse(p,view){
    const epoch=epochs.includes(p.get('obdobi'))?p.get('obdobi'):'1957-58';
    const filters=p.has('mobiliardruhy')?p.get('mobiliardruhy').split(','):kinds;
    const author=['gpt','claude'].includes(p.get('autorprvku'))?p.get('autorprvku'):'all';
    const enabled=p.get('mobiliarvid')!=='0';
    const id=p.get('mobiliar'),r=records.get(id);
    const focus=view==='street'&&enabled&&r&&r.epoch===epoch&&filters.includes(r.category)&&(author==='all'||r.author.key===author)?id:null;
    return {furnitureEpoch:epoch,furnitureKinds:kinds.filter(k=>filters.includes(k)),furnitureAuthor:author,furnitureEnabled:enabled,furnitureFocus:focus,furnitureDoc:focus&&p.get('doklad')==='1'?focus:null};
  }
  q('#furniture-epoch').replaceChildren(...catalog.epochs.map(e=>new Option(e.label,e.id)));
  q('#furniture-filters').replaceChildren(...catalog.categories.map(c=>{
    const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=c.id;input.checked=true;
    input.onchange=()=>actions.filter([...q('#furniture-filters').querySelectorAll('input:checked')].map(i=>i.value));label.append(input,c.label);return label;
  }));
  q('#furniture-epoch').onchange=e=>actions.epoch(e.target.value);
  q('#furniture-enabled').onchange=e=>actions.enable(e.target.checked);
  q('#furniture-author').onchange=e=>actions.author(e.target.value);
  q('#furniture-select').onchange=e=>actions.select(e.target.value||null,false);
  q('#furniture-open').onclick=()=>current?.furnitureFocus&&actions.select(current.furnitureFocus,true);
  q('#furniture-close').onclick=actions.close;
  dialog.addEventListener('cancel',e=>{e.preventDefault();actions.close()});
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)actions.close()}});
  function update(state){
    current=state;
    if(state.street==='24')q('#street-counts').textContent=q('#street-counts').textContent.replace('Fotografie','Veřejné fotografie')+' · Mobiliář 19 / 6 archivních snímků';
    q('#furniture-epoch').value=state.furnitureEpoch;
    q('#furniture-enabled').checked=state.furnitureEnabled;
    q('#furniture-author').value=state.furnitureAuthor;
    for(const input of q('#furniture-filters').querySelectorAll('input'))input.checked=state.furnitureKinds.includes(input.value);
    const rows=catalog.objects.filter(r=>r.epoch===state.furnitureEpoch&&state.furnitureKinds.includes(r.category)&&(state.furnitureAuthor==='all'||r.author.key===state.furnitureAuthor));
    q('#furniture-select').replaceChildren(new Option('Přiblížit prvek…',''),...rows.map(r=>new Option(r.title+' · '+(r.author.key==='gpt'?'GPT':'Claude'),r.id)));
    q('#furniture-select').value=state.furnitureFocus||'';
    q('#furniture-open').disabled=!state.furnitureFocus;
    q('#furniture-count').textContent=(state.furnitureEnabled?rows.length:0)+' / '+catalog.objects.length;
    const r=records.get(state.furnitureFocus);
    q('#furniture-selected').textContent=r?r.author.name+' · '+r.author.model+'. Poloha přibližně ±'+r.positionUncertaintyM+' m.':'Vyberte prvek nebo na něj klikněte ve scéně.';
    if(r&&state.view==='street'){
      q('#place').textContent=r.title;
      q('#scale').textContent=catalog.epochs.find(e=>e.id===r.epoch).label+' · '+r.author.name;
    }
  }
  const sha=async file=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))].map(b=>b.toString(16).padStart(2,'0')).join('');
  async function acceptFiles(files){
    const candidates=Object.values(sources);let found=0,ignored=0;
    for(const file of files){
      const matches=candidates.filter(s=>s.bytes===file.size);if(!matches.length){ignored++;continue}
      const hash=await sha(file),s=matches.find(s=>s.sha256===hash);if(!s){ignored++;continue}
      const url=URL.createObjectURL(file);objectUrls.push(url);local.set(s.id,url);found++;
    }
    const msg=found?'Připojeno '+found+' ověřených snímků. Soubory zůstávají pouze v tomto prohlížeči.':'Žádný soubor neodpovídá velikostí a SHA-256 původním snímkům této vrstvy.';
    q('#furniture-import-status').textContent=msg;q('#furniture-source-status').textContent=msg;
    if(shown)show(shown,true);
  }
  for(const id of ['#furniture-import','#furniture-file'])q(id).onchange=e=>acceptFiles([...e.target.files]).catch(()=>q('#furniture-source-status').textContent='Snímek se nepodařilo ověřit.');
  async function show(id,refresh=false){
    if(!id){shown=null;generation++;if(dialog.open)dialog.close();return}
    if(shown===id&&!refresh)return;
    const r=records.get(id);if(!r)return;shown=id;const token=++generation,s=sources[r.source];
    q('#furniture-source-kind').textContent='PŮVODNÍ FOTOGRAFIE · '+catalog.epochs.find(e=>e.id===r.epoch).label;
    q('#furniture-title').textContent=r.title;q('#furniture-observed').textContent=r.observed;
    q('#furniture-hypothesis').textContent=r.hypothesis;
    q('#furniture-source-author').textContent='Geometrie: '+r.author.name+' · '+r.author.model+(r.author.exactModelId?' ('+r.author.exactModelId+')':' · přesné ID modelu není k dispozici')+'. Usazení a ověření: '+r.placementAuthor+'.';
    q('#furniture-position').textContent='Odhad polohy ±'+r.positionUncertaintyM+' m. '+catalog.baseContextNote;
    q('#furniture-file-id').textContent=s.filename+' · Libuše '+s.id+' · SHA-256 '+s.sha256+' · '+s.bytes+' B. Metadata: '+s.metadataSnapshot+'. '+s.dateNote;
    const ref=q('#furniture-type-reference');ref.hidden=!r.typologyUrl;if(r.typologyUrl){ref.href=r.typologyUrl;ref.textContent=r.typologyTitle+' ↗'}
    q('#furniture-libuse').href=s.libuseUrl;
    q('#furniture-source-status').textContent='';
    image.hidden=true;image.removeAttribute('src');q('#furniture-local-needed').hidden=false;
    const original=q('#furniture-original');original.hidden=true;
    if(!dialog.open)dialog.showModal();
    let url=local.get(s.id);
    // The optional private localhost preview serves the same verified originals.
    // Public deployment never receives these files or an API credential.
    if(!url&&['127.0.0.1','localhost'].includes(location.hostname)){
      try{const res=await fetch(s.localPreviewPath);if(res.ok){const blob=await res.blob();if(blob.size===s.bytes&&await sha(blob)===s.sha256){url=URL.createObjectURL(blob);objectUrls.push(url);local.set(s.id,url)}}}catch{}
    }
    if(token!==generation)return;
    if(url){image.src=url;image.alt=s.title;image.hidden=false;original.href=url;original.hidden=false;q('#furniture-local-needed').hidden=true;q('#furniture-source-status').textContent='Původní snímek ověřen podle SHA-256. Odkaz Celý originál otevře plné rozlišení.';}
  }
  window.addEventListener('pagehide',()=>objectUrls.forEach(u=>URL.revokeObjectURL(u)));
  return {parse,update,show,has:id=>records.has(id),get:id=>records.get(id),kinds};
}
