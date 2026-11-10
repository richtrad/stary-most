import * as T from 'three';

const Y = new T.Vector3(0,1,0);
const palettes = ['#658249','#758b50','#59794b','#728849','#68875b','#829454'];
function noise(id) {
  let n=2166136261;
  for(const c of id)n=Math.imul(n ^ c.charCodeAt(0),16777619);
  return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296};
}

export function buildTrees(scene,city,catalog) {
  const root=new T.Group();root.name='Stromy 1964 · OpenAI Codex (GPT-6)';scene.add(root);
  const [ox,oy]=city.crs.origin5514;
  const trees=catalog.features.map(({id,properties:p})=>{
    const random=noise(id), span=p.diameter_m_approx, height=span*(1.0+.28*random())+1.7;
    return {id,p,center:new T.Vector3(p.sjtsk[0]-ox,0,oy-p.sjtsk[1]),span,height,random};
  });
  const byId=new Map(trees.map(t=>[t.id,t]));
  const wood=[],tips=[],leaves=[],shadows=[];
  const matrix=new T.Matrix4(),rot=new T.Quaternion(),tmp=new T.Vector3();
  function segment(out,tree,start,end,radius) {
    const axis=end.clone().sub(start);
    rot.setFromUnitVectors(Y,tmp.copy(axis).normalize());
    matrix.compose(start.clone().lerp(end,.5),rot,new T.Vector3(radius,axis.length(),radius));
    out.push({tree,matrix:matrix.clone(),color:'#725a42'});
  }
  function lump(t,x,y,z,sx,sy,sz,yaw,color) {
    rot.setFromEuler(new T.Euler(.1*t.random(),yaw,.09*t.random()));
    matrix.compose(new T.Vector3(x,y,z),rot,new T.Vector3(sx,sy,sz));
    leaves.push({tree:t,matrix:matrix.clone(),color});
  }
  for(const t of trees){
    const {center:c,span:d,height:h,random:r}=t;
    const angle=r()*Math.PI*2, shade=palettes[Math.floor(r()*palettes.length)];
    const breadth=.85+r()*.25, asymmetry=.06+r()*.09, lobes=3+Math.floor(r()*3);
    const rise=.65+r()*.12, slope=.17+r()*.06;
    const crotch=c.clone().add(new T.Vector3(.09,h*.41,-.04));
    segment(wood,t,c,crotch,.095+.017*d);
    const top=c.clone().add(new T.Vector3(.06*d,h*.88,.03*d));
    segment(tips,t,crotch,top,.07+.009*d);
    lump(t,c.x+Math.cos(angle)*asymmetry*d,h*rise,c.z+Math.sin(angle)*asymmetry*d,d*.32*breadth,h*(.98-rise),d*.31,angle,shade);
    for(let j=0;j<lobes;j++){
      const a=angle+j*Math.PI*2/lobes+(r()-.5)*.58, dir=new T.Vector3(Math.cos(a),0,Math.sin(a));
      const limb=c.clone().addScaledVector(dir,d*(.18+.035*r()));limb.y=h*(.58+.06*r());
      const fork=c.clone().lerp(crotch,.75+.25*r());
      segment(wood,t,fork,limb,.05+d*.009);
      for(const sign of [-1,1]){
        const twig=limb.clone().addScaledVector(dir,d*(.10+.06*r()));
        twig.x-=sign*dir.z*d*.10;twig.z+=sign*dir.x*d*.10;twig.y+=h*(.16+r()*.09);
        segment(tips,t,limb,twig,.03+d*.0035);
        const end=twig.clone().add(new T.Vector3(-sign*dir.z*.12*d,.09*h,sign*dir.x*.12*d));
        segment(tips,t,twig,end,.021+d*.0017);
      }
      lump(t,limb.x,h*(.59+.12*r()),limb.z,d*(.26+.075*r())*breadth,h*(slope+.055*r()),d*(.25+.065*r()),a,shade);
    }
    matrix.makeRotationX(-Math.PI/2);
    matrix.scale(new T.Vector3(d*.34,d*.27,1));matrix.setPosition(c.x,.008,c.z);
    shadows.push({tree:t,matrix:matrix.clone(),color:'#bcbfa8'});
  }
  const leafMat=new T.MeshLambertMaterial({flatShading:true});
  const woodMat=new T.MeshLambertMaterial({flatShading:true});
  const sm=new T.MeshBasicMaterial({toneMapped:false,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  function instanced(geometry,mat,items) {
    const mesh=new T.InstancedMesh(geometry,mat,items.length);
    // The vendored renderer shares geometry bounds across instances. The individual instances occupy the full survey area.
    mesh.frustumCulled=false;
    mesh.userData.records=items;mesh.userData.ids=[];
    root.add(mesh);return mesh;
  }
  const crowns=instanced(new T.IcosahedronGeometry(1,1),leafMat,leaves);
  const stems=instanced(new T.CylinderGeometry(.68,1,1,6),woodMat,wood);
  const twigs=instanced(new T.CylinderGeometry(.43,1,1,4),woodMat,tips);
  const shade=instanced(new T.CircleGeometry(1,13),sm,shadows);
  const objects=[crowns,stems,twigs,shade], color=new T.Color();
  let style,quality,count;
  function configure(mode,filter){
    if(style===mode && quality===filter)return;
    style=mode;quality=filter;
    const include=t=>filter!=='distinct'||t.p.confidence==='distinct';
    count=mode==='off'?0:trees.filter(include).length;
    root.visible=mode!=='off';
    crowns.visible=mode==='crowns';twigs.visible=mode==='branches';shade.visible=mode==='crowns';
    for(const obj of objects){
      let i=0;const ids=[];
      for(const b of obj.userData.records){
        if(!include(b.tree))continue;
        obj.setMatrixAt(i,b.matrix);obj.setColorAt(i,color.set(b.color));ids.push(b.tree.id);i++;
      }
      obj.count=i;obj.userData.ids=ids;obj.instanceMatrix.needsUpdate=true;
      if(obj.instanceColor)obj.instanceColor.needsUpdate=true;
      if(typeof obj.computeBoundingSphere==='function')obj.computeBoundingSphere();
    }
  }
  function bounds(area,focus) {
    const picked=byId.get(focus);
    if(picked)return {aim:picked.center.clone().addScaledVector(Y,picked.height*.47),width:Math.max(13,picked.height*1.8),depth:11};
    const local=trees.filter(t=>area==='all'||t.p.area===area);
    const box=new T.Box3();for(const t of local.length?local:trees)box.expandByPoint(t.center);
    const size=box.getSize(new T.Vector3()),aim=box.getCenter(new T.Vector3());aim.y=2.8;
    return {aim,width:size.x+16,depth:size.z+16};
  }
  function pick(ray) {
    if(!root.visible)return null;
    const hit=ray.intersectObjects([stems,style==='crowns'?crowns:twigs],false)[0];
    if(!hit)return null;
    return {id:hit.object.userData.ids[hit.instanceId],distance:hit.distance};
  }
  function diagnostic(project){
    return {style,quality,count,examples:trees.filter(t=>quality!=='distinct'||t.p.confidence==='distinct').map(t=>({id:t.id,...project(t.center.clone().addScaledVector(Y,t.height*.72))})).filter(p=>p.visible)};
  }
  configure('crowns','all');
  return {configure,bounds,pick,diagnostic};
}
