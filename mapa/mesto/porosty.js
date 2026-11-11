import * as T from 'three';

// Crown positions within surveyed stands are illustrative, not individual readings.
// A click always opens the source polygon and its uncertainty, never a fake tree ID.
export function buildCanopyStands(records) {
  const root=new T.Group();root.name='Porosty z ortofota 1964';
  const instances=records.flatMap(record=>(record.canopyPoints||[]).map(p=>({record,p})));
  const n=instances.length, dummy=new T.Object3D(), color=new T.Color();
  const leaf=new T.MeshLambertMaterial({flatShading:true});
  const bark=new T.MeshLambertMaterial({color:0x75694e,flatShading:true});
  const crowns=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),leaf,n);
  const trunks=new T.InstancedMesh(new T.CylinderGeometry(.65,1,1,5),bark,n);
  const branches=new T.InstancedMesh(new T.CylinderGeometry(.35,1,1,4),bark,n*3);
  for(const mesh of [crowns,trunks,branches]){mesh.frustumCulled=false;root.add(mesh)}
  const up=new T.Vector3(0,1,0);
  instances.forEach(({p:[x,z,d,h]},i)=>{
    dummy.position.set(x,h*.68,z);dummy.scale.set(d*.49,h*.33,d*.43);
    dummy.rotation.set(.04*Math.sin(i),i*2.399,.06*Math.cos(i));dummy.updateMatrix();
    crowns.setMatrixAt(i,dummy.matrix);crowns.setColorAt(i,color.setHex([0x7c9954,0x709052,0x87a35d,0x66884e,0x829d58][i%5]));
    dummy.rotation.set(0,0,0);dummy.position.set(x,h*.3,z);dummy.scale.set(d*.027,h*.6,d*.027);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
    for(let b=0;b<3;b++){
      const angle=i*2.399+b*Math.PI*2/3;
      const start=new T.Vector3(x,h*(.32+b*.07),z);
      const end=new T.Vector3(x+Math.cos(angle)*d*.32,h*(.78+b*.05),z+Math.sin(angle)*d*.32);
      const direction=end.clone().sub(start);
      dummy.position.copy(start).add(end).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(up,direction.clone().normalize());
      dummy.scale.set(d*.018,direction.length(),d*.018);dummy.updateMatrix();branches.setMatrixAt(i*3+b,dummy.matrix);
    }
  });
  let mode='crowns',quality='all',enabled=true;
  function configure(next,show,nextQuality='all'){
    mode=next;quality=nextQuality;enabled=show;
    root.visible=enabled&&quality!=='distinct'&&mode!=='off';
    crowns.visible=mode==='crowns';branches.visible=mode==='branches';
  }
  configure(mode,enabled);
  function pick(ray){
    if(!root.visible)return null;
    const hit=ray.intersectObjects([trunks,...(crowns.visible?[crowns]:[branches])],false)[0];
    if(!hit)return null;
    const index=hit.object===branches?Math.floor(hit.instanceId/3):hit.instanceId;
    return {id:instances[index].record.id,distance:hit.distance};
  }
  function inspect(project){
    const examples=instances.filter((v,i)=>i%Math.max(1,Math.floor(n/24))===0).map(({record,p})=>({group:record.canopyGroupId,id:record.id,world:p.slice(0,2),screen:project?.(new T.Vector3(p[0],p[3]*.68,p[1]))}));
    return {groups:new Set(records.map(r=>r.canopyGroupId)).size,illustrativeCrowns:n,visible:root.visible,mode,quality,examples};
  }
  return {root,configure,pick,inspect};
}
