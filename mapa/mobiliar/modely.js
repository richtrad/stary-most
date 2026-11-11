import * as T from 'three';
import {GLTFLoader} from '../vendor/GLTFLoader.js';

const mat=(color)=>new T.MeshLambertMaterial({color,flatShading:true});
const M={iron:mat('#59615b'),wood:mat('#8b7553'),stone:mat('#b0aa97'),paper:mat('#ddd6bd'),roof:mat('#788276'),glass:mat('#394d50'),rubber:mat('#303832'),metal:mat('#aab0a5'),cream:mat('#d9d8bf'),body:mat('#707d73'),white:mat('#e2dfcb'),red:mat('#a35646')};
const V=(...p)=>new T.Vector3(...p), unit=new T.BoxGeometry(1,1,1);
function box(g,m,w,h,d,x=0,y=0,z=0){const o=new T.Mesh(unit,m);o.scale.set(w,h,d);o.position.set(x,y,z);g.add(o);return o}
function cyl(g,m,r,h,x=0,y=0,z=0,n=12,rTop=r){const o=new T.Mesh(new T.CylinderGeometry(rTop,r,h,n),m);o.position.set(x,y,z);g.add(o);return o}
function tube(g,a,b,r=.035,m=M.iron){a=V(...a);b=V(...b);const d=b.clone().sub(a),o=cyl(g,m,r,d.length());o.position.copy(a.add(b).multiplyScalar(.5));o.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());return o}
function sphere(g,m,r,x,y,z){const o=new T.Mesh(new T.IcosahedronGeometry(r,1),m);o.position.set(x,y,z);g.add(o);return o}
function railing(g,{length=12,height=.9,pickets=false}={}){
  for(let x=-length/2;x<length/2+.01;x+=Math.min(1.8,length/Math.ceil(length/1.8))){
    tube(g,[x,0,0],[x,height,0],.035);sphere(g,M.iron,.05,x,height,0);
  }
  tube(g,[-length/2,height,0],[length/2,height,0],.035);
  tube(g,[-length/2,height*.48,0],[length/2,height*.48,0],.027);
  if(pickets)for(let x=-length/2+.2;x<length/2;x+=.2)tube(g,[x,.12,0],[x,height,0],.013);
}
function bench(g){
  for(let z=-.22;z<=.22;z+=.11)box(g,M.wood,1.85,.05,.085,0,.47,z);
  for(let y=.65;y<1.0;y+=.13)box(g,M.wood,1.85,.10,.045,0,y,.27);
  for(const x of [-.72,.72]){
    tube(g,[x,.02,-.24],[x,.49,-.18],.035);tube(g,[x,.02,.31],[x,.98,.27],.035);
    tube(g,[x,.48,-.25],[x,.48,.30],.035);
  }
}
function poster(g){
  cyl(g,M.stone,.71,.18,0,.09,0,24);cyl(g,M.paper,.57,2.95,0,1.64,0,24);
  cyl(g,M.iron,.67,.10,0,3.15,0,24);cyl(g,M.roof,.74,.28,0,3.34,0,24,.12);
  sphere(g,M.iron,.12,0,3.58,0);
  // Unreadable advertisements are plain paper panels, never fabricated lettering.
  for(let i=0;i<8;i++){const a=i*Math.PI/4;const o=box(g,i%2?M.white:M.paper,.34,.68,.012,Math.sin(a)*.576,1.15+(i%3)*.54,Math.cos(a)*.576);o.rotation.y=a;}
}
function lamp(g,short=false){
  box(g,M.iron,.16,.75,.08,0,-.35,.03);
  const points=short?[[0,-.55,0],[0,-.18,.12],[0,0,.45],[0,.04,.85]]:[[0,-.70,0],[0,-.28,.12],[0,.03,.42],[0,.18,.83],[0,.23,1.23]];
  for(let i=1;i<points.length;i++)tube(g,points[i-1],points[i],.035);
  box(g,M.metal,.25,.11,short?.73:1.15,0,.18,short?.73:1.15);
  box(g,M.white,.22,.035,short?.68:1.08,0,.105,short?.73:1.15);
  for(const y of [-.18,-.62])box(g,M.iron,.33,.055,.09,0,y,.035);
}
function pole(g,withLamp){
  const h=withLamp?7.1:6.8;
  cyl(g,M.wood,.12,h,0,h/2,0,10,.085);
  if(withLamp){
    box(g,M.stone,.25,1.8,.23,0,.9,.04);
    for(const y of [.7,1.5])box(g,M.iron,.29,.045,.27,0,y,.04);
    const points=[[0,5.1,0],[0,5.7,.13],[0,5.9,.53],[0,5.75,.95]];
    for(let i=1;i<points.length;i++)tube(g,points[i-1],points[i],.025);
    cyl(g,M.iron,.22,.14,0,5.62,.95,12,.07);cyl(g,M.white,.19,.025,0,5.54,.95,12);
  }
}
function crossarm(g){
  tube(g,[0,-.25,0],[0,0,.7],.028);tube(g,[-.55,0,.7],[.55,0,.7],.03);
  for(const [x,sign] of [[-.45,1],[0,1],[.45,1],[-.24,-1],[.24,-1]]){
    tube(g,[x,0,.7],[x,.20*sign,.7],.017);
    cyl(g,M.paper,.055,.12,x,.18*sign,.7,8);cyl(g,M.paper,.07,.025,x,.13*sign,.7,8);
  }
}
function sign(g,stop){
  cyl(g,M.iron,.035,2.5,0,1.25,0,10);
  const o=cyl(g,stop?M.paper:M.red,.30,.035,0,2.25,0,24);o.rotation.x=Math.PI/2;o.position.z=.05;if(stop)o.scale.z=1.35;
  if(stop){box(g,M.paper,.28,.40,.025,0,1.65,.075);}
  else box(g,M.white,.43,.105,.012,0,2.25,.077);
}
function roundRing(w,l,r){
  const a=[];for(const [x,z,start] of [[w-r,-l+r,-90],[w-r,l-r,0],[-w+r,l-r,90],[-w+r,-l+r,180]])for(let k=0;k<=3;k++){const v=(start+k*30)*Math.PI/180;a.push([x+r*Math.cos(v),z+r*Math.sin(v)]);}return a;
}
function shell(g,rows,mats){
  const vertices=[],indices=[],geo=new T.BufferGeometry(),n=16;
  rows.forEach(([y,w,l,r])=>roundRing(w,l,r).forEach(([x,z])=>vertices.push(x,y,z)));
  for(let j=0;j<rows.length-1;j++){const start=indices.length;for(let i=0;i<n;i++){const k=(i+1)%n,a=j*n+i,b=j*n+k,c=(j+1)*n+k,d=(j+1)*n+i;indices.push(a,c,b,a,d,c)}geo.addGroup(start,indices.length-start,Math.min(j,mats.length-1));}
  const top=vertices.length/3;vertices.push(0,rows.at(-1)[0],0);const start=indices.length;
  for(let i=0;i<n;i++)indices.push(top,(rows.length-1)*n+(i+1)%n,(rows.length-1)*n+i);
  geo.addGroup(start,indices.length-start,mats.length-1);geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();g.add(new T.Mesh(geo,mats));
}
function wheels(g,halfTrack,wheelbase,r,shift=0){
  for(const side of [-1,1])for(const z of [-wheelbase/2,wheelbase/2]){
    const o=cyl(g,M.rubber,r,.23,side*halfTrack,r,z+shift,12);o.rotation.z=Math.PI/2;
    const h=cyl(g,M.metal,r*.53,.025,side*(halfTrack+.126),r,z+shift,12);h.rotation.z=Math.PI/2;
  }
}
function bus(g){
  // Photo S27: long rounded body, four folding door leaves and roof luggage rack.
  // 706 RO is a probable type; dimensions are an analogue, not a vehicle identification.
  shell(g,[[.52,1.16,5.23,.35],[1.20,1.25,5.33,.45],[1.65,1.25,5.33,.46],[2.62,1.25,5.33,.48],[2.91,1.08,5.18,.55],[3.10,.76,4.95,.55]],[M.body,M.cream,M.cream,M.cream,M.cream]);
  for(const side of [-1,1])for(let i=0;i<9;i++){
    const z=-4.45+i*1.09;if(side===1&&Math.abs(z+1.18)<.8)continue;
    box(g,M.glass,.018,.67,.91,side*1.259,2.19,z);
    box(g,M.metal,.022,.025,.91,side*1.273,2.20,z);
  }
  for(const end of [-1,1]){
    for(const x of [-.48,.48])box(g,M.glass,.83,.70,.018,x,2.20,end*5.343);
    box(g,M.metal,2.02,.13,.15,0,.66,end*5.35);
    for(const x of [-.84,.84]){const o=cyl(g,end<0?M.white:M.red,end<0?.12:.065,.025,x,1.05,end*5.345,12);o.rotation.x=Math.PI/2;}
  }
  for(let y=.88;y<=1.56;y+=.12)box(g,M.metal,1.3,.035,.022,0,y,-5.35);
  for(let i=0;i<4;i++){
    const z=-1.66+i*.29;box(g,M.body,.035,1.88,.265,1.272,1.58,z);
    box(g,M.glass,.041,.74,.205,1.282,2.09,z);box(g,M.metal,.045,.028,.252,1.286,1.65,z);
  }
  wheels(g,1.13,5.4,.48,-.45);
  for(const x of [-.85,.85]){
    tube(g,[x,3.15,.4],[x,3.15,4.3],.023,M.metal);tube(g,[x,3.40,.4],[x,3.40,4.3],.023,M.metal);
    for(let z=.4;z<4.4;z+=.65)tube(g,[x,3.12,z],[x,3.4,z],.018,M.metal);
  }
  for(let z=.4;z<4.4;z+=.45)tube(g,[-.85,3.15,z],[.85,3.15,z],.018,M.metal);
  tube(g,[-.85,3.4,.4],[.85,3.4,.4],.023,M.metal);tube(g,[-.85,3.4,4.3],[.85,3.4,4.3],.023,M.metal);
}
function van(g){
  shell(g,[[.32,.75,2.0,.30],[.90,.91,2.15,.36],[1.32,.91,2.15,.36],[1.94,.86,2.08,.36],[2.23,.62,1.94,.38]],[M.cream,M.cream,M.cream,M.cream]);
  for(const x of [-.39,.39])box(g,M.glass,.64,.52,.02,x,1.61,-2.16);
  for(const side of [-1,1]){
    box(g,M.glass,.025,.49,.79,side*.907,1.62,-1.41);
    box(g,M.metal,.03,.025,.20,side*.93,.99,-1.12);
  }
  wheels(g,.79,2.6,.31,-.12);
  box(g,M.metal,1.57,.09,.10,0,.48,-2.16);
  for(const x of [-.61,.61]){const o=cyl(g,M.white,.10,.02,x,.93,-2.17,10);o.rotation.x=Math.PI/2;}
  for(let y=.68;y<.95;y+=.07)box(g,M.iron,.56,.024,.02,0,y,-2.17);
}
function stairs(g){
  const len=42.3,width=1.5,flights=4,run=4.23,rise=1.125;
  const sections=[];
  for(let f=0;f<flights;f++){
    const z0=f*12.69;
    for(let i=0;i<10;i++){
      const z=z0+i*run/10,h=f*rise+(i+1)*rise/10;
      box(g,M.stone,width,h,run/10,0,h/2,z+run/20);sections.push([z,z+run/10,h]);
    }
    if(f<3){box(g,M.stone,width,(f+1)*rise,8.46,0,(f+1)*rise/2,z0+run+4.23);sections.push([z0+run,z0+12.69,(f+1)*rise]);}
  }
  const profile=z=>{const f=Math.min(3,Math.floor(z/12.69));return f*rise+Math.min(1,(z-f*12.69)/run)*rise};
  for(const x of [-width/2,width/2]){
    for(const [a,b,h] of sections)box(g,M.stone,.17,h+.27,b-a,x,(h+.27)/2,(a+b)/2);
    for(let z=0;z<len;z+=.20)tube(g,[x,profile(z)+.26,z],[x,profile(z)+1.08,z],.012);
    const breaks=[0,4.23,12.69,16.92,25.38,29.61,38.07,42.3];
    for(let i=1;i<breaks.length;i++)tube(g,[x,profile(breaks[i-1])+1.1,breaks[i-1]],[x,profile(breaks[i])+1.1,breaks[i]],.028);
  }
}
export function buildFurniture(scene,catalog,onChange,landData){
  function inRing(x,z,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [a,b]=ring[i],[c,d]=ring[j];if((b>z)!==(d>z)&&x<(c-a)*(z-b)/(d-b)+a)inside=!inside;}return inside}
  function groundHeight(x,z){
    let height=.075;
    for(const f of landData?.features||[]){const p=f.properties,shape=p.local;if(!shape)continue;
      const polys=shape.type==='MultiPolygon'?shape.coordinates:[shape.coordinates];
      if(!polys.some(r=>inRing(x,z,r[0])&&!r.slice(1).some(h=>inRing(x,z,h))))continue;
      const thickness=p.display_thickness??(p.group==='prvky'?.18:p.group==='vozovky'?.06:p.group==='pesiny'?.04:.015);
      const top=p.surface_plane?p.surface_plane[0]*x+p.surface_plane[1]*z+p.surface_plane[2]+thickness:.06+thickness;
      height=Math.max(height,top);
    }return height;
  }
  const root=new T.Group();root.name='Kulová · fotografický mobiliář';scene.add(root);
  const groups=new Map(),meshes=[],errors=[],pending=new Set(),loader=new GLTFLoader();
  const builders={poster,railing,bench,lamp:(g,p)=>lamp(g,p?.short),pole:(g,p)=>pole(g,p?.lamp),crossarm,sign:(g,p)=>sign(g,p?.stop),bus,van,stairs};
  const records=catalog.objects;
  for(const r of records){
    const g=new T.Group();g.name=r.id;g.userData.record=r;g.position.set(r.at[0],(r.heightBase||.085)+groundHeight(...r.at)-.075,r.at[1]);g.rotation.y=(r.yaw||0)*Math.PI/180;root.add(g);groups.set(r.id,g);
    function register(){g.traverse(o=>{if(o.isMesh){o.userData.furniture=r.id;meshes.push(o)}});g.updateMatrixWorld(true);onChange();}
    if(r.asset){
      pending.add(r.id);
      loader.loadAsync(r.asset.url).then(file=>{
        const box=new T.Box3().setFromObject(file.scene);
        file.scene.position.set(-r.asset.anchor[0],-box.min.y,-r.asset.anchor[1]);
        g.add(file.scene);register();if(selected===r.id){outline.setFromObject(g);outline.visible=visible(r.id)}
      }).catch(e=>{errors.push(r.id);console.error('Mobiliář '+r.id,e)}).finally(()=>{pending.delete(r.id);onChange()});
    }else{builders[r.model](g,r.params);register();}
  }
  let selected=null,settings={epoch:'1957-58',enabled:true,kinds:catalog.categories.map(c=>c.id),author:'all'};
  const outline=new T.BoxHelper(undefined,0xc49344);scene.add(outline);outline.visible=false;
  function visible(id){return !!groups.get(id)?.visible&&root.visible}
  function configure(next,focus){settings=next;selected=focus;root.visible=next.enabled;
    for(const r of records)groups.get(r.id).visible=r.epoch===next.epoch&&next.kinds.includes(r.category)&&(next.author==='all'||r.author.key===next.author);
    if(selected&&visible(selected)){outline.setFromObject(groups.get(selected));outline.visible=true}else outline.visible=false;
    onChange();
  }
  function destination(id,aspect=1){
    const r=records.find(r=>r.id===id);if(!r)return null;
    const g=groups.get(id);
    const target=r.cameraTarget?V(...r.cameraTarget):V(r.at[0],g.position.y+(r.aimHeight||1.3),r.at[1]);
    const offset=V(...(r.cameraOffset||[7,6,9])),dir=offset.clone().normalize(),right=V(0,1,0).cross(dir).normalize(),up=dir.clone().cross(right);
    const box=new T.Box3().setFromObject(g),tanY=Math.tan(20*Math.PI/180),tanX=tanY*aspect;
    let distance=offset.length();
    if(!box.isEmpty())for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
      const p=V(x,y,z).sub(target);distance=Math.max(distance,p.dot(dir)+1.22*Math.max(Math.abs(p.dot(right))/tanX,Math.abs(p.dot(up))/tanY));
    }
    return [target,target.clone().addScaledVector(dir,distance)];
  }
  return {configure,destination,pick(ray){
    if(!root.visible)return null;
    const hit=ray.intersectObjects(meshes.filter(o=>visible(o.userData.furniture)),false)[0];
    return hit?{id:hit.object.userData.furniture,distance:hit.distance}:null;
  },inspect(project){
    return {epoch:settings.epoch,enabled:root.visible,selected,pending:[...pending],errors:[...errors],total:records.length,visible:records.filter(r=>visible(r.id)).length,
      objects:records.map(r=>{const g=groups.get(r.id),b=new T.Box3().setFromObject(g);return {id:r.id,author:r.author.key,visible:visible(r.id),bounds:b.isEmpty()?null:[b.min.toArray(),b.max.toArray()],screen:project(r.cameraTarget?V(...r.cameraTarget):V(r.at[0],g.position.y+(r.aimHeight||1.3),r.at[1]))}})};
  }};
}
