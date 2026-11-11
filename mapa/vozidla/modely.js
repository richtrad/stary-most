import * as T from 'three';

// Dimensions in metres. Local front is -Z; yaw is a clockwise grid bearing,
// expressed by rotation.y = -bearing. All finishes and small details are hypotheses.
const material=color=>new T.MeshLambertMaterial({color,flatShading:true});
const shared={glass:material(0x354b4e),rubber:material(0x343b38),metal:material(0xa9b1a6),lamp:material(0xeee5ba),tail:material(0xa54c3b)};
function add(group,geometry,mat,x=0,y=0,z=0){
  const mesh=new T.Mesh(geometry,mat);mesh.position.set(x,y,z);group.add(mesh);return mesh;
}
function box(g,m,w,h,d,x,y,z){return add(g,new T.BoxGeometry(w,h,d),m,x,y,z)}
function panel(g,m,points){
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));
  geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();
  const mesh=add(g,geometry,m);return mesh;
}
function roundedRing(w,l,r){
  const p=[];
  for(const [x,z,start] of [[w-r,-l+r,-90],[w-r,l-r,0],[-w+r,l-r,90],[-w+r,-l+r,180]]){
    for(let k=0;k<=3;k++){const a=(start+k*30)*Math.PI/180;p.push([x+r*Math.cos(a),z+r*Math.sin(a)])}
  }
  return p;
}
function shell(g,rows,mats){
  const vertices=[],indices=[],geometry=new T.BufferGeometry(),n=16;
  rows.forEach(([y,w,l,r])=>roundedRing(w,l,r).forEach(([x,z])=>vertices.push(x,y,z)));
  for(let j=0;j<rows.length-1;j++){
    const start=indices.length;
    for(let i=0;i<n;i++){const k=(i+1)%n,a=j*n+i,b=j*n+k,c=(j+1)*n+k,d=(j+1)*n+i;indices.push(a,c,b,a,d,c)}
    geometry.addGroup(start,indices.length-start,Math.min(j,mats.length-1));
  }
  const top=vertices.length/3;vertices.push(0,rows.at(-1)[0],0);
  const start=indices.length;
  for(let i=0;i<n;i++)indices.push(top,(rows.length-1)*n+(i+1)%n,(rows.length-1)*n+i);
  geometry.addGroup(start,indices.length-start,mats.length-1);
  geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  return add(g,geometry,mats);
}
function wheels(g,r,halfTrack,wheelbase,width,axleShift=0){
  for(const side of [-1,1])for(const z of [-wheelbase/2,wheelbase/2]){
    const wheel=add(g,new T.CylinderGeometry(r,r,width,12),shared.rubber,side*halfTrack,r,z+axleShift);wheel.rotation.z=Math.PI/2;
    const hub=add(g,new T.CylinderGeometry(r*.52,r*.52,.018,12),shared.metal,side*(halfTrack+width/2+.008),r,z+axleShift);hub.rotation.z=Math.PI/2;
  }
}
export function createRTO(finish='#9c443b'){
  const g=new T.Group();g.name='Škoda 706 RTO · stylizovaná rekonstrukce';
  const cream=material(0xe9e2c9),paint=material(finish);
  shell(g,[[.50,1.15,5.22,.48],[1.13,1.23,5.30,.60],[1.62,1.23,5.30,.60],[1.80,1.23,5.30,.60],[2.48,1.16,5.23,.66],[2.73,1.00,5.09,.65],[2.90,.64,4.88,.54]],[paint,cream,paint,cream,cream,cream]);
  // Nine framed side windows, following the inward slope of the upper body.
  for(const side of [-1,1])for(let i=0;i<9;i++){
    const z=-4.25+i*1.01,lo=1.83,hi=2.43,span=.88;
    let pts=[[side*1.235,lo,z-span/2],[side*1.235,lo,z+span/2],[side*1.173,hi,z+span/2],[side*1.173,hi,z-span/2]];
    if(side>0)pts=pts.reverse();panel(g,shared.glass,pts);
  }
  // Front/rear split glazing; curved corners remain in body colour.
  for(const end of [-1,1])for(const side of [-1,1]){
    const x1=side*.055,x2=side*.69;
    let pts=[[x1,1.83,end*5.307],[x2,1.83,end*5.307],[x2*.97,2.43,end*5.245],[x1,2.43,end*5.245]];
    if(side*end<0)pts=pts.reverse();panel(g,shared.glass,pts);
  }
  // One plain entry door: the exact subtype and fittings of the photographed
  // Most buses are unresolved. No invented fleet numbers, logos or route text.
  box(g,shared.metal,.014,1.71,.81,1.239,1.51,-1.85);
  box(g,cream,.018,.75,.74,1.25,1.02,-1.85);
  box(g,shared.glass,.022,.66,.64,1.255,2.02,-1.85);
  box(g,cream,.026,1.62,.035,1.26,1.51,-1.85);
  wheels(g,.48,1.09,5.45,.28,-.6);
  for(const end of [-1,1]){
    box(g,shared.metal,1.88,.13,.14,0,.64,end*5.335);
    for(const x of [-.77,.77]){
      const light=add(g,new T.CylinderGeometry(end<0?.115:.065,end<0?.115:.065,.025,10),end<0?shared.lamp:shared.tail,x,1.12,end*5.305);
      light.rotation.x=Math.PI/2;
    }
  }
  for(let y=.84;y<1.31;y+=.095)box(g,shared.metal,.78,.023,.016,0,y,-5.312);
  box(g,cream,.62,.16,.024,0,2.59,-5.17);
  return g;
}
export function createCar(finish='#69766e'){
  const g=new T.Group();g.name='Osobní automobil · neurčený typ';
  const paint=material(finish);
  shell(g,[[.30,.72,1.96,.27],[.65,.82,2.08,.32],[.91,.78,1.98,.35]],[paint,paint]);
  // A generic period saloon; this does not identify the car's make.
  shell(g,[[.90,.71,1.02,.18],[1.40,.57,.70,.20],[1.52,.43,.59,.19]],[shared.glass,paint]);
  for(const side of [-1,1]){
    const pillar=box(g,paint,.035,.46,.07,side*.64,1.16,.04);pillar.rotation.z=side*.25;
    box(g,paint,.027,.085,1.91,side*.718,.93,0);
  }
  wheels(g,.30,.69,2.48,.20);
  for(const end of [-1,1]){
    box(g,shared.metal,1.34,.085,.08,0,.43,end*2.06);
    for(const x of [-.56,.56])box(g,end<0?shared.lamp:shared.tail,.16,.12,.025,x,.69,end*2.06);
  }
  return g;
}
export function buildVehicles(records){
  const root=new T.Group();root.name='Vozidla · OpenAI Codex (GPT-6)';
  const models=records.map(record=>{
    const model=record.model==='skoda-706-rto'?createRTO(record.finish):createCar(record.finish);
    model.position.set(record.at[0],.065,record.at[1]);
    model.rotation.y=-record.bearingGridDeg*Math.PI/180;
    model.userData.item=record;
    model.traverse(o=>{if(o.isMesh)o.userData.item=record});
    root.add(model);return model;
  });
  return {root,models,pick(ray){
    if(!root.visible)return null;
    const hit=ray.intersectObjects(models,true)[0];
    return hit?{id:hit.object.userData.item.id,distance:hit.distance}:null;
  },inspect(project){
    return {total:records.length,visible:root.visible?records.length:0,items:records.map((r,i)=>({id:r.id,at:r.at,model:r.model,screen:project?project(models[i].position.clone().add(new T.Vector3(0,1.5,0))):undefined}))};
  }};
}
