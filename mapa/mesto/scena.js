import * as T from 'three';
import {buildVehicles} from '../vozidla/modely.js';
import {buildSmallFeatures} from '../prvky/modely.js';
import {buildCanopyStands} from './porosty.js?v=20261111-zelen2';
import {buildBridges} from '../mosty/modely.js?v=20261111-mosty2';
const colors={ulice:0xb6b3a3,zelen:0x99ad7e,voda:0x739c9d,cesta:0xd7c9a7,porost:0x78926b,kolejiste:0xa29685,otevrena:0xc6b995};
const heights={ulice:.046,zelen:.002,voda:.012,cesta:.032,porost:.003,kolejiste:.01,otevrena:.018};

function inside(point, ring) {
  const [x,z]=point;
  let contained=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const [a,b]=ring[i],[c,d]=ring[j];
    if((b>z)!==(d>z) && x<(c-a)*(z-b)/(d-b)+a)contained=!contained;
  }
  return contained;
}
function onSurface(point, rings) {
  return inside(point,rings[0]) && !rings.slice(1).some(ring=>inside(point,ring));
}
export function cityEnvironment(scene,data,invalidate) {
  const items=new Map(data.surfaces.map(r=>[r.id,r]));
  const meshes=[];
  const bridges=buildBridges(data.surfaces.filter(r=>r.kind==='most'));scene.add(bridges.root);
  const surveyedStands=data.surfaces.filter(r=>r.canopySurvey);
  const stands=buildCanopyStands(surveyedStands);scene.add(stands.root);
  const details=buildSmallFeatures(data.details||[]);scene.add(details.root);
  const vehicles=buildVehicles(data.vehicles||[]);scene.add(vehicles.root);
  const materials=Object.fromEntries(Object.entries(colors).map(([kind,color])=>[kind,new T.MeshBasicMaterial({color,side:T.DoubleSide,toneMapped:false})]));
  const woods=[];
  for(const record of data.surfaces){
    if(record.kind==='most')continue;
    const rings=record.rings;
    const ring=points=>points.map(([x,z])=>new T.Vector2(x,-z));
    const shape=new T.Shape(ring(rings[0]));
    for(const hole of rings.slice(1))shape.holes.push(new T.Path(ring(hole)));
    const mesh=new T.Mesh(new T.ShapeGeometry(shape).rotateX(-Math.PI/2),materials[record.kind]);
    mesh.position.y=record.canopySurvey ? .067 : heights[record.kind];
    mesh.userData.item=record;
    scene.add(mesh);meshes.push(mesh);
    if(record.kind!=='porost'||record.canopySurvey)continue;
    const xs=rings[0].map(p=>p[0]),zs=rings[0].map(p=>p[1]);
    for(let x=Math.min(...xs)+9;x<Math.max(...xs)-9;x+=16){
      for(let z=Math.min(...zs)+9;z<Math.max(...zs)-9;z+=16){
        if(![[x,z],[x-9,z],[x+9,z],[x,z-9],[x,z+9]].every(p=>onSurface(p,rings)))continue;
        if(surveyedStands.some(r=>onSurface([x,z],r.rings)))continue;
        // These facets form an area representation of woodland, not an inventory of trunks.
        woods.push({record,x,z});
      }
    }
  }
  const canopy=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),new T.MeshLambertMaterial({flatShading:true}),woods.length);
  canopy.frustumCulled=false;
  const dummy=new T.Object3D(),color=new T.Color();
  woods.forEach((w,i)=>{
    const f=Math.sin(w.x*.17+w.z*.23);
    dummy.position.set(w.x,5.1+f,w.z);dummy.scale.set(12.5,5.4+f,12.5);dummy.rotation.y=i*1.77;dummy.updateMatrix();
    canopy.setMatrixAt(i,dummy.matrix);canopy.setColorAt(i,color.setHex(i%3===0?0x688456:i%3===1?0x73905c:0x608055));
  });
  scene.add(canopy);
  const markerCanvas=document.createElement('canvas');markerCanvas.width=64;markerCanvas.height=64;
  const c=markerCanvas.getContext('2d');c.fillStyle='#315449';c.beginPath();c.arc(32,32,27,0,Math.PI*2);c.fill();
  c.strokeStyle='#fff7df';c.lineWidth=3;c.strokeRect(14,22,36,24);c.strokeRect(23,17,13,5);c.beginPath();c.arc(32,34,7,0,Math.PI*2);c.stroke();
  const markerMaterial=new T.SpriteMaterial({map:new T.CanvasTexture(markerCanvas),depthTest:false,depthWrite:false,sizeAttenuation:true});
  const pins=data.photos.map(record=>{
    const sprite=new T.Sprite(markerMaterial);sprite.position.set(record.at[0],21,record.at[1]);sprite.scale.set(11,11,1);
    sprite.userData.item=record;sprite.renderOrder=5;scene.add(sprite);return sprite;
  });
  const outline=new T.LineSegments(new T.BufferGeometry(),new T.LineBasicMaterial({color:0xb98439,toneMapped:false,transparent:true,opacity:.9}));
  scene.add(outline);
  let active=new Set(Object.keys(colors).concat('photos','vozidla','most')),showPlan=true,mode='crowns',quality='all',streetId=null;
  function visibility(){
    for(const mesh of meshes)mesh.visible=active.has(mesh.userData.item.kind)&&(showPlan||mesh.userData.item.source!=='plan50')&&(!mesh.userData.item.canopySurvey||(quality!=='distinct'&&mode!=='off'));
    vehicles.root.visible=active.has('vozidla');
    bridges.root.visible=active.has('most')&&showPlan;
    details.configure([...active]);
    canopy.visible=showPlan&&mode==='crowns'&&quality!=='distinct'&&active.has('porost');
    stands.configure(mode,active.has('porost'),quality);
    invalidate();
  }
  function configure(groups,plan){
    const key=groups.join(',')+plan;
    if(configure.key===key)return;
    configure.key=key;active=new Set(groups);showPlan=plan;visibility();
  }
  function setStreet(id,visible) {
    if(streetId===id && outline.visible===visible)return;
    streetId=id;outline.visible=visible;
    const s=data.streets.find(s=>String(s.id)===String(id)),points=[];
    if(s)for(const line of s.paths)for(let i=1;i<line.length;i++)points.push(line[i-1][0],.19,line[i-1][1],line[i][0],.19,line[i][1]);
    outline.geometry.dispose();outline.geometry=new T.BufferGeometry();outline.geometry.setAttribute('position',new T.Float32BufferAttribute(points,3));
    invalidate();
  }
  function frame(target,distance){
    const near=distance<750, span=Math.max(100,distance*.8);
    for(const pin of pins)pin.visible=active.has('photos')&&near&&Math.hypot(pin.position.x-target.x,pin.position.z-target.z)<span;
  }
  function pick(ray){
    const photo=ray.intersectObjects(pins.filter(m=>m.visible),false)[0];
    if(photo)return {id:photo.object.userData.item.id,distance:photo.distance,isPhoto:true};
    const vehicle=vehicles.pick(ray), detail=details.pick(ray);
    const hit=ray.intersectObjects(meshes.filter(m=>m.visible),false)[0];
    const leaf=canopy.visible?ray.intersectObject(canopy)[0]:null;
    const candidates=[vehicle,detail,bridges.pick(ray),stands.pick(ray),hit&&{id:hit.object.userData.item.id,distance:hit.distance},leaf&&{id:woods[leaf.instanceId].record.id,distance:leaf.distance}].filter(Boolean);
    if(candidates.length)return candidates.sort((a,b)=>a.distance-b.distance)[0];
    return null;
  }
  return {configure,setStreet,frame,pick,focusDetail:id=>{details.focus(id);invalidate()},
    treeStyle(next,nextQuality='all'){if(next!==mode||nextQuality!==quality){mode=next;quality=nextQuality;visibility()}},
    inspect:project=>({details:details.inspect(project),vehicles:vehicles.inspect(project),bridges:bridges.inspect(project),features:items.size,photos:data.photos.length,visible:meshes.filter(m=>m.visible).length,plan50:showPlan,woodlandFacets:woods.length,stands:stands.inspect(project),street:streetId})
  };
}
