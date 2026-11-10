import * as T from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {publicSpace} from './prostor/scena.js';
import {buildTrees} from './stromy/stromy.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

const vec = (a,b,c) => new T.Vector3(a,b,c);
const rad = T.MathUtils.degToRad;
const ground = 0.04;
const LAYERS = ['claude','gpt'];
export function buildMap(canvas, city, houses, catalog, onHouse, onPhoto, onTree, message, landData, onLand) {
  const renderer = new T.WebGLRenderer({canvas, antialias:true, alpha:false, powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,2));
  T.ColorManagement.legacyMode = false;
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.physicallyCorrectLights = true;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.localClippingEnabled = true;
  const scene = new T.Scene();
  scene.background = new T.Color(0xe9e8db);
  const camera = new T.PerspectiveCamera(40,1,0.15,15000);
  const controls = new OrbitControls(camera,canvas);
  controls.maxPolarAngle = Math.PI * 0.485;
  controls.minDistance = 1.25;
  controls.maxDistance = 10000;
  controls.enableDamping = true;
  controls.dampingFactor = 0.14;
  controls.zoomSpeed = 1.12;
  scene.add(new T.HemisphereLight(0xfffbef,0xc7c1aa,1.45));
  const sun = new T.DirectionalLight(0xfff7e5,2.1);
  sun.position.set(-350,640,320);
  scene.add(sun);
  const floor = new T.Mesh(new T.PlaneGeometry(40000,40000),new T.MeshBasicMaterial({color:0xe9e8db,toneMapped:false}));
  floor.rotation.x = -Math.PI/2;
  floor.position.y = -0.06;
  scene.add(floor);

  const vegetation=catalog?buildTrees(scene,city,catalog):null;
  let treeArea='all',treeFocus=null,treeMode='crowns';
  function setTrees(mode,quality,area,id) {
    vegetation?.configure(mode,quality);
    treeArea=area;treeFocus=id;treeMode=mode;needsRender=true;
  }

  const land=landData?publicSpace(scene,landData,()=>{needsRender=true},()=>message('3D vrstva povrchů se nenačetla. Prameny jsou dostupné na ortofotu.')):null;
  let landZone='P',landFocus=null;
  function setSpace(categories,zone,id) {
    land?.configure(categories);landZone=zone;landFocus=id;
  }
  function shell(parts,height) {
    const shapes = [];
    for (const [outer,holes] of parts) {
      if (outer.length < 3) continue;
      const path = ring => ring.map(([x,z]) => new T.Vector2(x,-z));
      const s = new T.Shape(path(outer));
      for (const ring of holes) if (ring.length >= 3) s.holes.push(new T.Path(path(ring)));
      shapes.push(s);
    }
    return new T.ExtrudeGeometry(shapes,{depth:height,bevelEnabled:false,curveSegments:1}).rotateX(-Math.PI/2);
  }
  const contextPositions = [], contextNormals = [], contextColors = [], topLines = [], pilots = {};
  const byId = Object.fromEntries(Object.values(houses).map(h=>[h.id,h.cp]));
  const palette = [0x9ba797,0xb4b8a2,0x929e91,0xa3ac99].map(n=>new T.Color(n));
  const wall = new T.Color(0xbcb5a5);
  const proxyMat = new T.MeshLambertMaterial({color:0x9f795d});
  const plinthMat = new T.MeshLambertMaterial({color:0x9e9a88});
  for (const [id,height,parts] of city.buildings) {
    const geo = shell(parts,height);
    if (byId[id]) {
      const cp = byId[id];
      const proxy = new T.Mesh(geo,proxyMat);
      proxy.userData.cp = cp;
      scene.add(proxy);
      const plinth = new T.Mesh(shell(parts,Math.max(0.01,houses[cp].position[1])),plinthMat);
      scene.add(plinth);
      pilots[cp] = {proxy, anchor:vec(...houses[cp].position), models:{}};
      continue;
    }
    for(const [outer,holes] of parts)for(const ring of [outer,...holes])for(let i=0;i<ring.length;i++){
      const a=ring[i],b=ring[(i+1)%ring.length];
      topLines.push(a[0],height+.03,a[1],b[0],height+.03,b[1]);
    }
    const pos=geo.getAttribute('position'), norm=geo.getAttribute('normal');
    for (let i=0;i<pos.count;i++) {
      contextPositions.push(pos.getX(i),pos.getY(i),pos.getZ(i));
      contextNormals.push(norm.getX(i),norm.getY(i),norm.getZ(i));
      const color=norm.getY(i)>0.6?palette[id%palette.length]:wall;
      contextColors.push(color.r,color.g,color.b);
    }
    geo.dispose();
  }
  const combined = new T.BufferGeometry();
  combined.setAttribute('position',new T.Float32BufferAttribute(contextPositions,3));
  combined.setAttribute('normal',new T.Float32BufferAttribute(contextNormals,3));
  combined.setAttribute('color',new T.Float32BufferAttribute(contextColors,3));
  const contextMat = new T.MeshStandardMaterial({vertexColors:true,roughness:1});
  const outlineGeo=new T.BufferGeometry();
  outlineGeo.setAttribute('position',new T.Float32BufferAttribute(topLines,3));
  const outlineMat=new T.LineBasicMaterial({color:0x627464,transparent:true,opacity:.48,depthWrite:false,toneMapped:false});
  scene.add(new T.LineSegments(outlineGeo,outlineMat));
  const cityMesh = new T.Mesh(combined,contextMat);
  scene.add(cityMesh);
  const roads = [], kulovaRoad = [];
  for (const [pathId,path] of city.streets.entries()) for(let i=1;i<path.length;i++) {
    const [ax,az]=path[i-1],[bx,bz]=path[i];
    const len=Math.hypot(bx-ax,bz-az);
    if(!len) continue;
    const x=-(bz-az)*1.85/len, z=(bx-ax)*1.85/len;
    (city.detailedRoadIndices.includes(pathId)?kulovaRoad:roads).push(ax+x,ground,az+z,bx-x,ground,bz-z,ax-x,ground,az-z, ax+x,ground,az+z,bx+x,ground,bz+z,bx-x,ground,bz-z);
  }
  const roadMat=new T.MeshBasicMaterial({color:0xc5c3ad,side:T.DoubleSide,toneMapped:false});
  function roadMesh(vertices){
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
    const mesh=new T.Mesh(geo,roadMat);scene.add(mesh);return mesh;
  }
  roadMesh(roads);
  const coarseKulova=roadMesh(kulovaRoad);
  const streetGround=new T.Group();scene.add(streetGround);
  let surfaceState='idle';
  const groups = Object.fromEntries(LAYERS.map(key=>{const g=new T.Group();g.name=key;scene.add(g);return [key,g]}));
  const loader=new GLTFLoader(), ray=new T.Raycaster();
  const axisY=vec(0,1,0);
  const pending=new Map(), failures=new Set();
  let cp='262',layer='claude',view='city',flight=null,handMoved=false,usingDetails=false,dirty=false;
  let injectedStatus='', lastStatus='', needsRender=true;
  let surface='original';
  const surfaceBindings=[];
  controls.addEventListener('change',()=>{needsRender=true});
  const localToCity=(p,h)=>p.clone().applyAxisAngle(axisY,rad(h.yaw)).add(vec(...h.position));
  function face(h) {
    const [[x1,z1],[x2,z2]]=h.edge;
    const len=Math.hypot(x2-x1,z2-z1);
    const direction=vec((x2-x1)/len,0,(z2-z1)/len);
    const normal=vec(-direction.z,0,direction.x);
    const center=localToCity(vec((x1+x2)/2,h.eyeHeight,(z1+z2)/2),h);
    return {center,normal:normal.applyAxisAngle(axisY,rad(h.yaw)),len};
  }
  function status() {
    const key=cp+'-'+layer, item=pilots[cp].models[layer];
    const s=injectedStatus || (view==='facade' && usingDetails ? (!houses[cp].variants[layer].url ? 'Zobrazen je půdorys. Pro detail této revize vyberte její GLB v části Místní modely.' : failures.has(key) ? 'Model se nepodařilo načíst. Znovu otevřete vrstvu.' : item ? 'Kliknutím na doložené průčelí otevřete původní fotografii.' : 'Načítám model domu…') : view==='prostor'?(land?.status()==='error'?'3D povrchy se nepodařilo načíst. Otevřete mapu na ortofotu.':'Kliknutím na cestu, trávník nebo uliční prvek otevřete jeho pramen.'):view==='trees'?(treeMode==='off'?'Vrstva stromů je skrytá.':'Kliknutím na strom otevřete jeho letecký pramen.'):view==='street'?'Označený dům přiblížíte kliknutím.':'Tažení otáčí pohled. Kolečkem nebo dvěma prsty změníte měřítko.');
    if(s!==lastStatus){message(s);lastStatus=s}
  }
  function registerMaterials(model,swatches) {
    const plainBySource=new Map();
    function makePlain(source) {
      if(plainBySource.has(source))return plainBySource.get(source);
      const slots=Object.keys(source).filter(slot=>source[slot]?.isTexture && slot!=='envMap');
      if(!slots.length){plainBySource.set(source,source);return source}
      const plain=source.clone();
      const tint=swatches?.[source.name];
      if(source.map && tint && plain.color)plain.color.multiply(new T.Color(tint));
      for(const slot of slots)plain[slot]=null;
      plainBySource.set(source,plain);
      return plain;
    }
    model.traverse(mesh=>{
      if(!mesh.isMesh)return;
      const original=mesh.material;
      const plain=Array.isArray(original)?original.map(makePlain):makePlain(original);
      if(plain===original)return;
      surfaceBindings.push({mesh,original,plain});
      if(surface==='materials')mesh.material=plain;
    });
  }
  function setSurface(next) {
    if(surface===next)return;
    surface=next;
    for(const binding of surfaceBindings)
      binding.mesh.material=next==='materials'?binding.plain:binding.original;
    needsRender=true;
  }
  async function loadModel(code,key) {
    const data=houses[code], p=pilots[code], token=code+'-'+key;
    if(!data.variants[key].url || p.models[key] || pending.has(token) || failures.has(token)) return;
    pending.set(token,true);
    try {
      const requested=data.variants[key].url;
      const file=await loader.loadAsync(requested);
      if(data.variants[key].url!==requested) return;
      const group=new T.Group();
      group.position.copy(p.anchor);
      group.rotation.y=rad(data.yaw);
      group.name='cp'+code;
      group.add(file.scene);
      registerMaterials(group,data.variants[key].textureSwatches);
      group.traverse(o=>{if(o.isMesh) o.userData.cp=code});
      groups[key].add(group);
      group.updateMatrixWorld(true);
      p.models[key]=group;
    } catch(err) {
      failures.add(token);
      console.error('Model '+token,err);
    } finally {pending.delete(token);needsRender=true;dirty=true;updateLevel();status()}
  }
  async function loadGround() {
    if(!city.streetSurfaceModels.length || surfaceState!=='idle')return;
    surfaceState='loading';
    try{
      const files=await Promise.all(city.streetSurfaceModels.map(url=>loader.loadAsync(url)));
      for(const file of files)streetGround.add(file.scene);
      land?.bindStreet(streetGround);
      surfaceState='ready';
    }catch(e){surfaceState='error';console.error('Povrch ulice',e)}
    dirty=true;needsRender=true;updateLevel();
  }
  function updateLevel() {
    const target=controls.target;
    const near=camera.position.distanceTo(target)<350 && Math.hypot(target.x+27,target.z+120)<235;
    if(near===usingDetails && !dirty) return;
    dirty=false;usingDetails=near;
    if(near)loadGround();
    streetGround.visible=near&&surfaceState==='ready';coarseKulova.visible=!streetGround.visible;
    land?.setNear(streetGround.visible);
    for(const key of LAYERS) groups[key].visible=near && key===layer;
    for(const [code,p] of Object.entries(pilots)) {
      if(near) loadModel(code,layer);
      p.proxy.visible=!(near && p.models[layer]);
    }
    status();
  }
  function destinations(mode) {
    if(mode==='facade') {
      const {center,normal,len}=face(houses[cp]);
      const h=houses[cp], dist=Math.max(h.height*.76/Math.tan(rad(20)),len*.72/(Math.tan(rad(20))*camera.aspect),17);
      const aim=center.clone().add(vec(0,1.3,0));
      return [aim,aim.clone().addScaledVector(normal,dist).add(vec(0,1.8,0))];
    }
    if(mode==='prostor' && land) {
      const box=land.bounds(landZone,landFocus);
      const t=box.getCenter(new T.Vector3());
      const dir=vec(.08,.94,.43).normalize(),right=axisY.clone().cross(dir).normalize(),up=dir.clone().cross(right);
      const tanY=Math.tan(rad(camera.fov/2)),tanX=tanY*camera.aspect;
      let distance=landFocus?26:65;
      for(const x of [box.min.x,box.max.x])for(const z of [box.min.z,box.max.z]){
        const offset=vec(x,0,z).sub(t);
        distance=Math.max(distance,offset.dot(dir)+1.15*Math.max(Math.abs(offset.dot(right))/tanX,Math.abs(offset.dot(up))/tanY));
      }
      return [t,t.clone().addScaledVector(dir,distance)];
    }
    if(mode==='trees' && vegetation) {
      const {aim,width,depth}=vegetation.bounds(treeArea,treeFocus);
      const dist=Math.max(treeFocus?16:32,(width*.60+depth*.20)/camera.aspect,depth*.64+width*.10)/Math.tan(rad(20));
      const dir=vec(.33,.85,.72).normalize();
      return [aim,aim.clone().addScaledVector(dir,dist)];
    }
    if(mode==='street') {
      const t=vec(-28,3,-121), k=Math.max(1,1.24/camera.aspect);
      return [t,t.clone().addScaledVector(vec(5,90,109),k)];
    }
    const t=vec(0,0,0);
    
    const dir=vec(0.23,1.38,0.78).normalize();
    const right=axisY.clone().cross(dir).normalize();
    const up=dir.clone().cross(right);
    const tanV=Math.tan(rad(camera.fov/2)), tanH=tanV*camera.aspect;
    let dist=0;
    for(const [,,parts] of city.buildings) for(const [outer] of parts) for(const [x,z] of outer){
      const v=vec(x,0,z);
      dist=Math.max(dist,v.dot(dir)+Math.max(Math.abs(v.dot(right))/tanH,Math.abs(v.dot(up))/tanV)*1.065);
    }
    return [t,t.clone().addScaledVector(dir,dist)];
  }
  function setHouse(code,key,mode,instant=false,preserve=false) {
    const prev=cp, prevMode=view, oldLayer=layer;
    cp=code;layer=key;view=mode;injectedStatus='';
    if(oldLayer!==layer && failures.has(cp+'-'+layer)) failures.delete(cp+'-'+layer);
    const h=houses[cp], f=face(h);
    contextMat.clippingPlanes=mode==='facade'?[new T.Plane().setFromNormalAndCoplanarPoint(f.normal.clone().negate(),f.center.clone().addScaledVector(f.normal,2.5))]:[];
    outlineMat.clippingPlanes=contextMat.clippingPlanes;
    outlineMat.needsUpdate=true;contextMat.needsUpdate=true;
    needsRender=true;
    if(!preserve || prev!==cp || prevMode!==view) {
      handMoved=false;
      const [target,pos]=destinations(mode);
      if(instant || matchMedia('(prefers-reduced-motion:reduce)').matches){flight=null;controls.target.copy(target);camera.position.copy(pos);controls.update()}
      else {
        const f0=camera.position.clone().sub(controls.target), f1=pos.clone().sub(target);
        flight={start:performance.now(),t0:controls.target.clone(),t1:target,d0:f0.length(),d1:f1.length(),dir0:f0.normalize(),dir1:f1.normalize()};
      }
    }
    dirty=true;updateLevel();status();
  }
  controls.addEventListener('start',()=>{flight=null;handMoved=true});
  function zoom(factor) {
    flight=null;handMoved=true;
    const delta=camera.position.clone().sub(controls.target);
    delta.setLength(T.MathUtils.clamp(delta.length()*factor,controls.minDistance,controls.maxDistance));
    camera.position.copy(controls.target).add(delta);controls.update();dirty=true;
  }
  let wheelAnchor=null;
  canvas.addEventListener('wheel',e=>{
    const r=canvas.getBoundingClientRect();
    ray.setFromCamera(new T.Vector2((e.clientX-r.left)*2/r.width-1,1-(e.clientY-r.top)*2/r.height),camera);
    const p=ray.ray.intersectPlane(new T.Plane(axisY, -controls.target.y),new T.Vector3());
    wheelAnchor=p?{p,dist:camera.position.distanceTo(controls.target)}:null;
  },{capture:true,passive:true});
  canvas.addEventListener('wheel',()=>{
    if(!wheelAnchor)return;
    const ratio=camera.position.distanceTo(controls.target)/wheelAnchor.dist;
    const offset=wheelAnchor.p.sub(controls.target).multiplyScalar(1-ratio);
    controls.target.add(offset);camera.position.add(offset);wheelAnchor=null;
    controls.update();needsRender=true;
  },{passive:true});
  function resize() {
    const r=canvas.getBoundingClientRect();
    if(!r.width || !r.height)return;
    needsRender=true;camera.aspect=r.width/r.height;camera.updateProjectionMatrix();renderer.setSize(r.width,r.height,false);
    if(!handMoved) setHouse(cp,layer,view,true);
  }
  const sizeObserver=new ResizeObserver(resize);
  sizeObserver.observe(canvas);
  const pinsEl=document.querySelector('#pins');
  const buttons={};
  for(const code of ['street',...Object.keys(houses)]){
    const b=document.createElement('button');b.className='pin';b.textContent=code==='street'?'Kulová':'čp. '+code;
    b.onclick=()=>onHouse(code==='street'?cp:code,code==='street'?'street':'facade');
    pinsEl.append(b);buttons[code]=b;
  }
  function pointScreen(p) {
    const v=p.clone().project(camera),r=canvas.getBoundingClientRect();
    return {x:(v.x+1)*r.width/2,y:(1-v.y)*r.height/2,visible:v.z>=-1&&v.z<=1&&Math.abs(v.x)<0.96&&Math.abs(v.y)<0.94};
  }
  function pinLayout() {
    const d=camera.position.distanceTo(controls.target);
    for(const [key,b] of Object.entries(buttons)){
      const all=key==='street', h=houses[key];
      const show=(all?d>340:d<=340&&d>38) && !flight;
      if(!show){b.hidden=true;continue}
      const p=all?vec(-24,8,-123):face(h).center.clone().add(vec(0,h.height*.5+2,0));
      const s=pointScreen(p);b.hidden=!s.visible;
      if(s.visible){b.style.left=s.x+'px';b.style.top=s.y+'px';b.classList.toggle('active',key===cp)}
    }
  }
  function hitFace(code,hits) {
    const model=pilots[code].models[layer], h=houses[code];
    const [[ax,az],[bx,bz]]=h.edge, dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz);
    const localCamera=model.worldToLocal(camera.position.clone());
    if((-(localCamera.x-ax)*dz+(localCamera.z-az)*dx)/len<=0.1) return false;
    const worldNormal=hits.face.normal.clone().applyNormalMatrix(new T.Matrix3().getNormalMatrix(hits.object.matrixWorld));
    if(worldNormal.y>.65)return false;
    const p=model.worldToLocal(hits.point.clone());
    const along=((p.x-ax)*dx+(p.z-az)*dz)/len;
    const depth=(-(p.x-ax)*dz+(p.z-az)*dx)/len;
    return along>=-0.16 && along<=len+0.16 && Math.abs(depth)<1.3 && p.y>0.08 && p.y<h.height;
  }
  let pointer=null;
  canvas.addEventListener('pointerdown',e=>{if(e.isPrimary&&e.button===0)pointer=[e.clientX,e.clientY,e.pointerId]});
  canvas.addEventListener('pointercancel',()=>pointer=null);
  canvas.addEventListener('pointerup',e=>{
    if(!pointer || pointer[2]!==e.pointerId)return;
    const start=pointer;pointer=null;
    if(Math.hypot(e.clientX-start[0],e.clientY-start[1])>5)return;
    const r=canvas.getBoundingClientRect();
    ray.setFromCamera(new T.Vector2((e.clientX-r.left)*2/r.width-1,1-(e.clientY-r.top)*2/r.height),camera);
    const targets=Object.values(pilots).map(p=>p.proxy.visible?p.proxy:p.models[layer]).filter(Boolean);
    const hit=ray.intersectObjects(targets,true)[0];
    const tree=vegetation?.pick(ray);
    const item=land?.pick(ray);
    if(!hit && !tree && !item)return;
    const clip=contextMat.clippingPlanes;
    const block=ray.intersectObject(cityMesh).find(i=>!clip?.length||clip.every(plane=>plane.distanceToPoint(i.point)>=0));
    if(item && (!hit || item.distance<hit.distance-.03) && (!tree || item.distance<tree.distance-.03) && (!block || item.distance<block.distance+.04)){
      onLand(item.id);return;
    }
    if(tree && (!hit || tree.distance<hit.distance) && (!block || tree.distance<block.distance+.08)){
      onTree(tree.id);return;
    }
    if(!hit || (block && block.distance<hit.distance-.1))return;
    const code=hit.object.userData.cp;
    if(!pilots[code].proxy.visible && hitFace(code,hit)){if(cp!==code || view!=='facade')onHouse(code,'facade');onPhoto(code);return}
    if(pilots[code].proxy.visible || view==='city' || view==='street' || view==='prostor' || view==='trees'){onHouse(code,'facade');return}
    injectedStatus='Tato plocha nemá přiřazenou fotografii. Doložené průčelí zobrazí tlačítko Fasáda.';status();
  });
  const scaleBar=document.querySelector('#distance'),north=document.querySelector('#north i');
  function cartography(){
    const w=canvas.clientWidth,h=canvas.clientHeight;
    const mpp=2*camera.position.distanceTo(controls.target)*Math.tan(rad(camera.fov/2))/Math.max(1,h);
    const n=Math.pow(10,Math.floor(Math.log10(mpp*85)));
    const unit=[5,2,1].map(i=>i*n).find(i=>i/mpp<=100) || n*.5;
    scaleBar.style.width=(unit/mpp)+'px';scaleBar.textContent=unit>=1000?(unit/1000)+' km':unit+' m';
    const a=pointScreen(controls.target), b=pointScreen(controls.target.clone().add(vec(0,0,-Math.min(10,mpp*10))));
    if(w>0)north.style.transform='rotate('+Math.atan2(b.x-a.x,a.y-b.y)+'rad)';
  }
  const step=()=>{
    if(flight){
      const t=Math.min(1,(performance.now()-flight.start)/760), s=t*t*(3-2*t);
      controls.target.lerpVectors(flight.t0,flight.t1,s);
      const dir=flight.dir0.clone().lerp(flight.dir1,s).normalize();
      const d=Math.exp(Math.log(flight.d0)*(1-s)+Math.log(flight.d1)*s);
      camera.position.copy(controls.target).addScaledVector(dir,d);
      if(t>=1){flight=null;needsRender=true}
    }
    controls.update();updateLevel();
    if(needsRender || flight){
      needsRender=false;
      camera.updateMatrixWorld();
      pinLayout();cartography();renderer.render(scene,camera);
    }
    requestAnimationFrame(step);
  };
  resize();requestAnimationFrame(step);
  function refreshModels(changed){
    for(const [code,key] of changed){
      const p=pilots[code], previous=p.models[key];
      if(previous){
        groups[key].remove(previous);
        const oldMeshes=new Set();previous.traverse(n=>{if(n.isMesh)oldMeshes.add(n)});
        for(let i=surfaceBindings.length-1;i>=0;i--)if(oldMeshes.has(surfaceBindings[i].mesh))surfaceBindings.splice(i,1);
        delete p.models[key];
      }
      failures.delete(code+'-'+key);
    }
    dirty=true;needsRender=true;updateLevel();status();
  }
  return {refreshModels,setHouse,setSurface,setTrees,setSpace,zoom,inspect:()=>({cp,layer,view,surface,trees:vegetation?.diagnostic(pointScreen),publicSpace:land?.status(),landFocus,landZone,flying:!!flight,surfaces:surfaceState,detail:usingDetails,ready:Object.fromEntries(Object.entries(pilots).map(([key,p])=>[key,Object.keys(p.models)])),failures:[...failures],draws:renderer.info.render.calls,triangles:renderer.info.render.triangles,cityCount:city.buildings.length,screen:pointScreen(face(houses[cp]).center),camera:camera.position.toArray(),target:controls.target.toArray()})};
}
