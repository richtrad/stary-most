import * as T from 'three';
import {OrbitControls} from '../vendor/OrbitControls.js';
import {surrounding,buildHouse,disposeGroup} from './model.js';

const $=s=>document.querySelector(s), all=s=>[...document.querySelectorAll(s)];
const query=new URLSearchParams(location.search), ray=new T.Raycaster();
const assetCache=new Map(), localFiles=new Map(), officialFiles=new Map();
const geoCache=new Map(), textures=new Map(), clipped=new T.Plane();
const canvas=$('#scene'), scene=new T.Scene();
let catalog,house,street,active,neighbors,camera,renderer,controls,request=0;
let streetHouses=[];
let pickedMode=['auto','relief','foto'].includes(query.get('lod'))?query.get('lod'):'auto';
let layer=query.get('layer')==='claude'?'claude':'gpt',wide=false,frame=0;
let currentDialog=null, sourceGeneration=0;
const localHost=['127.0.0.1','localhost','[::1]'].includes(location.hostname);

async function json(url) {
  const r=await fetch(url); if(!r.ok)throw Error('Soubor se nepodařilo načíst ('+r.status+').');
  return r.json();
}
function modelData(cp) {
  if(!geoCache.has(cp))geoCache.set(cp,json('modely/'+cp+'.json').catch(err=>{geoCache.delete(cp);throw err}));
  return geoCache.get(cp);
}
function option(value,label) { return new Option(label,value); }
function setPressed(attr,value) {all('button['+attr+']').forEach(b=>b.setAttribute('aria-pressed',String(b.getAttribute(attr)===value)))}
function stateUrl(){
  const url=new URL(location.href);
  url.searchParams.set('cp',house.cp);url.searchParams.set('lod',pickedMode);url.searchParams.set('layer',layer);
  history.replaceState(null,'',url);
  const back=new URL('../',location.href);back.searchParams.set('street',house.streetId);
  back.searchParams.set('layer',layer);back.searchParams.set('view','street');
  $('#atlas').href=back.href;
}
function invalidate() {
  if(renderer&&!frame)frame=requestAnimationFrame(()=>{
    frame=0;controls.update();updateLOD();renderer.render(scene,camera);
  });
}
function listEvidence() {
  const root=$('#records');root.replaceChildren();
  const rows=[
    ['Databázový FRONT',house.front.filename+' · '+house.frontType+' · '+house.front.id],
    ['Původní fotografie',[house.photoAuthor,house.original.filename,house.original.id].filter(Boolean).join(' · ')],
    ['Průčelní předloha',house.frontCredit],
    ['Plány a letecký snímek',house.plans.join(' · ')],
    ['Rozměry modelu',active.width.toLocaleString('cs-CZ',{maximumFractionDigits:2})+' × '+active.height.toLocaleString('cs-CZ',{maximumFractionDigits:2})+' m. '+house.heightNote],
    ['Výběr uliční stěny',house.orientation],['Omezení',house.notes],
    ['Otisk FRONTu',house.front.sha256],['Otisk původní fotografie',house.original.sha256]
  ];
  for(const [title,content] of rows)if(content){
    const t=document.createElement('dt'),d=document.createElement('dd');t.textContent=title;d.textContent=content;root.append(t,d);
  }
  if(house.structureId){
    const a=document.createElement('a');a.href='https://libuse.vugtk.cz:3004/manager/structures/detail/'+house.structureId;
    a.target='_blank';a.rel='noopener';a.textContent='Karta domu v Libuši ↗';root.append(a);
  }
}
function home(overview=false) {
  if(!active)return;wide=overview;
  const {center,normal,axis,width,height}=active;
  const span=Math.max(height*1.3,width/Math.max(.45,camera.aspect));
  const distance=span/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2)))*(wide?3.2:1.25);
  controls.target.copy(center);
  camera.position.copy(center).addScaledVector(normal,distance*(wide?.82:.98))
    .addScaledVector(axis,distance*(wide?.27:.16));
  camera.position.y+=distance*(wide?.72:.11);
  camera.lookAt(center);controls.update();invalidate();
}
async function selectHouse(cp,reset=true) {
  const generation=++request;
  const found=catalog.houses.find(x=>x.cp===String(cp))||catalog.houses.find(h=>h.streetId===Number(query.get('street')))||catalog.houses[0];
  const group=catalog.streets.find(s=>s.slug===found.slug);
  const sameStreet=catalog.houses.filter(h=>h.slug===group.slug);
  if(!assetCache.has(group.slug))assetCache.set(group.slug,json('ulice/'+group.slug+'.json').catch(err=>{assetCache.delete(group.slug);throw err}));
  const [models,context]=await Promise.all([Promise.all(sameStreet.map(h=>modelData(h.cp))),assetCache.get(group.slug)]);
  if(generation!==request)return;
  for(const old of streetHouses){old.disposed=true;disposeGroup(old.group);old.photoMat.dispose()}
  if(neighbors)disposeGroup(neighbors);
  house=found;street=group;
  $('#street').value=street.slug;
  $('#house').replaceChildren(...catalog.houses.filter(h=>h.slug===street.slug).map(h=>option(h.cp,'Čp. '+h.cp)));
  $('#house').value=house.cp;
  streetHouses=sameStreet.map((h,i)=>({...buildHouse(h,models[i],layer),record:h,lastLevel:''}));
  active=streetHouses.find(obj=>obj.record===house);
  neighbors=surrounding(context,new Set(sameStreet.map(h=>h.footprintId)),layer);
  scene.add(neighbors,...streetHouses.map(obj=>obj.group));
  $('#place').textContent=street.name;
  $('#subtitle').textContent='Čp. '+house.cp+' · '+house.openings.length+' zaměřených prvků';
  const note=active.variant.credit;
  $('#author').textContent=note+' Průčelí v obou vrstvách zpracoval OpenAI · Codex (GPT-6).';
  $('#evidence').textContent=house.shortNote;
  setPressed('data-layer',layer);setPressed('data-mode',pickedMode);
  stateUrl();listEvidence();
  if(reset)home();else invalidate();
}

function localUrl(id){return localFiles.get(id)?.url}
function pictureURL(h){ return localUrl(h.texture.sha256)||h.texture.publicUrl }
function loadPhoto(target){
  const url=pictureURL(target.record);
  if(!url||target.requestedURL===url)return;
  target.requestedURL=url;target.photoMat.userData.failed=false;
  if(!textures.has(url))textures.set(url,new T.TextureLoader().loadAsync(url).then(tex=>{
    tex.encoding=T.sRGBEncoding;tex.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);return tex;
  }).catch(error=>{textures.delete(url);throw error}));
  textures.get(url).then(tex=>{
    if(!target.disposed&&target.requestedURL===url){target.photoMat.map=tex;target.photoMat.needsUpdate=true;invalidate()}
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
    if(!target.photoMat.map){
      if(pictureURL(target.record)&&!target.photoMat.userData.failed)message='Načítám fotografickou texturu…';
      else message='Zobrazuji reliéf. Fotografickou stěnu zpřístupní místní archivní balíček.';
    }
  }
  target.photo.visible=level==='foto'&&!!target.photoMat.map;
  target.relief.visible=level==='relief'||(level==='foto'&&!target.photo.visible);
  target.plain.visible=level==='hmota'||(target.photo.visible&&(target.record.coverage[0]>0||target.record.coverage[1]<1));
  target.lastLevel=level;
  if(target===active && $('#lod-status').textContent!==message)$('#lod-status').textContent=message;
}
function updateLOD() {
  if(!active)return;
  streetHouses.forEach(appearance);
  // Radius of an opposite street front is often less than the camera distance.
  // Remove foreground neighbours near the selected facade in a close elevation view.
  const frontClose=!wide && camera.position.clone().sub(active.center).dot(active.normal)>0;
  clipped.setFromNormalAndCoplanarPoint(active.normal.clone().negate(),active.center.clone().addScaledVector(active.normal,2.6));
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
async function showOriginal(h=house){
  if(!h)return;
  const version=++sourceGeneration,dlg=$('#viewer');currentDialog=h;
  if(!dlg.open)dlg.showModal();
  $('#dialog-type').textContent='Původní fotografie · Libuše';
  $('#dialog-title').textContent=h.street+' · čp. '+h.cp;
  const img=$('#original-image'),full=$('#full-image'),notice=$('#unavailable');
  img.removeAttribute('src');img.hidden=true;full.hidden=true;full.removeAttribute('href');
  const url=localUrl(h.original.sha256)||h.original.publicUrl;
  $('#photo-info').textContent=[h.photoAuthor,h.original.filename,h.original.id].filter(Boolean).join(' · ');
  $('#choose-pack').hidden=!!url;
  if(!url){
    notice.hidden=false;notice.textContent='Tento archivní originál je v místním balíčku pro tři ulice. Načtěte ho jednou pro všechny domy.';
    if(h.structureId){full.href='https://libuse.vugtk.cz:3004/manager/structures/detail/'+h.structureId;full.textContent='Karta domu v Libuši ↗';full.hidden=false}
    return;
  }
  notice.hidden=false;notice.textContent='Načítám původní snímek…';
  try{
    const preload=new Image();preload.src=url;await preload.decode();
    if(version!==sourceGeneration || !dlg.open)return;
    img.src=url;img.alt='Dochovaná fotografie, '+h.street+', čp. '+h.cp;img.hidden=false;
    full.href=url;full.textContent='Celý originál ↗';full.hidden=false;notice.hidden=true;
  }catch{if(version===sourceGeneration){notice.textContent='Fotografii se nepodařilo otevřít. Lze načíst ověřenou kopii z balíčku.';$('#choose-pack').hidden=false}}
}
async function readPack(file){
  const status=$('#pack-notice');
  try{
    status.textContent='Ověřuji fotografie a jejich kontrolní součty…';
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
    for(const obj of streetHouses)if(obj.photoMat.userData.failed)obj.requestedURL=null;
    status.textContent='Ověřeno '+localFiles.size+' souborů. Archiv je připraven.';
    if($('#viewer').open)showOriginal(currentDialog);invalidate();
  }catch(error){status.textContent=error.message||'Balíček se nepodařilo otevřít.'}
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
    for(const obj of streetHouses)obj.group.traverseVisible(n=>{if(n.isMesh){n.userData.record=obj.record;meshes.push(n)}});
    const hit=ray.intersectObjects(meshes,false)[0];if(!hit)return;
    const obstruction=ray.intersectObjects(neighbors.children,false).find(h=>!h.object.material.clippingPlanes?.length||clipped.distanceToPoint(h.point)>=0);
    if(!obstruction||hit.distance<=obstruction.distance+.02)showOriginal(hit.object.userData.record);
  });
}
async function main(){
  catalog=await json('domy.json');
  for(const h of catalog.houses)for(const rec of [h.original,h.texture])officialFiles.set(rec.sha256,rec);
  $('#street').replaceChildren(...catalog.streets.map(s=>option(s.slug,s.name)));
  initScene();
  $('#street').onchange=()=>selectHouse(catalog.houses.find(h=>h.slug===$('#street').value).cp).catch(report);
  $('#house').onchange=()=>selectHouse($('#house').value).catch(report);
  all('[data-mode]').forEach(b=>b.onclick=()=>{pickedMode=b.dataset.mode;setPressed('data-mode',pickedMode);stateUrl();invalidate()});
  all('[data-layer]').forEach(b=>b.onclick=()=>{layer=b.dataset.layer;selectHouse(house.cp,false).catch(report)});
  $('#near').onclick=()=>home();$('#streetview').onclick=()=>home(true);
  $('#zoomin').onclick=()=>zoom(.74);$('#zoomout').onclick=()=>zoom(1/.74);
  $('#source').onclick=()=>showOriginal();
  $('#close').onclick=()=>{currentDialog=null;sourceGeneration++;$('#viewer').close()};
  $('#viewer').addEventListener('close',()=>{currentDialog=null;sourceGeneration++});
  $('#choose-pack').onclick=()=>{$('#viewer').close();$('#pack').click()};
  $('#pack').onchange=()=>{const f=$('#pack').files[0];if(f)readPack(f);$('#pack').value=''};
  const streetStart=catalog.houses.find(h=>h.streetId===Number(query.get('street')));
  await selectHouse(query.get('cp')||streetStart?.cp||'266');
  if(localHost && query.get('archiv')==='mistni'){
    try{const r=await fetch('archiv.mostfront');if(r.ok)await readPack(await r.blob());else throw Error()}
    catch{$('#pack-notice').textContent='Místní balíček vyberte ze souboru.'}
  }
}
main().catch(report);
