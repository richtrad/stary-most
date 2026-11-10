const q=s=>document.querySelector(s);
export const ringsOf=g=>g.type==='MultiPolygon'?g.coordinates:[g.coordinates];
export function publicInterface(data,actions){
  const meta=data.metadata, items=new Map(data.features.map(f=>[f.id,f.properties]));
  const groups=Object.keys(meta.groups);
  const controls=q('#land-controls'),zones=q('#land-zone'),choice=q('#land-feature'),dialog=q('#land-dialog'),canvas=q('#land-scan');
  let current=null,lastView=null,signature='';
  const img=new Image();
  img.src=new URL(meta.municipal.image, new URL('stromy/', document.baseURI)).href;
  const option=(value,label)=>new Option(label,value);
  for(const [key,name] of Object.entries(meta.zones))zones.add(option(key,name));
  const checks=groups.map(key=>{
    const label=document.createElement('label'),box=document.createElement('input'),chip=document.createElement('i');
    box.type='checkbox';box.value=key;box.checked=true;
    chip.style.background=meta.colors[key];chip.setAttribute('aria-hidden','true');
    label.append(box,chip,meta.groups[key]);q('#land-filters').append(label);
    return box;
  });
  checks.forEach(box=>box.onchange=()=>actions.filter(checks.filter(x=>x.checked).map(x=>x.value)));
  zones.onchange=()=>actions.zone(zones.value);
  choice.onchange=()=>choice.value?actions.select(choice.value,false):actions.zone(zones.value);
  q('#land-open').onclick=()=>{if(choice.value)actions.select(choice.value,true)};
  q('#land-close').onclick=actions.close;
  dialog.addEventListener('cancel',e=>{e.preventDefault();actions.close()});
  q('#land-outline').onchange=draw;
  function draw(){
    if(!current || !dialog.open || !img.complete || !img.naturalWidth)return;
    const src=ringsOf(current.local),xy=src.flatMap(p=>p[0]),xs=xy.map(p=>p[0]),zs=xy.map(p=>p[1]);
    const minx=Math.min(...xs), maxx=Math.max(...xs), minz=Math.min(...zs),maxz=Math.max(...zs);
    const W=800,H=380,w=Math.max(25,(maxx-minx)*1.25,(maxz-minz)*W/H*1.25),h=w*H/W;
    const left=(minx+maxx-w)/2,top=(minz+maxz-h)/2;
    const [ox,oy]=meta.crs_local.origin5514,[x0,y0,x1,y1]=meta.municipal.bbox;
    const rx=img.naturalWidth/(x1-x0),ry=img.naturalHeight/(y1-y0),ctx=canvas.getContext('2d');
    ctx.fillStyle='#45493e';ctx.fillRect(0,0,W,H);
    ctx.drawImage(img,(ox+left-x0)*rx,(y1-oy+top)*ry,w*rx,h*ry,0,0,W,H);
    if(!q('#land-outline').checked)return;
    const path=new Path2D();
    for(const p of src)for(const ring of p){
      ring.forEach(([x,z],i)=>{path[i?'lineTo':'moveTo']((x-left)*W/w,(z-top)*H/h)});path.closePath();
    }
    ctx.fillStyle='#e4bb4838';ctx.fill(path,'evenodd');
    ctx.lineJoin='round';ctx.lineWidth=4;ctx.strokeStyle='#212b29c9';ctx.stroke(path);
    ctx.lineWidth=1.8;ctx.strokeStyle='#ffe79a';ctx.stroke(path);
  }
  img.onload=draw;
  function show(id){
    current=items.get(id);
    if(!current){if(dialog.open)dialog.close();return}
    const p=current;
    q('#land-title').textContent=p.title;
    q('#land-place').textContent=meta.zones[p.zone]+' · 16. dubna 1964';
    q('#land-reading').textContent=p.reading;
    q('#land-origin').textContent=(p.geometry_origin==='model_ulice'?'Geometrie uličního modelu':'Geometrie z leteckého odečtu')+' · '+p.model_author+'. Odečet a vazba na pramen · '+p.interpretation_author+'.';
    q('#land-metrics').textContent=p.id+' · '+p.confidence+' · '+p.area_m2.toLocaleString('cs-CZ')+' m² v modelu. '+meta.precision;
    q('#land-original').href=p.source;
    const meshSource=q('#land-mesh-source');
    meshSource.hidden=p.geometry_origin!=='model_ulice';
    if(!meshSource.hidden)meshSource.href=meta.kulova_public_source.url;
    const streetPhoto=q('#land-ground');streetPhoto.hidden=!p.ground_photo;
    if(p.ground_photo)streetPhoto.href=p.ground_photo;
    if(!dialog.open)dialog.showModal();
    draw();
  }
  function update(state){
    if(state.view!==lastView){controls.open=state.view==='prostor';lastView=state.view}
    zones.value=state.zone;
    checks.forEach(box=>box.checked=state.landGroups.includes(box.value));
    const sig=state.zone+'|'+state.landGroups.join(',');
    if(signature!==sig){
      signature=sig;
      const filtered=[...items.values()].filter(p=>(state.zone==='all'||p.zone===state.zone)&&state.landGroups.includes(p.group));
      choice.replaceChildren(option('','Vybrat jednotlivý prvek'));
      for(const p of filtered)choice.add(option(p.id,p.title));
      choice.disabled=!filtered.length;
      q('#land-total').textContent=filtered.length+' / '+items.size;
    }
    choice.value=state.landId||'';
    q('#land-open').disabled=!items.has(choice.value);
  }
  return {items,groups,meta,show,update};
}
