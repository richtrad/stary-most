import {sourceCanvas} from '../mesto/podklady.js';
const q=id=>document.getElementById(id);
const fmt=n=>n.toLocaleString('cs-CZ',{maximumFractionDigits:1});

export function treeInterface(catalog,handlers) {
  const m=catalog.metadata, features=new Map(catalog.features.map(f=>[f.id,f.properties]));
  const select=q('tree-area'), choose=q('tree-id');
  for(const [value,title] of Object.entries(m.areas)){
    const n=catalog.features.filter(f=>f.properties.area===value).length;
    select.add(new Option(title+' ('+n+')',value));
  }
  function options(area,quality,id){
    const filtered=[...features].filter(([k,p])=>(area==='all'||area===p.area)&&(quality!=='distinct'||p.confidence==='distinct'));
    const key=area+'/'+quality;
    if(choose.dataset.key!==key){
      choose.replaceChildren(new Option('Vybrat strom…',''));
      for(const [k,p] of filtered)choose.add(new Option(k+' · '+m.areas[p.area],k));
      choose.dataset.key=key;
    }
    choose.value=id||'';
  }
  const origin=[-790848.106,-987409.177];
  const dialog=q('tree-source'),canvas=q('tree-scan');
  const exportLink=document.createElement('a');
  const raster=sourceCanvas(canvas,origin,q('tree-caption'),exportLink);
  let current=null;
  function show(id){
    const p=features.get(id);
    if(!p){if(dialog.open)dialog.close();current=null;raster.clear();return}
    const changed=current!==id;current=id;
    q('tree-title').textContent='Strom '+id+' · '+m.areas[p.area];
    q('tree-period').textContent=p.city_reading?'LETECKÝ PRAMEN · ORTOFOTO 1964':'LETECKÝ PRAMEN · 16. DUBNA 1964';
    q('tree-reading').textContent=(p.confidence==='distinct'?'Zřetelný na snímku. ':'Pravděpodobný strom. ')+(m.cues[p.cue]||'');
    q('tree-archive').href=p.source_url;
    q('tree-archive').textContent=p.city_reading?'Otevřít toto místo na ortofotu ↗':'Otevřít původní snímek ČÚZK ↗';
    q('tree-metrics').textContent='Odhad šířky koruny přibližně '+p.diameter_m_approx+' m. Výška, druh a přesná poloha kmene nejsou změřené.';
    let coordinate='S-JTSK (EPSG:5514) '+p.sjtsk.map(fmt).join(' / ')+'. '+p.flight_id+'.';
    if(p.city_reading)coordinate+=' Georeference městského podkladu. Polohová přesnost tohoto odečtu není samostatně změřená.';
    else if(m.checks)coordinate+=' Na osmi kontrolních bodech původního pilotu byl medián odchylky '+fmt(m.checks.median_m)+' m a maximum '+fmt(m.checks.max_m)+' m.';
    q('tree-coordinate').textContent=coordinate;
    if(changed){
      const x=p.sjtsk[0]-origin[0],z=origin[1]-p.sjtsk[1];
      raster.show({bounds:[x-32,z-19,x+32,z+19],points:[[x,z,p.diameter_m_approx/2]]});
      raster.mark(q('tree-mark').checked);
    }
    if(!dialog.open)dialog.showModal();
  }
  q('tree-mark').onchange=()=>raster.mark(q('tree-mark').checked);
  q('tree-close').onclick=handlers.close;
  dialog.addEventListener('cancel',e=>{e.preventDefault();handlers.close()});
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)handlers.close()}});
  select.onchange=()=>handlers.area(select.value);
  choose.onchange=()=>{if(choose.value)handlers.selectTree(choose.value)};
  q('tree-open').onclick=()=>handlers.showTree(choose.value);
  q('tree-known').onchange=()=>handlers.quality(q('tree-known').checked?'distinct':'all');
  for(const b of document.querySelectorAll('[data-vegetation]'))b.onclick=()=>handlers.style(b.dataset.vegetation);
  function update(s){
    const count=catalog.features.filter(t=>s.quality!=='distinct'||t.properties.confidence==='distinct').length;
    q('tree-summary').textContent=s.vegetation==='off'?'Vrstva skrytá · 1964':count+' stromů ve vrstvě · 1964';
    if(select.dataset.quality!==s.quality){
      for(const item of select.options){
        if(item.value==='all')continue;
        const n=catalog.features.filter(f=>f.properties.area===item.value && (s.quality!=='distinct'||f.properties.confidence==='distinct')).length;
        item.textContent=m.areas[item.value]+' ('+n+')';
      }
      select.dataset.quality=s.quality;
    }
    q('tree-known').checked=s.quality==='distinct';select.value=s.area;
    options(s.area,s.quality,s.tree);
    q('tree-open').disabled=!s.tree;
    for(const b of document.querySelectorAll('[data-vegetation]'))b.setAttribute('aria-pressed',String(b.dataset.vegetation===s.vegetation));
  }
  return {show,update,has:id=>features.has(id),get:id=>features.get(id)};
}
