import * as T from 'three';

const palette={dvor:0xc5bca7,zahrada:0x9bab7d,zahon:0xa99771,hranice:0x858674,zed:0x969286,stavba:0xb8b09a};
const level={dvor:.080,zahrada:.075,zahon:.115};
function shapeOf(rings){
  const points=ring=>ring.map(([x,z])=>new T.Vector2(x,-z));
  const shape=new T.Shape(points(rings[0]));
  for(const hole of rings.slice(1))shape.holes.push(new T.Path(points(hole)));
  return shape;
}
export function buildSmallFeatures(records){
  const root=new T.Group();root.name='Drobné prvky · OpenAI Codex';
  const groups=new Map(),meshes=[];
  const materials=Object.fromEntries(Object.entries(palette).map(([key,color])=>[key,new T.MeshLambertMaterial({color,flatShading:true,side:T.DoubleSide})]));
  const roof=new T.MeshLambertMaterial({color:0xa7aa96,flatShading:true,side:T.DoubleSide});
  const unit=new T.BoxGeometry(1,1,1);
  function mesh(geometry,material,group,record){
    const m=new T.Mesh(geometry,material);m.userData.item=record;group.add(m);meshes.push(m);return m;
  }
  for(const record of records){
    const group=new T.Group();group.userData.item=record;group.name=record.id;groups.set(record.id,group);root.add(group);
    if(record.paths){
      for(const path of record.paths)for(let i=1;i<path.length;i++){
        const [x,z]=path[i-1],[X,Z]=path[i],length=Math.hypot(X-x,Z-z);
        if(length<.05)continue;
        const h=record.height,m=mesh(unit,materials[record.kind],group,record);
        m.scale.set(record.width,h,length);m.position.set((x+X)/2,.08+h/2,(z+Z)/2);m.rotation.y=Math.atan2(X-x,Z-z);
      }
    }else for(const rings of record.polygons){
      const shape=shapeOf(rings);
      if(record.kind==='stavba'){
        const geometry=new T.ExtrudeGeometry(shape,{depth:record.height,bevelEnabled:false,steps:1}).rotateX(-Math.PI/2);
        const m=mesh(geometry,[roof,materials.stavba],group,record);m.position.y=.08;
      }else{
        const geometry=new T.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:false,steps:1}).rotateX(-Math.PI/2);
        const m=mesh(geometry,materials[record.kind],group,record);m.position.y=level[record.kind];
      }
    }
  }
  const outline=new T.LineSegments(new T.BufferGeometry(),new T.LineBasicMaterial({color:0xc49344,toneMapped:false}));
  outline.name='Vybraný drobný prvek';root.add(outline);outline.visible=false;
  let active=new Set(Object.keys(palette)),selected=null;
  function configure(enabled){
    active=new Set(enabled);
    for(const [id,group] of groups)group.visible=active.has(group.userData.item.kind);
    outline.visible=!!selected&&!!groups.get(selected)?.visible;
  }
  function focus(id){
    if(selected===id){outline.visible=!!id&&!!groups.get(id)?.visible;return}
    selected=id;const r=groups.get(id)?.userData.item,points=[];
    if(r)for(const path of r.paths||r.rings){
      const y=r.kind==='stavba'?r.height+.13:r.kind==='zed'?r.height+.13:.22;
      for(let i=1;i<path.length;i++)points.push(path[i-1][0],y,path[i-1][1],path[i][0],y,path[i][1]);
    }
    outline.geometry.dispose();outline.geometry=new T.BufferGeometry();outline.geometry.setAttribute('position',new T.Float32BufferAttribute(points,3));
    outline.visible=!!r&&groups.get(id).visible;
  }
  function pick(ray){
    const hit=ray.intersectObjects(meshes.filter(m=>m.parent.visible),false)[0];
    return hit?{id:hit.object.userData.item.id,distance:hit.distance}:null;
  }
  return {root,configure,focus,pick,inspect:project=>({
    count:records.length,visible:records.filter(r=>groups.get(r.id).visible).length,
    selected,objects:records.map(r=>({id:r.id,kind:r.kind,sector:r.sector,visible:groups.get(r.id).visible,screen:project(new T.Vector3(r.at[0],r.height+.12,r.at[1]))}))
  })};
}
