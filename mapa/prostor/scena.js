import * as T from 'three';


export function parts(g) {
  return g.type==='MultiPolygon'?g.coordinates:[g.coordinates];
}

export function publicSpace(scene, catalog, invalidate, failure) {
  const records=new Map(catalog.features.map(f=>[f.id,f.properties]));
  const names=new Map(catalog.features.filter(f=>f.properties.source_node).map(f=>[f.properties.source_node,f.id]));
  const survey=new Map(), street=new Map(),areaTargets=new Map();
  const hitMat=new T.MeshBasicMaterial({side:T.DoubleSide});
  for(const [id,p] of records){
    if(!['ellipse','outline'].includes(p.shape))continue;
    const ring=parts(p.local)[0][0].map(([x,z])=>new T.Vector2(x,-z));
    const geo=new T.ShapeGeometry(new T.Shape(ring)).rotateX(-Math.PI/2);
    const mesh=new T.Mesh(geo,hitMat);mesh.position.y=.275;mesh.updateMatrixWorld();mesh.userData.publicId=id;areaTargets.set(id,mesh);
  }
  let active=new Set(Object.keys(catalog.metadata.groups)), close=false, state='loading';
  function visibility(){
    for(const [id,mesh] of survey){
      mesh.visible=active.has(records.get(id).group) && !(close && street.has(id));
    }
    for(const [id,mesh] of street)mesh.visible=active.has(records.get(id).group);
    invalidate();
  }
  for (const [id, record] of records) {
    const shapes=parts(record.local).map(poly=>{
      const ring=pts=>pts.map(([x,z])=>new T.Vector2(x,-z));
      const shape=new T.Shape(ring(poly[0]));
      for(const hole of poly.slice(1)) shape.holes.push(new T.Path(ring(hole)));
      return shape;
    });
    const material=new T.MeshBasicMaterial({color:catalog.metadata.colors[record.group],side:T.DoubleSide,toneMapped:false});
    const height=record.group==='prvky'?.18:record.group==='vozovky'?.06:record.group==='pesiny'?.04:.015;
    const mesh=new T.Mesh(new T.ExtrudeGeometry(shapes,{depth:height,bevelEnabled:false}).rotateX(-Math.PI/2),material);
    mesh.userData.publicId=id;mesh.position.y=.06;scene.add(mesh);survey.set(id,mesh);
  }
  state='ready';
  function bindStreet(root){
    root.traverse(n=>{
      const id=names.get(n.name);
      if(id && n.isMesh){n.userData.publicId=id;street.set(id,n)}
    });
    visibility();
  }
  function configure(groups){
    const next=new Set(groups);
    if(next.size===active.size && [...next].every(key=>active.has(key)))return;
    active=next;visibility();
  }
  function setNear(value){if(value!==close){close=value;visibility()}}
  function pick(ray){
    const targets=[...survey.values()].filter(n=>n.visible);
    if(state==='ready')for(const [id,mesh] of areaTargets){if(active.has(records.get(id).group))targets.push(mesh)}
    if(close)targets.push(...[...street.values()].filter(n=>n.visible));
    const hit=ray.intersectObjects(targets,false)[0];
    return hit && {id:hit.object.userData.publicId,distance:hit.distance};
  }
  function bounds(zone,id){
    const b=new T.Box3();
    for(const [k,p] of records){
      if(id?k!==id:zone!=='all'&&p.zone!==zone)continue;
      for(const poly of parts(p.local))for(const [x,z] of poly[0])b.expandByPoint(new T.Vector3(x,0,z));
    }
    if(b.isEmpty())return bounds('P',null);
    return b;
  }
  return {bindStreet,configure,setNear,pick,bounds,status:()=>state};
}
