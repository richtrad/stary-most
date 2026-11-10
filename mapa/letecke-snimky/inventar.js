const q=s=>document.querySelector(s), ns='http://www.w3.org/2000/svg';
const layer=q('#inventar-points'), info=q('#inventar-volba'), photo=q('#inventar-lms'), model=q('#inventar-model');
function element(tag,attrs){const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n}
const response=await fetch('../stromy/stromy.geojson');if(!response.ok)throw Error('Chybí soupis stromů.');
const data=await response.json(),meta=data.metadata;
const [x0,, ,y1]=meta.municipal.bbox;
let selected=null;
function show(f,node){
  document.querySelectorAll('#inventar-land .active').forEach(n=>n.classList.remove('active'));
  const landChoice=q('#land-atlas-feature');if(landChoice)landChoice.value='';
  model.textContent='Zobrazit strom ve 3D ↗';
  selected?.classList.remove('active');selected=node;node.classList.add('active');
  const p=f.properties;info.textContent='Strom '+f.id+' · '+meta.areas[p.area]+(p.confidence==='distinct'?' · zřetelný':' · pravděpodobný');
  photo.href=p.source_url;model.href='../?view=trees&tree='+encodeURIComponent(f.id);
  photo.hidden=false;model.hidden=false;
}
for(const f of data.features){
  const p=f.properties,[x,y]=p.sjtsk;
  const a=element('a',{href:'../?view=trees&tree='+encodeURIComponent(f.id),class:'koruna '+p.confidence,'aria-label':'Strom '+f.id+' · '+meta.areas[p.area]});
  const cx=(x-x0)*6,cy=(y1-y)*6;
  const title=element('title',{});title.textContent=f.id+' · '+meta.cues[p.cue];a.append(title);
  a.append(element('circle',{class:'hitspot',cx,cy,r:19}),element('circle',{class:'obrys',cx,cy,r:p.diameter_m_approx*3}),element('circle',{class:'stred',cx,cy,r:4.2}));
  a.addEventListener('click',e=>{if(e.ctrlKey||e.metaKey||e.shiftKey)return;e.preventDefault();show(f,a)});layer.append(a);
}
q('#inventar-znacky').onchange=e=>layer.style.display=e.target.checked?'':'none';
q('#inventar-podklad').onchange=e=>{
 const old=e.target.value==='1953';q('#foto53').style.display=old?'':'none';q('#foto64').style.display=old?'none':'';
 q('#inventar-rok').textContent=old?'Podklad 1953 · CENIA / GEODIS BRNO / VGHMÚř. Značky stále zachycují duben 1964.':'Podklad 1964 · Georeal Plzeň, podkladová data © MO ČR. Značky vycházejí z náletu 16. dubna 1964.';
};
q('#inventar-pocet').textContent=data.features.length+' poloh korun · 16. dubna 1964';
