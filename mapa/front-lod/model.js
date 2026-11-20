import * as T from 'three';

T.ColorManagement.legacyMode=false;
const plaster = ['#e1d1b1','#dec9ac','#d4c7b9','#e7d9bd'];
const tiles = ['#ae7561','#8d7367','#9d7868','#978b7b'];
const paint = color => new T.MeshLambertMaterial({color, side:T.DoubleSide, flatShading:true});
const material = {
  plaster:plaster.map(paint), tiles:tiles.map(paint), sill:paint('#e9ddc5'),
  reveal:paint('#a29887'), window:paint('#576968'), door:paint('#796855'),
  shop:paint('#657779'), blind:paint('#958f81'), road:paint('#c8c4b9'),
  trim:paint('#897865')
};

function triangleMesh(vertices, mat, group) {
  if (!vertices?.length) return;
  const geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  geo.computeVertexNormals();
  const mesh=new T.Mesh(geo,mat);
  group.add(mesh);
  return mesh;
}

function quad(vertices,a,b,c,d) { vertices.push(...a,...b,...c,...a,...c,...d); }
function walls(parts,y,height,edge=null) {
  const out=[];
  for (const {outer,holes} of parts) for (const ring of [outer,...holes]) {
    ring.forEach(([x,z],i) => {
      const [u,v]=ring[(i+1)%ring.length];
      if (edge && edge.every(([a,b])=>Math.hypot(u-x,v-z)>0 &&
        Math.abs((u-x)*(b-z)-(v-z)*(a-x))/Math.hypot(u-x,v-z)<0.14)
        && ((x+u)/2-edge[0][0])*((x+u)/2-edge[1][0])+((z+v)/2-edge[0][1])*((z+v)/2-edge[1][1])<=0.1) return;
      quad(out,[x,y,z],[u,y,v],[u,y+height,v],[x,y+height,z]);
    });
  }
  return out;
}

function cap(parts,altitude,mat,group) {
  for (const {outer,holes} of parts) {
    const shape=new T.Shape(outer.map(([x,z])=>new T.Vector2(x,-z)));
    for (const ring of holes) shape.holes.push(new T.Path(ring.map(([x,z])=>new T.Vector2(x,-z))));
    const geo=new T.ShapeGeometry(shape).rotateX(-Math.PI/2).translate(0,altitude,0);
    group.add(new T.Mesh(geo,mat));
  }
}

export function surrounding(street,detailedIds,layer) {
  const group=new T.Group(), buffers=Array.from({length:4},()=>({walls:[],roof:[]}));
  for (const footprint of street.buildings) {
    if (detailedIds.has(footprint.id)) continue;
    const b=footprint.variants?.[layer]||footprint.variants?.gis||footprint;
    const i=footprint.id%4,part=buffers[i];
    for (const n of walls(b.parts,0,b.height)) part.walls.push(n);
    if (b.roof.length) for (const n of b.roof) part.roof.push(n);
    else cap(b.parts,b.height,material.tiles[i],group);
  }
  buffers.forEach(({walls,roof},i)=>{
    triangleMesh(walls,material.plaster[i],group);
    triangleMesh(roof,material.tiles[i],group);
  });
  const roads=[];
  for(const line of street.paths) for(let i=1;i<line.length;i++){
    const [x,z]=line[i-1],[u,v]=line[i],w=Math.hypot(u-x,v-z);
    if (!w) continue;
    const nx=-(v-z)/w*2.6,nz=(u-x)/w*2.6;
    quad(roads,[x+nx,.008,z+nz],[u+nx,.008,v+nz],[u-nx,.008,v-nz],[x-nx,.008,z-nz]);
  }
  triangleMesh(roads,material.road,group);
  return group;
}

// A single measured opening controls the outer cut, four reveals and inset infill.
function facadeRelief(house,width,height,group) {
  const outer=new T.Shape().moveTo(0,0).lineTo(width,0).lineTo(width,height).lineTo(0,height);
  outer.closePath();
  const batches={reveal:[],window:[],shop:[],door:[],blind:[],sill:[]};
  for(const {kind,rect,role,head,hood,archFractionOfOpeningHeight,steps} of house.openings) {
    const [l,t,r,b]=rect;
    const x0=Math.max(.008,l*width),x1=Math.min(width-.008,r*width);
    const y0=Math.max(.008,(1-b)*height),y1=Math.min(height-.008,(1-t)*height);
    if (x1<=x0 || y1<=y0) continue;
    const depth=kind==='blind'?.035:kind==='door'?.19:.145;
    const arch=archFractionOfOpeningHeight || (head==='segmental'?.13:0);
    const loop=[[x0,y0]];
    if(arch){
      const rise=(y1-y0)*arch;
      for(let i=0;i<=8;i++){
        const angle=Math.PI*(1-i/8);
        loop.push([(x0+x1)/2+Math.cos(angle)*(x1-x0)/2,y1-rise+Math.sin(angle)*rise]);
      }
    }else loop.push([x0,y1],[x1,y1]);
    loop.push([x1,y0]);
    const hole=new T.Path(loop.map(([x,y])=>new T.Vector2(x,y)));hole.closePath();outer.holes.push(hole);
    for(let i=0;i<loop.length;i++){
      const a=loop[i],next=loop[(i+1)%loop.length];
      quad(batches.reveal,[...a,0],[...next,0],[...next,-depth],[...a,-depth]);
    }
    const color=role==='balcony_door'?'window':kind;
    for(let i=1;i<loop.length-1;i++)batches[color].push(...loop[0],-depth,...loop[i],-depth,...loop[i+1],-depth);
    if ((kind==='window' || kind==='shop') && !['basement','friezeVent'].includes(role)){
      const d=.065;
      quad(batches.sill,[x0,y0,0],[x1,y0,0],[x1,y0,d],[x0,y0,d]);
      quad(batches.sill,[x0,y0,d],[x1,y0,d],[x1,y0-.038,d],[x0,y0-.038,d]);
    }
    if(hood){
      const peak=Math.min(.32,(x1-x0)*.2),count=hood==='triangular'?2:6;
      const point=i=>[x0+(x1-x0)*i/count,y1+.09+peak*(hood==='triangular'?1-Math.abs(2*i/count-1):Math.sin(Math.PI*i/count)),.09];
      for(let i=0;i<count;i++){const a=point(i),b=point(i+1);quad(batches.sill,a,b,[b[0],b[1]-.065,b[2]],[a[0],a[1]-.065,a[2]])}
    }
    for(let j=1;j<=Number(steps||0);j++){
      const n=Number(steps),up=y0*j/n,previous=y0*(j-1)/n;
      const outerDepth=.20*(n-j+1),innerDepth=outerDepth-.20;
      quad(batches.sill,[x0,previous,outerDepth],[x1,previous,outerDepth],[x1,up,outerDepth],[x0,up,outerDepth]);
      quad(batches.sill,[x0,up,outerDepth],[x1,up,outerDepth],[x1,up,innerDepth],[x0,up,innerDepth]);
    }
  }
  for(const yNorm of house.cornices){
    const y=(1-yNorm)*height,d=.095;
    quad(batches.sill,[0,y,d],[width,y,d],[width,y+.055,d],[0,y+.055,d]);
    quad(batches.sill,[0,y+.055,d],[width,y+.055,d],[width,y+.055,0],[0,y+.055,0]);
  }
  for(const balcony of house.balconies||[]){
    const l=balcony.left*width,r=balcony.right*width,y=(1-balcony.floor)*height;
    const rail=(1-balcony.railTop)*height,d=.62,thickness=.13,bar=.038;
    quad(batches.sill,[l,y,0],[r,y,0],[r,y,d],[l,y,d]);
    quad(batches.sill,[l,y,d],[r,y,d],[r,y-thickness,d],[l,y-thickness,d]);
    quad(batches.sill,[l,y-thickness,0],[r,y-thickness,0],[r,y-thickness,d],[l,y-thickness,d]);
    for(const x of [l,r]){
      quad(batches.sill,[x,y,0],[x,y,d],[x,y-thickness,d],[x,y-thickness,0]);
      quad(batches.reveal,[x,rail,0],[x,rail,d],[x,rail+bar,d],[x,rail+bar,0]);
    }
    quad(batches.reveal,[l,rail,d],[r,rail,d],[r,rail+bar,d],[l,rail+bar,d]);
    for(let i=0;i<=4;i++){
      const x=l+(r-l-bar)*i/4;
      quad(batches.reveal,[x,y,d],[x+bar,y,d],[x+bar,rail,d],[x,rail,d]);
    }
  }
  const wall=new T.Mesh(new T.ShapeGeometry(outer),material.plaster[house.footprintId%4]);
  group.add(wall);
  for (const [k,verts] of Object.entries(batches)) triangleMesh(verts,material[k],group);
}

export function buildHouse(house,model,layer) {
  const v=model.variants[layer]||model.variants.gis, i=house.footprintId%4;
  const group=new T.Group(), facade=new T.Group(),relief=new T.Group();
  const [a,b]=v.edge,dx=b[0]-a[0],dz=b[1]-a[1],width=Math.hypot(dx,dz);
  const normal=new T.Vector3(-dz/width,0,dx/width);
  const axis=new T.Vector3(dx/width,0,dz/width);
  const height=v.height, base=v.base;
  const center=new T.Vector3((a[0]+b[0])/2,base+height*.48,(a[1]+b[1])/2);
  triangleMesh(walls(v.parts,base,height,v.edge),material.plaster[i],group);
  if (v.roof.length) triangleMesh(v.roof,material.tiles[i],group);
  else cap(v.parts,base+height,material.tiles[i],group);
  triangleMesh(v.trim,material.trim,group);
  triangleMesh(v.gables,material.plaster[i],group);
  facade.position.set(a[0],base,a[1]).addScaledVector(normal,.012);
  facade.rotation.y=-Math.atan2(dz,dx);
  group.add(facade);
  const flat=new T.PlaneGeometry(width,height).translate(width/2,height/2,0);
  const photoMat=new T.MeshBasicMaterial({color:0xffffff,side:T.FrontSide,toneMapped:false});
  const [top,bottom]=house.coverage,stripHeight=height*(bottom-top);
  const imageGeo=new T.PlaneGeometry(width,stripHeight).translate(width/2,height*(1-bottom)+stripHeight/2,.004);
  const photo=new T.Mesh(imageGeo,photoMat);
  const plain=new T.Mesh(flat,material.plaster[i]);
  facade.add(plain,photo,relief);
  facadeRelief(house,width,height,relief);
  return {group,facade,photo,photoMat,plain,relief,center,normal,axis,width,height,variant:v};
}

export function disposeGroup(group) {
  const geos=new Set();
  group.traverse(child=>{if(child.geometry)geos.add(child.geometry);if(child.userData.ownMat)child.material.dispose()});
  geos.forEach(geo=>geo.dispose());
  group.removeFromParent();
}
