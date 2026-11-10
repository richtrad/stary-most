import {normalizeCity} from './public-client.js';
import {publicInterface} from './prostor/ovladani.js';
import {treeInterface} from './stromy/ovladani.js';
import {showArchiveRecord} from './archive-access.js';
const q=s=>document.querySelector(s);
const all=s=>[...document.querySelectorAll(s)];
const canvas=q('#scene'), dialog=q('#archive'), scan=q('#scan');
const state={cp:'262',layer:'claude',view:'city',surface:'original',type:null,page:0,vegetation:'crowns',quality:'all',area:'all',tree:null,treeDoc:false,zone:'P',landGroups:[],landId:null,landDoc:false};
let houses,map,treeUI,catalog,landUI,landCatalog;
const status=t=>q('#map-status').textContent=t;
function parse() {
  const p=new URLSearchParams(location.search);
  const cp=Object.hasOwn(houses,p.get('cp'))?p.get('cp'):'262';
  const layer=p.get('layer')==='gpt'?'gpt':'claude';
  const view=['city','street','facade',...(treeUI?['trees']:[]),...(landUI?['prostor']:[])].includes(p.get('view'))?p.get('view'):'city';
  const type=['photos','plans'].includes(p.get('doc'))?p.get('doc'):null;
  const page=type?Math.min(houses[cp][type].length-1,Math.max(0,parseInt(p.get('page'),10)||0)):0;
  const surface=p.get('surface')==='materials'?'materials':'original';
  const vegetation=['off','branches','crowns'].includes(p.get('vegetation'))?p.get('vegetation'):view==='prostor'?'branches':'crowns';
  const quality=p.get('quality')==='distinct'?'distinct':'all';
  let tree=p.get('tree');
  if(!treeUI?.has(tree) || vegetation==='off' || view!=='trees' || (quality==='distinct' && treeUI.get(tree).confidence!=='distinct'))tree=null;
  const area=tree?treeUI.get(tree).area:Object.hasOwn(catalog?.metadata.areas||{},p.get('area'))?p.get('area'):'all';
  const allGroups=landUI?.groups||[],keys=p.has('plochy')?p.get('plochy').split(','):allGroups;
  const landGroups=allGroups.filter(k=>keys.includes(k));
  let landId=view==='prostor'?p.get('prvek'):null;
  const rec=landUI?.items.get(landId);
  if(!rec || !landGroups.includes(rec.group))landId=null;
  const zone=landId?rec.zone:(p.get('oblast')==='all'||Object.hasOwn(landUI?.meta.zones||{},p.get('oblast'))?p.get('oblast'):'P');
  return {landGroups,landId,zone,landDoc:!!landId&&!type&&p.get('pramen')==='1',cp,layer,view,surface,type,page,vegetation,quality,area,tree,treeDoc:!!tree && !type && p.get('pramen')==='1'};
}
function writeLink() {
  const url=new URL(location.href);
  url.search='';
  for(const k of ['cp','layer','view']) url.searchParams.set(k,state[k]);
  if(state.surface==='materials')url.searchParams.set('surface','materials');
  if(state.vegetation!==(state.view==='prostor'?'branches':'crowns'))url.searchParams.set('vegetation',state.vegetation);
  if(state.quality!=='all')url.searchParams.set('quality',state.quality);
  if(state.view==='trees' && state.area!=='all')url.searchParams.set('area',state.area);
  if(state.view==='trees' && state.tree)url.searchParams.set('tree',state.tree);
  if(landUI && state.landGroups.length!==landUI.groups.length)url.searchParams.set('plochy',state.landGroups.join(','));
  if(state.view==='prostor' && state.zone!=='P')url.searchParams.set('oblast',state.zone);
  if(state.view==='prostor' && state.landId)url.searchParams.set('prvek',state.landId);
  if(state.landDoc)url.searchParams.set('pramen','1');
  if(state.treeDoc)url.searchParams.set('pramen','1');
  if(state.type){url.searchParams.set('doc',state.type);if(state.page)url.searchParams.set('page',state.page)}
  if(url.href!==location.href)history.pushState(null,'',url);
}
function update(instant=false,preserve=false) {
  const {cp,layer,view}=state, h=houses[cp], v=h.variants[layer];
  for(const [key,selected] of Object.entries({cp,layer,view,surface:state.surface})){
    all('[data-'+key+']').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[key]===selected)));
  }
  const note=q('#surface-note');
  note.hidden=state.surface!=='materials'||view==='city';
  note.textContent=Object.keys(v.textureSwatches||{}).length ? 'Texturované plochy mají v tomto pohledu jeden odstín.' : 'Tato verze domu už používá jen materiály.';
  q('#credit strong').textContent=v.maker+' · '+v.revision;
  q('#credit>p').textContent=v.credit;
  q('.scope').textContent=v.scope;
  q('#credit code').textContent='SHA-256 '+v.sha256;
  q('#registration').textContent=h.identity+'. '+h.placement+' Azimut průčelí '+h.trueBearing.toLocaleString('cs-CZ')+'° od zeměpisného severu.';
  q('#plan').textContent='Plán parcely '+h.parcel1937;
  q('#address').textContent='Čp. '+cp+' · '+h.address;
  q('#place').textContent=view==='city'?'Starý Most':view==='street'?'Kulová a okolí':'Čp. '+cp;
  q('#scale').textContent=view==='city'?'Městský půdorys · 1 400 domů':view==='street'?'Severní fronta a nároží náměstí':h.address+' · '+v.maker;
  if(view==='trees' && catalog){
    q('#place').textContent=state.tree?'Strom '+state.tree:(catalog.metadata.areas[state.area]||'Stromy kolem Kulové');
    q('#scale').textContent='Starý Most · letecký snímek z 16. dubna 1964';
    note.hidden=true;
  }
  if(view==='prostor' && landUI){
    q('#place').textContent=landUI.items.get(state.landId)?.title||landUI.meta.zones[state.zone]||'Veřejný prostor';
    q('#scale').textContent='Povrchy a uliční prvky · duben 1964';note.hidden=true;
  }
  landUI?.update(state);
  treeUI?.update(state);
  if(map){map.setSpace(state.landGroups,state.zone,state.landId);map.setSurface(state.surface);map.setTrees(state.vegetation,state.quality,state.area,state.tree);map.setHouse(cp,layer,view,instant,preserve)}
}
function choose(change) {
  const onlyLayer=Object.keys(change).length===1&&'layer' in change;
  if(change.view && change.view!=='trees'){change.tree=null;change.area='all'}
  if(change.view==='trees' && state.vegetation==='off')change.vegetation='crowns';
  if(change.view && change.view!=='prostor')change.landId=null;
  if(change.view==='prostor' && state.view!=='prostor' && !new URL(location.href).searchParams.has('vegetation') && state.vegetation==='crowns')change.vegetation='branches';
  Object.assign(state,change,{type:null,page:0,treeDoc:false,landDoc:false});
  writeLink();update(false,onlyLayer);renderDoc();
}
function renderDoc() {
  landUI?.show(state.landDoc?state.landId:null);
  treeUI?.show(state.treeDoc?state.tree:null);
  if(!state.type){if(dialog.open)dialog.close();return}
  const list=houses[state.cp][state.type], rec=list[state.page];
  q('#doc-kind').textContent=(state.type==='photos'?'FOTOGRAFIE':'STAVEBNÍ PRAMEN')+' · ČP. '+state.cp;
  q('#doc-title').textContent=rec.title;
  q('#doc-note').textContent=rec.note;
  showArchiveRecord(rec);
  q('#doc-switch').replaceChildren(...list.map((entry,i)=>{
    const b=document.createElement('button');b.textContent=entry.short||entry.title;
    b.setAttribute('aria-pressed',String(i===state.page));
    b.onclick=()=>{state.page=i;writeLink();renderDoc()};return b;
  }));
  if(!dialog.open)dialog.showModal();
}
function openDoc(type,code=state.cp) {
  if(state.cp!==code){state.cp=code;update(false,true)}
  state.landDoc=false;state.treeDoc=false;state.type=type;state.page=0;writeLink();renderDoc();
}
function dismiss(){state.type=null;state.page=0;writeLink();renderDoc()}
q('#close-doc').onclick=dismiss;
dialog.addEventListener('cancel',e=>{e.preventDefault();dismiss()});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dismiss()}});
function selectTree(id,open=true){
  const p=treeUI?.get(id);if(!p)return;
  Object.assign(state,{view:'trees',landId:null,landDoc:false,area:p.area,tree:id,treeDoc:open,type:null,page:0});
  if(state.vegetation==='off')state.vegetation='crowns';
  writeLink();update();renderDoc();
}
function selectLand(id,open){
  const p=landUI?.items.get(id);if(!p)return;
  const cameFrom=state.view;
  Object.assign(state,{view:'prostor',zone:p.zone,landId:id,landDoc:open,type:null,page:0,tree:null,treeDoc:false});
  if(!state.landGroups.includes(p.group))state.landGroups=[...state.landGroups,p.group];
  if(cameFrom!=='prostor' && state.vegetation==='crowns' && !new URL(location.href).searchParams.has('vegetation'))state.vegetation='branches';
  writeLink();update();renderDoc();
}
async function boot(){
  const res=await fetch('pilot.json',{cache:'no-cache'});
  if(!res.ok)throw Error('Nelze načíst katalog modelů.');
  houses=await res.json();
  try{
    const result=await fetch('stromy/stromy.geojson',{cache:'no-cache'});
    if(!result.ok)throw Error('Chybí inventura stromů.');
    catalog=await result.json();
    treeUI=treeInterface(catalog,{
      selectTree:id=>selectTree(id,false), showTree:id=>selectTree(id,true),
      close:()=>{state.treeDoc=false;writeLink();renderDoc()},
      area:area=>choose({view:'trees',area,tree:null}),
      style:mode=>{state.vegetation=mode;if(mode==='off'){state.tree=null;state.treeDoc=false}writeLink();update(false,true);renderDoc()},
      quality:quality=>{state.quality=quality;if(state.tree && quality==='distinct' && treeUI.get(state.tree).confidence!=='distinct'){state.tree=null;state.treeDoc=false}writeLink();update(false,true);renderDoc()}
    });
  }catch(e){
    q('#tree-controls').hidden=true;q('[data-view="trees"]').hidden=true;
    console.warn('Vrstva stromů není dostupná.',e);
  }
  try {
    const resp=await fetch('prostor/prostor.geojson',{cache:'no-cache'});if(!resp.ok)throw Error('Chybí inventura ploch.');
    landCatalog=await resp.json();
    landUI=publicInterface(landCatalog,{
      select:selectLand,zone:zone=>choose({view:'prostor',zone,landId:null}),
      close:()=>{state.landDoc=false;writeLink();renderDoc()},
      filter:groups=>{
        state.landGroups=groups;
        if(state.landId && !groups.includes(landUI.items.get(state.landId).group)){state.landId=null;state.landDoc=false}
        writeLink();update(false,true);renderDoc();
      }
    });
  }catch(e){q('#land-controls').hidden=true;q('[data-view="prostor"]').hidden=true;console.warn('Veřejný prostor není dostupný.',e)}
  Object.assign(state,parse());
  all('[data-cp]').forEach(b=>b.onclick=()=>choose({cp:b.dataset.cp,view:'facade'}));
  all('[data-view]').forEach(b=>b.onclick=()=>choose({view:b.dataset.view}));
  all('[data-layer]').forEach(b=>b.onclick=()=>choose({layer:b.dataset.layer}));
  all('[data-surface]').forEach(b=>b.onclick=()=>{
    if(state.surface===b.dataset.surface)return;
    state.surface=b.dataset.surface;
    writeLink();update(false,true);
  });
  q('#photo').onclick=()=>openDoc('photos');q('#plan').onclick=()=>openDoc('plans');
  window.addEventListener('popstate',()=>{
    const oldArea=state.area,oldTree=state.tree,oldZone=state.zone,oldLand=state.landId;
    Object.assign(state,parse());update(false,oldArea===state.area && oldTree===state.tree && oldZone===state.zone && oldLand===state.landId);renderDoc();
  });
  update(true);renderDoc();
  const [scene,resp]=await Promise.all([import('./scena.js'),fetch('https://raw.githubusercontent.com/richtrad/most/7ab5374b7a93714dc41d683c7089e2e9c63d479d/gis/mapa/city.json')]);
  if(!resp.ok)throw Error('Chybí městský půdorys.');
  const city=normalizeCity(await resp.json());
  map=scene.buildMap(canvas,city,houses,catalog,(cp,view)=>choose({cp,view}),(cp)=>openDoc('photos',cp),id=>selectTree(id),status,landCatalog,id=>selectLand(id,true));
  q('#zoom-in').onclick=()=>map.zoom(.72);q('#zoom-out').onclick=()=>map.zoom(1.39);
  update(true);
  Object.defineProperty(window,'__MOST_VIEW__',{value:()=>map.inspect()});
}
boot().catch(e=>{status('3D mapu se nepodařilo načíst. Zkontrolujte podporu WebGL v prohlížeči. Archivní prameny najdete v kartě domu.');console.error(e)});
