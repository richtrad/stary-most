import * as T from 'three';

export function buildBridges(records) {
  const root=new T.Group();root.name='Mosty · schematická rekonstrukce podle plánů';
  const meshes=[],groups=new Map(),unit=new T.BoxGeometry(1,1,1);
  const deckMaterial=new T.MeshLambertMaterial({color:0xb5b0a1,flatShading:true});
  const edgeMaterial=new T.MeshLambertMaterial({color:0x88897e,flatShading:true});
  const railMaterial=new T.MeshLambertMaterial({color:0x58655e,flatShading:true});
  function box(parent,record,material,position,scale){
    const mesh=new T.Mesh(unit,material);mesh.position.set(...position);mesh.scale.set(...scale);mesh.userData.item=record;parent.add(mesh);meshes.push(mesh);return mesh;
  }
  for(const r of records){
    const group=new T.Group(),[[x,z],[X,Z]]=r.ends;
    group.position.set((x+X)/2,0,(z+Z)/2);group.rotation.y=Math.atan2(X-x,Z-z);root.add(group);groups.set(r.id,group);
    const length=Math.hypot(X-x,Z-z),width=r.width,h=r.deckHeight;
    box(group,r,deckMaterial,[0,h-.12,0],[width,.24,length]);
    for(const side of [-1,1]){
      box(group,r,edgeMaterial,[side*(width/2-.12),h+.06,0],[.24,.12,length]);
      for(const level of [.48,1.0])box(group,r,railMaterial,[side*(width/2-.16),h+level,0],[.085,.085,length]);
      const count=Math.max(2,Math.ceil(length/2.2));
      for(let i=0;i<=count;i++)box(group,r,railMaterial,[side*(width/2-.16),h+.51,-length/2+length*i/count],[.10,1.02,.10]);
    }
    for(const end of [-1,1]){
      box(group,r,edgeMaterial,[0,(h-.24)/2,end*(length/2-.45)],[width,h-.24,.9]);
      // Shallow ramps join the normalized zero-ground city; this is not surveyed elevation.
      const run=r.rampLength,slope=Math.atan2(h-.06,run);
      const ramp=box(group,r,deckMaterial,[0,(h+.06)/2-.05,end*(length/2+run/2)],[width,.10,Math.hypot(run,h-.06)]);
      ramp.rotation.x=end*slope;
    }
  }
  function pick(ray){if(!root.visible)return null;const hit=ray.intersectObjects(meshes,false)[0];return hit?{id:hit.object.userData.item.id,distance:hit.distance}:null}
  return {root,pick,inspect:project=>({count:records.length,visible:root.visible,records:records.map(r=>({id:r.id,screen:project(new T.Vector3(r.at[0],r.deckHeight+.5,r.at[1]))}))})};
}
