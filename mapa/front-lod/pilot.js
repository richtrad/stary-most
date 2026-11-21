import * as T from 'three';
import {OrbitControls} from '../vendor/OrbitControls.js';
import {surrounding,buildHouse,disposeGroup,markEstimatedOpenings} from './model.js?v=20261121';

const $=s=>document.querySelector(s), all=s=>[...document.querySelectorAll(s)];
const query=new URLSearchParams(location.search), ray=new T.Raycaster();
const assetCache=new Map(), localFiles=new Map(), officialFiles=new Map();
const geoCache=new Map(), textures=new Map(), clipped=new T.Plane();
const canvas=$('#scene'), scene=new T.Scene();
let catalog,house,street,active,neighbors,camera,renderer,controls,request=0;
let streetHouses=[],streetContext=null,renderedLayer=null,dialogIsPlan=false,focusFace=null;
let pickedMode=['auto','relief','foto'].includes(query.get('lod'))?query.get('lod'):'auto';
let layer=query.get('layer')==='claude'?'claude':'gpt',wide=false,frame=0;
let currentDialog=null, reopenAfterPack=null, sourceGeneration=0;
let onlyFront=query.get('fronty')==='1';
const localHost=['127.0.0.1','localhost','[::1]'].includes(location.hostname);
let useLocal=localHost&&query.get('archiv')==='mistni';
if(localHost)try{
  if(query.has('archiv'))sessionStorage.setItem('most-mistni-archiv',useLocal?'1':'0');
  else useLocal=sessionStorage.getItem('most-mistni-archiv')==='1';
}catch{/* The URL also works when session storage is unavailable. */}

async function json(url) {
  const r=await fetch(url+'?v=20261121'); if(!r.ok)throw Error('Soubor se nepodařilo načíst ('+r.status+').');
  return r.json();
}
function modelData(cp) {
  if(!geoCache.has(cp))geoCache.set(cp,json('modely/'+cp+'.json').catch(err=>{geoCache.delete(cp);throw err}));
  return geoCache.get(cp);
}
function option(value,label) { return new Option(label,value); }
const keyOf=h=>h.key||h.cp;
const address=h=>h.cp?'Čp. '+h.cp:h.detached?'Archivní studie bez čp.':'Stavba GIS '+h.footprintId+' · bez čp.';
const faceName=h=>h.faceName||({chamfer:'Zkosené nároží',alley:'Boční stěna do uličky',rear:'Dvorní stěna'}[h.faceId])||'Hlavní průčelí';
const evidenceOf=h=>h.evidenceLevel||'photo';
const walkHouses=()=>onlyFront?catalog.houses.filter(h=>h.sourceFronts?.length):catalog.houses;
const evidenceName={photo:'Podle fotografie',plan:'Podle plánu',mixed:'Část průčelí je odhadnutá',estimated:'Odhad průčelí',partial:'Částečně zachycené průčelí',courtyard:'Dílna ve dvoře'};
function setPressed(attr,value) {all('button['+attr+']').forEach(b=>b.setAttribute('aria-pressed',String(b.getAttribute(attr)===value)))}
function stateUrl(){
  const url=new URL(location.href);
  for(const key of ['cp','gis','studie'])url.searchParams.delete(key);
  const byParcel=keyOf(house).startsWith('gis-');
  if(house.detached)url.searchParams.set('studie',house.structureId);
  else url.searchParams.set(byParcel?'gis':'cp',byParcel?house.footprintId:house.cp);
  url.searchParams.set('lod',pickedMode);url.searchParams.set('layer',layer);
  if(onlyFront)url.searchParams.set('fronty','1');else url.searchParams.delete('fronty');
  if(focusFace?.record.faceId)url.searchParams.set('stena',focusFace.record.faceId);
  else url.searchParams.delete('stena');
  history.replaceState(null,'',url);
  const back=new URL('../',location.href);if(house.streetId)back.searchParams.set('street',house.streetId);
  back.searchParams.set('layer',layer);back.searchParams.set('view','street');
  $('#atlas').href=back.href;
}
function invalidate() {
  if(renderer&&!frame)frame=requestAnimationFrame(()=>{
    frame=0;controls.update();updateLOD();renderer.render(scene,camera);
  });
}
function listEvidence() {
  const h=focusFace.record;
  const root=$('#records');root.replaceChildren();
  const rows=[
    ['Číslo na půdorysu GIS',house.gisRecordedCp&&('Čp. '+house.gisRecordedCp+'. '+house.identityCorrection)],
    ['Předloha průčelí',h.front&&[h.front.filename,h.frontType,h.front.id].filter(Boolean).join(' · ')],
    ['Původní fotografie',h.original&&[h.photoAuthor,h.original.filename,h.original.id].filter(Boolean).join(' · ')],
    ['Odhadnuté části',house.estimateNote],['Podobné domy',house.analogues?.map(cp=>'čp. '+cp).join(', ')],
    ['Průčelní předloha',h.frontCredit],
    ['Předchozí registrace modelu',h.registrationModel&&[h.registrationModel.side,h.registrationModel.modelSha256].filter(Boolean).join(' · ')],
    ['Plány a letecký snímek',house.plans.join(' · ')],
    ['Rozměry modelu',focusFace.width.toLocaleString('cs-CZ',{maximumFractionDigits:2})+' × '+focusFace.height.toLocaleString('cs-CZ',{maximumFractionDigits:2})+' m. '+house.heightNote],
    ['Výběr uliční stěny',house.orientation],['Omezení',house.notes],
    ['Otisk předlohy',h.front?.sha256],['Otisk původní fotografie',h.original?.sha256]
  ];
  for(const [title,content] of rows)if(content){
    const t=document.createElement('dt'),d=document.createElement('dd');t.textContent=title;d.textContent=content;root.append(t,d);
  }
  for(const r of house.sourceFronts||[]){
    const t=document.createElement('dt'),d=document.createElement('dd');t.textContent='Archivní FRONT'+(r.facadeId?' · '+r.facadeId:'');
    const a=document.createElement('button');a.type='button';a.className='source-file';
    a.textContent=r.filename+(r.scope==='partial'?' · částečný záběr':'');
    a.onclick=()=>showOriginal({...house,original:null,frontMedia:r});d.append(a);root.append(t,d);
    if(r.original){
      const original=document.createElement('button');original.type='button';original.className='source-file';
      original.textContent='Původní snímek';original.onclick=()=>showOriginal({...house,original:r.original,contextPhoto:false});
      d.append(document.createTextNode(' · '),original);
    }
  }
  if(house.structureId){
    const a=document.createElement('a');a.href='https://libuse.vugtk.cz:3004/manager/structures/detail/'+house.structureId;
    a.target='_blank';a.rel='noopener';a.textContent='Karta domu v Libuši ↗';root.append(a);
  }
}
function home(overview=false) {
  if(!active)return;wide=overview;
  const {center,normal,axis,width,height}=wide?active:focusFace;
  controls.target.copy(center);
  const upper=focusFace.record.upperFrontPolygon;
  const extra=upper?Math.max(0,-Math.min(...upper.uv.map(p=>p[1])))*height:0;
  if(!wide)controls.target.y+=extra*.5;
  let span=Math.max((height+extra)*1.3,width/Math.max(.45,camera.aspect));
  if(wide){
    const bounds=new T.Box3();
    for(const object of streetHouses)bounds.expandByPoint(object.center);
    bounds.getCenter(controls.target);
    const size=bounds.getSize(new T.Vector3());
    span=Math.max(span,(Math.hypot(size.x,size.z)+width)/Math.max(.55,camera.aspect),height*2.5);
  }
  const distance=span/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2)))*(wide?1.15:1.25);
  camera.position.copy(controls.target).addScaledVector(normal,distance*(wide?.82:.98))
    .addScaledVector(axis,distance*(wide?.27:.16));
  camera.position.y+=distance*(wide?.72:.11);
  camera.lookAt(controls.target);controls.update();invalidate();
}
async function selectHouse(cp,reset=true) {
  const generation=++request;
  const walk=walkHouses(),found=walk.find(x=>keyOf(x)===String(cp))||walk.find(h=>h.streetId===Number(query.get('street')))||walk[0];
  const group=catalog.streets.find(s=>s.slug===found.slug);
  const sameStreet=catalog.houses.filter(h=>h.slug===group.slug);
  if(!assetCache.has(group.slug))assetCache.set(group.slug,json('ulice/'+group.slug+'.json').catch(err=>{assetCache.delete(group.slug);throw err}));
  if(street?.slug!==group.slug||renderedLayer!==layer){
    const context=await assetCache.get(group.slug);
    const models=await Promise.all(sameStreet.map(h=>context.models?.[keyOf(h)]||modelData(keyOf(h))));
    if(generation!==request)return;
    for(const old of streetHouses){for(const f of [old,...old.sides]){f.disposed=true;f.photoMat.dispose();f.upperPhoto?.material.dispose()}disposeGroup(old.group)}
    if(street&&street.slug!==group.slug){
      for(const pending of textures.values())pending.then(tex=>tex.dispose(),()=>{});
      textures.clear();
    }
    if(neighbors)disposeGroup(neighbors);
    streetContext=context;renderedLayer=layer;
    streetHouses=sameStreet.map((h,i)=>({...buildHouse(h,models[i],layer),record:h,lastLevel:''}));
    neighbors=surrounding(context,new Set(sameStreet.map(h=>h.footprintId)),layer);
    scene.add(neighbors,...streetHouses.map(obj=>obj.group));
  }
  const previousFace=house===found?focusFace?.record.faceId:!house?query.get('stena'):null;
  house=found;street=group;
  $('#street').value=street.slug;
  const choices=walk.filter(h=>h.slug===group.slug);
  $('#house').replaceChildren(...choices.map(h=>option(keyOf(h),address(h))));
  $('#house').value=keyOf(house);
  active=streetHouses.find(obj=>obj.record===house);
  focusFace=active.sides.find(f=>f.record.faceId===previousFace)||active;
  $('#face-choice').hidden=!active.sides.length;
  $('#face').replaceChildren(...[active,...active.sides].map(f=>option(f.record.faceId||'',faceName(f.record))));
  $('#face').value=focusFace.record.faceId||'';
  const index=walk.indexOf(house);
  $('#prev-house').disabled=index===0;$('#next-house').disabled=index===walk.length-1;
  $('#house-position').textContent=(choices.indexOf(house)+1)+' / '+choices.length+' v ulici';
  $('#place').textContent=street.name;
  $('#streetview').hidden=!!house.detached;
  const note=active.variant.credit;
  $('#author').textContent=note+' Průčelí v obou vrstvách zpracoval OpenAI · Codex (GPT-6).';
  setPressed('data-layer',layer);setPressed('data-mode',pickedMode);
  updateFace();
  if(reset)home();else invalidate();
}
function updateFace(){
  const h=focusFace.record,openings=[...h.openings,...(h.upperFrontPolygon?.openings||[])];
  const estimated=openings.filter(o=>o.evidence==='estimated').length,level=evidenceOf(h);
  $('#subtitle').textContent=address(house)+' · '+(h.faceId?faceName(h):evidenceName[level]);
  $('#certainty').textContent=openings.length?evidenceName[level]+' · doložené prvky '+(openings.length-estimated)+' · odhadnuté '+estimated:evidenceName[level]+' · hmota stavby';
  $('#certainty').classList.toggle('inferred',level==='estimated'||level==='mixed');
  $('#estimate-control').hidden=!estimated;
  $('#source').textContent=h.original?(h.contextPhoto?'Dobová fotografie okolí ↗':'Původní fotografie ↗'):h.frontMedia?'Archivní FRONT ↗':'Půdorys a podklad odhadu';
  $('#parcel').hidden=!h.original&&!h.frontMedia;
  $('[data-mode=foto]').textContent=h.texture?'Fotografická stěna':'Schematická textura';
  $('#evidence').textContent=h.shortNote||house.shortNote;
  stateUrl();listEvidence();
}

function localUrl(id){return localFiles.get(id)?.url}
function mediaURL(m){return m&&(localUrl(m.sha256)||(useLocal&&m.localMedia?'mistni/'+m.sha256:null)||m.publicUrl)}
function pictureURL(h){return mediaURL(h.texture)||h.sketch?.url}
function fetchTexture(url){
  if(!textures.has(url)){
    const entry=new T.TextureLoader().loadAsync(url).then(tex=>{
    tex.encoding=T.sRGBEncoding;tex.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);return tex;
    }).catch(error=>{if(textures.get(url)===entry)textures.delete(url);throw error});
    textures.set(url,entry);
  }
  return textures.get(url);
}
function loadPhoto(target){
  const url=pictureURL(target.record);
  if(!url||target.requestedURL===url)return;
  target.requestedURL=url;target.photoMat.userData.failed=false;
  const upperURL=mediaURL(target.record.upperTexture);
  if(target.upperPhoto&&upperURL)fetchTexture(upperURL).then(tex=>{
    if(!target.disposed){target.upperPhoto.material.map=tex;target.upperPhoto.material.needsUpdate=true;invalidate()}
  }).catch(()=>{});
  fetchTexture(url).then(tex=>{
    if(!target.disposed&&target.requestedURL===url){
      const sketch=url===target.record.sketch?.url;
      const [top,bottom]=sketch?[0,1]:target.record.coverage;
      target.photo.scale.y=bottom-top;target.photo.position.y=target.height*(1-bottom);
      target.photoMat.map=tex;target.photoMat.needsUpdate=true;target.sketchShown=sketch;invalidate();
    }
  }).catch(()=>{if(!target.disposed&&target.requestedURL===url){target.photoMat.userData.failed=true;invalidate()}});
}
function appearance(target) {
  const distance=camera.position.distanceTo(target.center);
  const px=target.height*canvas.clientHeight/(2*Math.max(.1,distance)*Math.tan(T.MathUtils.degToRad(camera.fov/2)));
  let level=pickedMode;
  if(level==='auto'){
    const far=target.lastLevel==='hmota'?64:52, near=target.lastLevel==='relief'?210:250;
    level=px<far?'hmota':px<near?'foto':'relief';
  }
  let message=level==='hmota'?'V tomto měřítku se zobrazuje hmota domu.':level==='relief'?'Okna a dveře mají vlastní ostění a hloubku.':'Fotografii nese jediná plocha ze dvou trojúhelníků.';
  if(level==='foto'){
    loadPhoto(target);
    if(target.photoMat.map&&target.sketchShown){
      message=target.record.texture?'Jedna plocha se schematickou kresbou. Fotografii zpřístupní místní balíček.':'Schéma otvorů je na jedné ploše ze dvou trojúhelníků.';
    }else if(!target.photoMat.map){
      if(pictureURL(target.record)&&!target.photoMat.userData.failed)message='Načítám fotografickou texturu…';
      else message='Zobrazuji reliéf. Fotografickou stěnu zpřístupní místní archivní balíček.';
    }
  }
  target.photo.visible=level==='foto'&&!!target.photoMat.map;
  if(target.photo.visible&&!target.sketchShown&&target.record.modelBasedFront)message='Registrovaný modelový pohled podle plánu je na jedné ploše.';
  target.relief.visible=level==='relief'||(level==='foto'&&!target.photo.visible);
  target.plain.visible=level==='hmota'||target.photo.visible;
  target.balconies.visible=target.relief.visible||(target.photo.visible&&!!target.record.balconyInPhoto);
  if(target.upperPhoto){
    target.upperPhoto.visible=target.photo.visible&&!target.sketchShown&&!!target.upperPhoto.material.map;
    if(target.upperPhoto.visible)message='Samostatná fotografická plocha pokrývá i zdobený štít.';
  }
  target.lastLevel=level;
  if(target===focusFace && $('#lod-status').textContent!==message)$('#lod-status').textContent=message;
}
function updateLOD() {
  if(!active)return;
  // Radius of an opposite street front is often less than the camera distance.
  // Remove foreground neighbours near the selected facade in a close elevation view.
  const frontClose=!wide && camera.position.clone().sub(focusFace.center).dot(focusFace.normal)>0;
  clipped.setFromNormalAndCoplanarPoint(focusFace.normal.clone().negate(),focusFace.center.clone().addScaledVector(focusFace.normal,2.6));
  for(const obj of streetHouses){
    obj.group.visible=obj===active||(!house.detached&&(!frontClose||clipped.distanceToPoint(obj.center)>=0));
    if(obj.group.visible)for(const f of [obj,...obj.sides])appearance(f);
  }
  for(const obj of neighbors.children){
    if(!obj.userData.ownMat){obj.material=obj.material.clone();obj.userData.ownMat=true}
    obj.material.clippingPlanes=frontClose?[clipped]:null;
  }
}
function zoom(factor){
  if(!active)return;
  const diff=camera.position.clone().sub(controls.target);
  const distance=T.MathUtils.clamp(diff.length()*factor,controls.minDistance,controls.maxDistance);
  camera.position.copy(controls.target).add(diff.setLength(distance));controls.update();invalidate();
}
async function showOriginal(h=focusFace?.record){
  if(!h)return;
  const file=h.original||h.frontMedia;
  if(!file){showPlan(h);return}
  dialogIsPlan=false;$('#parcel-map').hidden=true;
  const version=++sourceGeneration,dlg=$('#viewer');currentDialog=h;
  if(!dlg.open)dlg.showModal();
  $('#dialog-type').textContent=!h.original?(h.modelBasedFront?'Modelový FRONT podle plánu':'Archivní FRONT'):h.contextPhoto?'Kontextový archivní snímek':'Původní fotografie · Libuše';
  $('#dialog-title').textContent=h.street+' · '+address(h)+(h.faceId?' · '+faceName(h):'');
  const img=$('#original-image'),full=$('#full-image'),notice=$('#unavailable');
  img.removeAttribute('src');img.hidden=true;full.hidden=true;full.removeAttribute('href');
  const url=mediaURL(file);
  $('#photo-info').textContent=[h.frontReferenceOnly&&h.notes,h.photoAuthor,file.filename,file.id].filter(Boolean).join(' · ');
  $('#choose-pack').hidden=!!url;
  if(!url){
    notice.hidden=false;notice.textContent=file.localMedia?'Tento snímek je v městském balíčku. Vyberte jeho složku media nebo otevřete kartu domu v Libuši.':'Fotografii otevřete v místním archivu nebo na kartě domu v Libuši.';
    $('#choose-pack').textContent=file.localMedia?'Vybrat složku media':'Načíst místní balíček';
    if(h.structureId){full.href='https://libuse.vugtk.cz:3004/manager/structures/detail/'+h.structureId;full.textContent='Karta domu v Libuši ↗';full.hidden=false}
    return;
  }
  notice.hidden=false;notice.textContent='Načítám původní snímek…';
  try{
    const preload=new Image();preload.src=url;await preload.decode();
    if(version!==sourceGeneration || !dlg.open)return;
    img.src=url;img.alt='Dochovaná fotografie, '+h.street+', '+address(h);img.hidden=false;
    full.href=url;full.textContent='Celý originál ↗';full.hidden=false;notice.hidden=true;
  }catch{if(version===sourceGeneration){notice.textContent='Fotografii se nepodařilo otevřít. Lze načíst ověřenou kopii z balíčku.';$('#choose-pack').hidden=false}}
}
function showPlan(h=focusFace?.record){
  const body=streetHouses.find(o=>o.record.footprintId===h.footprintId);if(!body)return;
  const obj=body.sides.find(f=>f.record===h)||body;
  sourceGeneration++;currentDialog=h;dialogIsPlan=true;
  $('#dialog-type').textContent=h.detached?'Samostatná studie · pracovní půdorys':'Půdorys GIS · orientace průčelí';
  $('#dialog-title').textContent=h.street+' · '+address(h);
  $('#original-image').hidden=true;$('#original-image').removeAttribute('src');
  $('#unavailable').hidden=true;$('#choose-pack').hidden=true;
  const canvas=$('#parcel-map');canvas.hidden=false;
  const g=canvas.getContext('2d'),w=canvas.width,height=canvas.height;
  const foot=streetContext.buildings.find(b=>b.id===h.footprintId);
  const ring=(foot?.parts||body.variant.parts).flatMap(p=>p.outer);
  const xs=ring.map(p=>p[0]),zs=ring.map(p=>p[1]);
  const cx=(Math.min(...xs)+Math.max(...xs))/2,cz=(Math.min(...zs)+Math.max(...zs))/2;
  const scale=Math.min(w/(Math.max(...xs)-Math.min(...xs)+46),height/(Math.max(...zs)-Math.min(...zs)+34));
  const pixel=([x,z])=>[w/2+(x-cx)*scale,height/2+(z-cz)*scale];
  function line(ring,close=false){ring.forEach((p,i)=>g[i?'lineTo':'moveTo'](...pixel(p)));if(close)g.closePath()}
  g.fillStyle='#edeade';g.fillRect(0,0,w,height);
  g.lineWidth=4.2*scale;g.strokeStyle='#d2cbb8';g.beginPath();
  for(const path of streetContext.paths)line(path);g.stroke();
  for(const b of streetContext.buildings){
    if(h.detached&&b!==foot)continue;
    g.fillStyle=b===foot?'#dcba80':'#d3d2c3';g.strokeStyle=b===foot?'#745b36':'#a6aa98';g.lineWidth=1;
    g.beginPath();for(const p of b.parts){line(p.outer,true);for(const hole of p.holes)line(hole,true)}g.fill('evenodd');g.stroke();
  }
  g.strokeStyle='#245632';g.lineWidth=4;g.beginPath();line(obj.variant.edge);g.stroke();
  const meters=10,x=18,y=height-18;g.fillStyle='#263d34';g.fillRect(x,y,meters*scale,3);g.font='16px sans-serif';g.fillText('10 m',x,y-6);g.fillText('↑ N',w-50,25);
  $('#photo-info').textContent='Zelená čára vyznačuje modelovanou stěnu. '+(h.estimateNote||h.orientation||'');
  const full=$('#full-image'),url=h.mapURL||body.record.mapURL;full.textContent='Ortofoto z roku 1964 ↗';full.hidden=!url;
  if(url)full.href=url;else full.removeAttribute('href');
  if(!$('#viewer').open)$('#viewer').showModal();
}
async function readPack(file){
  const status=$('#pack-notice');
  try{
    status.textContent='Ověřuji fotografie a jejich kontrolní součty…';
    const maxSize=4096+[...officialFiles.values()].reduce((sum,rec)=>sum+4*Math.ceil(rec.bytes/3)+120,0);
    if(file.size>maxSize)throw Error('Soubor je větší než celý archiv tohoto pilotu.');
    const pack=JSON.parse(await file.text());
    if(pack.schema!=='most-front-1'||!Array.isArray(pack.images)||pack.images.length>officialFiles.size)throw Error('Soubor není archivní balíček tohoto pilotu.');
    const verified=new Map();
    for(const item of pack.images){
      const meta=officialFiles.get(item.sha256);
      if(!meta||verified.has(item.sha256)||typeof item.base64!=='string'||item.base64.length!==4*Math.ceil(meta.bytes/3))throw Error('Balíček obsahuje neznámý nebo poškozený soubor.');
      const bytes=Uint8Array.from(atob(item.base64),c=>c.charCodeAt(0));
      const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
      if(digest!==item.sha256||bytes.length!==meta.bytes)throw Error('Otisk souboru neodpovídá archivnímu záznamu.');
      verified.set(digest,new Blob([bytes],{type:meta.mime}));
    }
    if(!verified.size)throw Error('V balíčku chybějí fotografie.');
    for(const [id,blob] of verified)if(!localFiles.has(id))localFiles.set(id,{url:URL.createObjectURL(blob)});
    for(const obj of streetHouses)for(const f of [obj,...obj.sides])if(f.photoMat.userData.failed)f.requestedURL=null;
    status.textContent='Ověřeno '+localFiles.size+' souborů. Archiv je připraven.';
    if($('#viewer').open&&!dialogIsPlan)showOriginal(currentDialog);
    else if(reopenAfterPack)showOriginal(reopenAfterPack);
    reopenAfterPack=null;invalidate();
  }catch(error){status.textContent=error.message||'Balíček se nepodařilo otevřít.'}
}
async function readMedia(files){
  const status=$('#pack-notice');let count=0;
  try{
    for(const file of files){
      const meta=officialFiles.get(file.name);
      if(!meta||localFiles.has(file.name))continue;
      if(file.size!==meta.bytes)throw Error('Nesouhlasí velikost souboru '+file.name);
      const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer())),x=>x.toString(16).padStart(2,'0')).join('');
      if(digest!==file.name)throw Error('Nesouhlasí kontrolní součet souboru '+file.name);
      localFiles.set(digest,{url:URL.createObjectURL(file.slice(0,file.size,meta.mime))});
      if(++count%16===0)status.textContent='Ověřené soubory ve složce: '+count;
    }
    status.textContent='Ověřeno '+localFiles.size+' souborů. Archiv je připraven.';
    if(reopenAfterPack)await showOriginal(reopenAfterPack);
    reopenAfterPack=null;invalidate();
  }catch(error){status.textContent=error.message}
}
function report(err){$('#lod-status').textContent=err.message||'Zobrazení modelu se nepodařilo načíst.'}
function initScene(){
  renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.outputEncoding=T.sRGBEncoding;renderer.physicallyCorrectLights=true;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  renderer.setClearColor(0xe6e5d9);renderer.localClippingEnabled=true;
  scene.background=new T.Color(0xe6e5d9);scene.add(new T.HemisphereLight(0xfffcf3,0xd5c7b4,1.95));
  const sun=new T.DirectionalLight(0xffefd6,1.85);sun.position.set(-100,160,90);scene.add(sun);
  const ground=new T.Mesh(new T.PlaneGeometry(6000,6000),new T.MeshLambertMaterial({color:0xd5d4c2}));
  ground.rotation.x=-Math.PI/2;ground.position.y=-.025;scene.add(ground);
  camera=new T.PerspectiveCamera(39,1,.1,3500);
  controls=new OrbitControls(camera,canvas);controls.enableDamping=false;controls.maxPolarAngle=Math.PI*.486;
  controls.minDistance=2;controls.maxDistance=1300;controls.addEventListener('change',invalidate);
  const resize=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix();invalidate()};
  new ResizeObserver(resize).observe(canvas);resize();
  let down;
  canvas.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});
  canvas.addEventListener('pointerup',e=>{
    if(!active||e.button!==0||!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>4)return;
    const r=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);
    const meshes=[];
    for(const obj of streetHouses)obj.group.traverseVisible(n=>{if(n.isMesh){n.userData.record??=obj.record;meshes.push(n)}});
    const hit=ray.intersectObjects(meshes,false)[0];if(!hit)return;
    const obstruction=ray.intersectObjects(neighbors.children,false).find(h=>!h.object.material.clippingPlanes?.length||clipped.distanceToPoint(h.point)>=0);
    if(!obstruction||hit.distance<=obstruction.distance+.02)showOriginal(hit.object.userData.record);
  });
}
async function main(){
  catalog=await json('domy.json');
  if(catalog.unassigned?.length){
    $('#unassigned').hidden=false;
    $('#unassigned-file').replaceChildren(...catalog.unassigned.map((r,i)=>option(i,r.street+' · '+(r.cp||'bez čp.')+' · '+r.media.filename)));
    $('#unassigned-open').onclick=()=>{const r=catalog.unassigned[Number($('#unassigned-file').value)];showOriginal({street:'Nepřiřazený FRONT · '+r.street,cp:r.cp,frontMedia:r.media})};
    for(const r of catalog.unassigned)for(const file of [r.media,r.media.original])if(file?.sha256)officialFiles.set(file.sha256,file);
  }
  for(const h of catalog.houses)for(const f of [h,...(h.sides||[])])for(const rec of [f.original,f.frontMedia,f.texture,f.upperTexture,...(f.sourceFronts||[]).flatMap(r=>[r,r.original])])if(rec?.sha256)officialFiles.set(rec.sha256,rec);
  const syncStreets=()=>$('#street').replaceChildren(...catalog.streets.filter(s=>walkHouses().some(h=>h.slug===s.slug)).map(s=>option(s.slug,s.name)));
  syncStreets();$('#front-only').checked=onlyFront;
  initScene();
  $('#street').onchange=()=>selectHouse(keyOf(walkHouses().find(h=>h.slug===$('#street').value))).catch(report);
  $('#front-only').onchange=e=>{onlyFront=e.target.checked;syncStreets();const w=walkHouses();selectHouse(keyOf(w.includes(house)?house:w.find(h=>h.slug===house.slug)||w[0])).catch(report)};
  $('#house').onchange=()=>selectHouse($('#house').value).catch(report);
  $('#face').onchange=()=>{focusFace=active.sides.find(f=>f.record.faceId===$('#face').value)||active;updateFace();home()};
  for(const [id,step] of [['#prev-house',-1],['#next-house',1]])$(id).onclick=()=>{
    const walk=walkHouses(),next=walk[walk.indexOf(house)+step];if(next)selectHouse(keyOf(next)).catch(report);
  };
  $('#mark-estimates').onchange=e=>{markEstimatedOpenings(e.target.checked);invalidate()};
  all('[data-mode]').forEach(b=>b.onclick=()=>{pickedMode=b.dataset.mode;setPressed('data-mode',pickedMode);stateUrl();invalidate()});
  all('[data-layer]').forEach(b=>b.onclick=()=>{layer=b.dataset.layer;selectHouse(keyOf(house),false).catch(report)});
  $('#near').onclick=()=>home();$('#streetview').onclick=()=>home(true);
  $('#zoomin').onclick=()=>zoom(.74);$('#zoomout').onclick=()=>zoom(1/.74);
  $('#source').onclick=()=>showOriginal();
  $('#parcel').onclick=()=>showPlan();
  $('#close').onclick=()=>{currentDialog=null;sourceGeneration++;$('#viewer').close()};
  $('#viewer').addEventListener('close',()=>{
    currentDialog=null;sourceGeneration++;
    const url=new URL(location.href);
    if(url.searchParams.has('pramen')){url.searchParams.delete('pramen');history.replaceState(null,'',url)}
  });
  $('#choose-pack').onclick=()=>{reopenAfterPack=currentDialog;$('#viewer').close();$((reopenAfterPack.original||reopenAfterPack.frontMedia)?.localMedia?'#media-folder':'#pack').click()};
  $('#pack').addEventListener('cancel',()=>{if(reopenAfterPack)showOriginal(reopenAfterPack);reopenAfterPack=null});
  $('#pack').onchange=()=>{const f=$('#pack').files[0];if(f)readPack(f);$('#pack').value=''};
  $('#media-folder').onchange=()=>{const files=[...$('#media-folder').files];if(files.length)readMedia(files);$('#media-folder').value=''};
  $('#media-folder').addEventListener('cancel',()=>{if(reopenAfterPack)showOriginal(reopenAfterPack);reopenAfterPack=null});
  const streetStart=catalog.houses.find(h=>h.streetId===Number(query.get('street')));
  const parcelStart=query.has('gis')&&catalog.houses.find(h=>String(h.footprintId)===query.get('gis'));
  await selectHouse((query.has('studie')&&'studie-'+query.get('studie'))||(parcelStart&&keyOf(parcelStart))||query.get('cp')||(streetStart&&keyOf(streetStart))||'266');
  if(useLocal){
    try{const r=await fetch('archiv.mostfront');if(r.ok)await readPack(await r.blob());else throw Error()}
    catch{$('#pack-notice').textContent='Místní balíček vyberte ze souboru.'}
  }
  if(query.get('pramen')==='1')await showOriginal();
}
main().catch(report);
