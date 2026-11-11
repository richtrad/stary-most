import * as T from 'three';
export async function loadRoofData(){
 const names=['manifest','gpt-roofs','claude-roofs','mesto-strechy','prameny'];
 const values=await Promise.all(names.map(async n=>{const r=await fetch('strechy/'+n+'.json');if(!r.ok)throw Error('Chybí vrstva střech: '+n);return r.json()}));
 return {manifest:values[0],gpt:values[1],claude:values[2],context:values[3],sources:values[4]};
}
export function roofModels(scene,data,city,changed){
 const group=new T.Group();group.name='Střechy a dvory · oddělené autorské verze';scene.add(group);
 const ids=new Set(data.gpt.buildings.map(b=>b.id)),records=new Map(data.gpt.buildings.map(b=>[b.cp,b]));
 const layerGroups={},houseGroups={},allMaterials=[],pickMeshes=[];
 const palette={roof:0x8d9984,walls:0xbcb5a5,trim:0x777a6c};
 const makeMat=(color)=>{const m=new T.MeshStandardMaterial({color,roughness:1,side:T.DoubleSide});allMaterials.push(m);return m};
 const materials=Object.fromEntries(Object.entries(palette).map(([k,v])=>[k,makeMat(v)]));
 const courtMats={court:makeMat(0xc6bc9f),garden:makeMat(0x899e70)};
 function mesh(pos,material,parent,cp,kind){
  if(!pos?.length)return;const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.computeVertexNormals();
  const m=new T.Mesh(geo,material);m.userData={roofCp:cp,roofKind:kind};parent.add(m);pickMeshes.push(m);return m;
 }
 function shape(parts,height){
  const shapes=parts.map(([outer,holes])=>{const s=new T.Shape(outer.map(([x,z])=>new T.Vector2(x,-z)));for(const h of holes)s.holes.push(new T.Path(h.map(([x,z])=>new T.Vector2(x,-z))));return s});
  return new T.ExtrudeGeometry(shapes,{depth:height,bevelEnabled:false,curveSegments:1}).rotateX(-Math.PI/2);
 }
 for(const key of ['gpt','claude']){
  const root=new T.Group();root.name=key;group.add(root);layerGroups[key]=root;houseGroups[key]={};
  for(const b of data[key].buildings){
   const h=new T.Group();h.name=key+' · čp. '+b.cp;h.userData.author=b.author;root.add(h);houseGroups[key][b.cp]=h;
   for(const kind of ['walls','roof','trim'])mesh(b[kind],materials[kind],h,b.cp,kind);
  }
 }
 const claudeIds=new Set(data.claude.buildings.map(b=>b.id));
 for(const [id,height,parts] of city.buildings){
  if(!ids.has(id)||claudeIds.has(id))continue;
  const cp=data.gpt.buildings.find(b=>b.id===id).cp;
  const h=new T.Group();layerGroups.claude.add(h);houseGroups.claude[cp]=h;
  const m=new T.Mesh(shape(parts,height),materials.walls);m.userData={roofCp:cp,roofKind:'gis-fallback'};h.add(m);pickMeshes.push(m);
 }
 const courts=new T.Group();courts.name='Dvory a zahrady · GPT';layerGroups.gpt.add(courts);
 for(const b of data.gpt.courtyards)for(const p of b.parts){
  const s=new T.Shape(p.outer.map(([x,z])=>new T.Vector2(x,-z)));for(const h of p.holes)s.holes.push(new T.Path(h.map(([x,z])=>new T.Vector2(x,-z))));
  const geo=new T.ShapeGeometry(s);geo.rotateX(-Math.PI/2);geo.translate(0,.14,0);
  const m=new T.Mesh(geo,b.kind.includes('zahrada')?courtMats.garden:courtMats.court);m.renderOrder=3;m.userData={roofCp:b.cp,roofKind:'courtyard'};courts.add(m);pickMeshes.push(m);
 }
 const positions=[],ranges=[];let tris=0;
 for(const b of data.context.buildings){
  if(ids.has(b.id))continue;
  positions.push(...b.positions);tris+=b.positions.length/9;ranges.push({end:tris,record:b});
 }
 const contextMat=makeMat(0x98a28e),contextGeo=new T.BufferGeometry();contextGeo.setAttribute('position',new T.Float32BufferAttribute(positions,3));contextGeo.computeVertexNormals();
 const context=new T.Mesh(contextGeo,contextMat);context.name='Město · nedoložené algoritmické střechy';group.add(context);
 let currentLayer='gpt',contextOn=true,focus=null,currentPlanes=[];
 function configure(layer,hidden,planes,showContext=true){
  currentLayer=layer;contextOn=showContext;currentPlanes=planes||[];
  for(const key of ['gpt','claude']){layerGroups[key].visible=key===layer;for(const [cp,h] of Object.entries(houseGroups[key]))h.visible=!hidden.has(cp)}
  context.visible=showContext;courts.visible=layer==='gpt';
  for(const m of allMaterials){m.clippingPlanes=planes;m.needsUpdate=true}
  changed();
 }
 function pick(ray){
  const live=pickMeshes.filter(m=>m.visible&&m.parent.visible&&((m.parent===courts&&courts.parent.visible)||(m.parent.parent?.visible&&m.parent.parent!==group)));
  const visibleHit=h=>currentPlanes.every(p=>p.distanceToPoint(h.point)>=0);
  const a=ray.intersectObjects(live,false).find(visibleHit),b=context.visible?ray.intersectObject(context,false).find(visibleHit):null;
  const hit=!a?b:!b?a:a.distance<b.distance?a:b;
  if(!hit)return null;
  if(hit===b){
   let lo=0,hi=ranges.length-1;while(lo<hi){const m=(lo+hi)>>1;if(hit.faceIndex<ranges[m].end)hi=m;else lo=m+1}
   const rec=ranges[lo]?.record;return rec?{distance:hit.distance,cp:rec.cp,id:rec.id,kind:'context'}:null;
  }
  return {distance:hit.distance,cp:hit.object.userData.roofCp,kind:hit.object.userData.roofKind};
 }
 function destination(cp,aspect){
  const r=records.get(cp);if(!r)return null;
  const [x,z,X,Z]=r.bounds,t=new T.Vector3((x+X)/2,4,(z+Z)/2);
  const d=Math.max(46,Math.hypot(X-x,Z-z)*1.65,36/aspect);
  return [t,t.clone().addScaledVector(new T.Vector3(.25,.9,1).normalize(),d)];
 }
 return {ids,has:cp=>!!houseGroups[currentLayer][cp],configure,pick,destination,setFocus:cp=>{focus=cp},inspect:()=>({layer:currentLayer,selected:focus,revised:data.gpt.buildings.length,claude:data.claude.buildings.length,courtyards:data.gpt.courtyards.length,contextVisible:contextOn,contextRoofs:ranges.length,sourceCompared:19,historicallyAccepted:false})};
}
