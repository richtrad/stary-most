const ns='http://www.w3.org/2000/svg',q=s=>document.querySelector(s);
const response=await fetch('../prostor/prostor.geojson');
if(!response.ok)throw Error('Chybí mapa veřejného prostoru.');
const data=await response.json(),m=data.metadata,over=q('#inventar-land'),svg=over.ownerSVGElement;
const zones=q('#land-atlas-zone'),buttons=q('#land-atlas-types'),list=q('#land-atlas-feature');
const [ox,oy]=m.crs_local.origin5514,[x0,y0,x1,y1]=m.municipal.bbox;
const kx=m.municipal.size[0]/(x1-x0),ky=m.municipal.size[1]/(y1-y0);
const entries=new Map(),filters=new Map();
function pixel([x,z]){return [(ox+x-x0)*kx,(y1-oy+z)*ky]}
function element(name,attrs){const e=document.createElementNS(ns,name);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);return e}
const p=new URLSearchParams(location.search),fromLand=p.has('prostor');
for(const [key,name] of Object.entries(m.zones))zones.add(new Option(name,key));
zones.value=fromLand?'P':'all';
for(const [key,title] of Object.entries(m.groups)){
  const label=document.createElement('label'),input=document.createElement('input'),dot=document.createElement('i');
  input.type='checkbox';input.checked=fromLand;dot.style.background=m.colors[key];dot.setAttribute('aria-hidden','true');
  label.append(input,dot,title);buttons.append(label);filters.set(key,input);
  input.onchange=()=>filter();
}
for(const f of data.features){
  const a=f.properties, parts=a.local.type==='Polygon'?[a.local.coordinates]:a.local.coordinates;
  const pathData=parts.flatMap(poly=>poly.map(ring=>ring.map((pt,i)=>(i?'L':'M')+pixel(pt).map(v=>v.toFixed(2)).join(' ')).join(' ')+'Z')).join('');
  const wrap=element('a',{href:'../?view=prostor&prvek='+f.id,'aria-label':a.title,tabindex:'0',class:'atlas-land'});
  const path=element('path',{d:pathData,fill:m.colors[a.group],stroke:m.colors[a.group],'fill-rule':'evenodd'});
  const title=element('title',{});title.textContent=a.title+' · '+a.confidence;wrap.append(title,path);
  if(['ellipse','outline','block'].includes(a.shape)){
    const [x,y]=pixel(a.anchor);wrap.append(element('circle',{cx:x,cy:y,r:14,fill:'transparent'}));
  }
  wrap.addEventListener('click',e=>{
    if(e.shiftKey||e.metaKey||e.ctrlKey)return;
    e.preventDefault();select(f.id);
  });
  over.append(wrap);entries.set(f.id,{a,wrap});
}
function select(id){
  const item=entries.get(id);if(!item)return;
  document.querySelectorAll('#soupis svg .active').forEach(n=>n.classList.remove('active'));
  const {a,wrap}=item;wrap.classList.add('active');list.value=id;
  q('#inventar-volba').textContent=a.title+' · '+a.confidence+' · '+a.model_author;
  const mdl=q('#inventar-model'),orig=q('#inventar-lms');
  mdl.textContent='Zobrazit prvek ve 3D ↗';mdl.href='../?view=prostor&prvek='+id;
  orig.href=a.source;mdl.hidden=false;orig.hidden=false;
}
function filter(){
  const old=list.value;
  const values=[];
  for(const [id,{a,wrap}] of entries){
    const visible=filters.get(a.group).checked;
    wrap.style.display=visible?'':'none';
    if(visible && (zones.value==='all'||zones.value===a.zone))values.push(new Option(a.title,id));
  }
  list.replaceChildren(new Option('Vybrat cestu, plochu nebo prvek',''),...values);
  list.disabled=!values.length;
  if(values.some(v=>v.value===old))list.value=old;
  else if(old){q('#inventar-volba').textContent='Vyberte prvek nebo korunu na snímku.';q('#inventar-model').hidden=true;q('#inventar-lms').hidden=true}
}
function zoom(){
  if(zones.value==='all'){svg.setAttribute('viewBox','50 180 2870 2040');return}
  const coords=data.features.filter(f=>f.properties.zone===zones.value).flatMap(f=>{
    const g=f.properties.local;return (g.type==='Polygon'?[g.coordinates]:g.coordinates).flatMap(poly=>poly[0].map(pixel));
  });
  const xs=coords.map(p=>p[0]),ys=coords.map(p=>p[1]);
  const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y,pad=Math.max(30,w*.07,h*.07);
  svg.setAttribute('viewBox',[x-pad,y-pad,w+2*pad,h+2*pad].join(' '));
}
list.onchange=()=>select(list.value);zones.onchange=()=>{filter();zoom()};
filter();if(fromLand)zoom();
