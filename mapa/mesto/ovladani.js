import {sourceCanvas,boundsOf,sourceRequest} from './podklady.js';
const q=id=>document.getElementById(id);
const LABELS={most:'Mosty a přechody',ulice:'Ulice',zelen:'Zeleň',voda:'Voda',cesta:'Parkové cesty',porost:'Porosty',kolejiste:'Železnice',otevrena:'Otevřené plochy',photos:'Fotografie',vozidla:'Vozidla',dvor:'Dvory',zahrada:'Zahrady',zahon:'Záhony',hranice:'Hranice pozemků',zed:'Zídky',stavba:'Drobné stavby'};
export const cityGroups=Object.keys(LABELS);

export function cityInterface(data, actions) {
  const streets=new Map(data.streets.map(s=>[String(s.id),s]));
  const vehicles=data.vehicles||[],details=data.details||[],sectors=data.detailCatalog?.sectors||[];
  const detailKinds=new Set(Object.keys(data.detailCatalog?.categories||{}));
  const items=new Map([...data.surfaces,...data.photos,...vehicles,...details].map(s=>[s.id,s]));
  for(const s of data.streets)items.set('street-'+s.id,{...s,id:'street-'+s.id,streetId:s.id,source:'gis',title:s.name1964||s.name1938,isStreet:true});
  for(const s of sectors)items.set('sector-'+s.id,{...s,id:'sector-'+s.id,title:s.title+' · oblast '+s.id,source:'ortho64',period:'1964',method:s.reviewLevel==='detail'?'Kontrola v rozlišení podkladu.':'Přehledový průchod.',detail:s.note,isSector:true});
  const choose=q('street-select'), photoChoice=q('city-photos'), featureChoice=q('city-features');
  const order=[...streets.values()].sort((a,b)=>(a.name1964||a.name1938).localeCompare(b.name1964||b.name1938,'cs'));
  for(const s of order){
    const title=s.name1964||s.name1938;
    const duplicate=order.some(t=>t!==s&&(t.name1964||t.name1938)===title);
    choose.add(new Option(title+(duplicate?' · úsek '+s.id:''),String(s.id)));
  }
  choose.onchange=()=>actions.street(choose.value);
  const bridgeChoice=q('bridge-select');
  for(const b of data.surfaces.filter(r=>r.kind==='most'))bridgeChoice.add(new Option(b.title,b.id));
  bridgeChoice.onchange=()=>{const b=items.get(bridgeChoice.value);if(b){actions.bridge(b)}};
  q('street-next').onclick=()=>{
    const i=order.findIndex(s=>String(s.id)===choose.value);
    actions.street(String(order[(i+1)%order.length].id));
  };
  q('street-source').onclick=()=>actions.open('street-'+choose.value);
  photoChoice.onchange=()=>{if(photoChoice.value)actions.open(photoChoice.value)};
  featureChoice.onchange=()=>{if(featureChoice.value)actions.open(featureChoice.value)};
  const vehicleChoice=q('vehicle-select');
  q('vehicle-controls').hidden=!vehicles.length;
  for(const v of vehicles)vehicleChoice.add(new Option(v.title,v.id));
  vehicleChoice.onchange=()=>actions.vehicle(vehicleChoice.value);
  q('vehicle-source').onclick=()=>{if(vehicleChoice.value)actions.open(vehicleChoice.value)};
  q('vehicle-summary').textContent=vehicles.length+' pravděpodobné odečty';
    const sectorChoice=q('detail-sector'),detailChoice=q('detail-select');
  q('detail-controls').hidden=!details.length;
  q('detail-summary').textContent=details.length+' prvků · '+new Set(details.map(r=>r.sector)).size+' oblastí';
  for(const s of sectors)sectorChoice.add(new Option(s.id+' · '+s.title+' ('+s.featureCount+')',s.id));
  sectorChoice.onchange=()=>actions.sector(sectorChoice.value);
  q('detail-next').onclick=()=>{
    const i=sectors.findIndex(s=>s.id===sectorChoice.value);
    actions.sector(sectors[(i+1)%sectors.length].id);
  };
  detailChoice.onchange=()=>actions.detail(detailChoice.value);
  q('detail-source').onclick=()=>actions.open(detailChoice.value||('sector-'+sectorChoice.value));
  let lastSector=undefined;
  const filters=cityGroups.map(key=>{
    const label=document.createElement('label'),box=document.createElement('input');
    box.type='checkbox';box.value=key;box.checked=true;label.append(box,LABELS[key]);q(detailKinds.has(key)?'detail-filters':'city-filters').append(label);
    return box;
  });
  filters.forEach(box=>box.onchange=()=>actions.filter(filters.filter(b=>b.checked).map(b=>b.value),q('city-plan').checked));
  q('city-plan').onchange=()=>actions.filter(filters.filter(b=>b.checked).map(b=>b.value),q('city-plan').checked);
  const dialog=q('city-source'), canvas=q('city-scan'), image=q('city-photo');
  const raster=sourceCanvas(canvas,data.crs.origin5514,q('city-caption'),q('city-original'));
  let current=null,lastStreet=null;
  function show(id){
    const p=items.get(id);
    if(!p){if(dialog.open)dialog.close();current=null;raster.clear();return}
    const changed=current?.id!==id;current=p;
    q('city-title').textContent=p.title;
    q('city-source-kind').textContent=p.isSector?'PRŮZKUM OBLASTI':p.url?'HISTORICKÁ FOTOGRAFIE':p.isStreet?'PRŮZKUM ULICE':p.kind==='vozidlo'?'VOZIDLO · REKONSTRUKČNÍ ODHAD':'MĚSTSKÝ PROSTOR';
    const isPhoto=!!p.url;
    image.hidden=!isPhoto;canvas.hidden=isPhoto;q('city-source-options').hidden=isPhoto;
    q('city-reading').textContent=p.caption||p.detail||p.review?.note||'';
    q('city-authorship').textContent=isPhoto?p.credit:'Interpretace a 3D vrstva · OpenAI · Codex (rodina GPT-6). Přesný identifikátor běžícího modelu není v runtime zpřístupněný.';
    q('city-metrics').textContent=isPhoto?'Poloha značky pochází z městského rejstříku fotografií. Směr záběru a datum jsou uvedeny v popisu.':p.isStreet?'Uliční úsek '+p.streetId+'. Přehledový průchod dokončen, podrobný soupis objektů pokračuje.':p.period+' · '+p.method+(p.area?' Plocha zákresu '+p.area.toLocaleString('cs-CZ')+' m².':'')+(p.kind==='porost'?' Prostorový povrch porostu má odhadnutou výšku. Jednotlivé grafické části jeho korunové vrstvy nejsou samostatně zjištěné kmeny.':'');
    if(detailKinds.has(p.kind)){
      q('city-metrics').textContent=p.period+' · '+(p.confidence==='distinct'?'Zřetelný odečet':'Pravděpodobný odečet')+'. '+p.positionAccuracy+' '+(p.area?'Plocha přibližně '+Math.round(p.area)+' m². ':'')+(p.symbolicHeight?'Nízká značka hranice je symbolická; skutečný plot či zeď nebyly rozlišeny.':'Výšky, svislé profily a barvy jsou modelové odhady.');
      q('city-authorship').textContent=p.author.organization+' · '+p.author.agent+' ('+p.author.modelFamily+'). '+p.author.note;
    }
    const vehicle=p.kind==='vozidlo',ground=p.groundPhotoId?items.get(p.groundPhotoId):null;
    q('vehicle-ground').hidden=!ground;
    if(ground){q('vehicle-ground').textContent='Doplňující dobová fotografie ↗';q('vehicle-ground').href=ground.url}
    q('vehicle-reference').hidden=!p.modelReference;
    if(p.modelReference){q('vehicle-reference').href=p.modelReference.url;q('vehicle-reference').textContent='Podklad typu a rozměrů RTO ↗'}
    if(vehicle){
      const d=p.dimensions;
      q('city-metrics').textContent=p.period+'. '+p.accuracy+' Model: '+d.length+' × '+d.width+' × '+d.height+' m. '+(p.modelReference?.note||'Rozměry neurčeného sedanu jsou odhadnuté.');
      q('city-authorship').textContent=p.author.organization+' · '+p.author.agent+' ('+p.author.modelFamily+'). '+p.author.note+' Geometrie, umístění a materiály této vrstvy jsou společné pro pohledy Claude i GPT.';
    }
    if(isPhoto){
      image.alt=p.title+'. '+p.caption;
      image.src=p.url;
      q('city-caption').textContent=p.credit;q('city-original').href=p.url;
    }else{
      image.removeAttribute('src');
      if(changed)q('city-source-layer').value=p.source==='plan50'?'plan50':'ortho64';
      const bounds=p.bounds||boundsOf(p.rings.flat());
      raster.show({bounds,lines:p.paths,rings:p.rings},q('city-source-layer').value);
    }
    if(!dialog.open)dialog.showModal();
  }
  q('city-source-layer').onchange=()=>{if(current)show(current.id)};
  q('city-outline').onchange=()=>raster.mark(q('city-outline').checked);
  q('city-close').onclick=actions.close;
  dialog.addEventListener('cancel',e=>{e.preventDefault();actions.close()});
  image.onerror=()=>{q('city-caption').textContent='Náhled fotografie se nepodařilo načíst. Originál je dostupný odkazem níže.'};
  function update(state){
    const s=streets.get(String(state.street))||streets.get('24'),name=s.name1964||s.name1938;
    choose.value=String(s.id);
    vehicleChoice.value=state.vehicleFocus||'';
    sectorChoice.value=state.detailSector||'';
    if(lastSector!==state.detailSector){
      const list=details.filter(r=>!state.detailSector||r.sector===state.detailSector);
      detailChoice.replaceChildren(new Option('Vybrat prvek ('+list.length+')…',''));
      for(const r of list)detailChoice.add(new Option(r.title,r.id));
      detailChoice.disabled=!list.length;lastSector=state.detailSector;
    }
    detailChoice.value=state.detailFocus||'';
    q('detail-source').disabled=!state.detailFocus&&!state.detailSector;
    const sector=sectors.find(s=>s.id===state.detailSector);
    q('detail-review').textContent=sector?sector.note:'Přehled všech 40 oblastí; 13 zkontrolováno v rozlišení podkladu. Soupis čitelných objektů zůstává neúplný.';
    q('vehicle-source').disabled=!state.vehicleFocus;
    q('city-plan').checked=state.cityPlan;
    filters.forEach(b=>b.checked=state.cityGroups.includes(b.value));
    q('street-old-name').textContent=s.name1938!==name?'Název v roce 1938 · '+s.name1938:'';
    q('street-review').textContent=s.review.note;
    q('street-counts').textContent='Nové stromy '+s.trees+' · Plochy '+s.surfaces+' · Fotografie '+s.photos.length+' · Drobné prvky '+details.filter(r=>r.streetId===s.id).length+(vehicles.some(v=>v.streetId===s.id)?' · Vozidla '+vehicles.filter(v=>v.streetId===s.id).length:'');
    q('city-total').textContent='132 uličních úseků · '+(97+data.trees.length)+' odečtených stromů';
    if(lastStreet!==s.id){
      const nearby=data.photos.filter(p=>p.streetId===s.id);
      photoChoice.replaceChildren(new Option('Dobové fotografie ulice ('+nearby.length+')',''));
      for(const p of nearby)photoChoice.add(new Option(p.title+' · '+p.caption.slice(0,62),p.id));
      photoChoice.disabled=!nearby.length;
      const surfaces=[...data.surfaces,...vehicles,...details].filter(p=>p.streetId===s.id);
      featureChoice.replaceChildren(new Option('Povrchy a prvky ulice ('+surfaces.length+')',''));
      for(const p of surfaces)featureChoice.add(new Option(p.title,p.id));
      featureChoice.disabled=!surfaces.length;lastStreet=s.id;
    }
    if(state.view==='street'){
      q('place').textContent=items.get(state.detailFocus)?.title||sector?.title||items.get(state.vehicleFocus)?.title||name;q('scale').textContent=(state.detailFocus||state.detailSector)?'Dvory, zahrady a drobné objekty · pramen 1964':state.vehicleFocus?'Dobová vozidla · pravděpodobný odečet 1964':'Starý Most · přehledový průzkum ulice';
    }
    q('street-name').textContent=state.view==='city'?'Starý Most':state.view==='street'?(state.detailFocus||state.detailSector?'Prvky města':name):state.view==='facade'?'Kulová':state.view==='trees'?'Stromy':'Veřejný prostor';
  }
  function mergeTrees(catalog){
    const [ox,oy]=data.crs.origin5514;
    catalog.metadata.vegetationReview=data.vegetationReview;
    catalog.metadata.cues.m='Korunový útvar odečtený z městského ortofota 1964. Rozlišení koruny a jejího stínu je místy nejisté. Poloha kmene vyžaduje další ověření.';
    for(const t of data.trees){
      const st=streets.get(String(t.streetId)),area='ulice-'+t.streetId;
      catalog.metadata.areas[area]=st.name1964||st.name1938;
      const sjtsk=[ox+t.at[0],oy-t.at[1]];
      catalog.features.push({type:'Feature',id:t.id,geometry:null,properties:{area,sjtsk,diameter_m_approx:t.diameter,confidence:t.confidence,cue:'m',source_date:'1964',flight_id:'Městské ortofoto 1964',source_url:sourceRequest('ortho64',[t.at[0]-35,t.at[1]-21,t.at[0]+35,t.at[1]+21],data.crs.origin5514,1000,600).url,city_reading:true,source_px:t.pixel,source_view:t.view,readingNote:t.readingNote,author:t.author,source_sha256:t.sourceSha256,source_tile_url:t.sourceTileUrl}});
    }
    return catalog;
  }
  return {data,streets,items,show,update,mergeTrees,has:id=>items.has(id)};
}
