const q=id=>document.getElementById(id);
const fmt=n=>n.toLocaleString('cs-CZ',{maximumFractionDigits:1});

export function treeInterface(catalog,handlers) {
  const m=catalog.metadata, features=new Map(catalog.features.map(f=>[f.id,f.properties]));
  const select=q('tree-area'), choose=q('tree-id');
  for(const [value,title] of Object.entries(m.areas)){
    const n=catalog.features.filter(f=>f.properties.area===value).length;
    select.add(new Option(title+' ('+n+')',value));
  }
  function options(area,quality,id){
    const filtered=[...features].filter(([k,p])=>(area==='all'||area===p.area)&&(quality!=='distinct'||p.confidence==='distinct'));
    const key=area+'/'+quality;
    if(choose.dataset.key!==key){
      choose.replaceChildren(new Option('Vybrat strom…',''));
      for(const [k,p] of filtered)choose.add(new Option(k+' · '+m.areas[p.area],k));
      choose.dataset.key=key;
    }
    choose.value=id||'';
  }
  const image=new Image();image.src=new URL(m.municipal.image,new URL('stromy/',document.baseURI)).href;
  const dialog=q('tree-source'),c=q('tree-scan');
  let current=null;
  function draw(){
    if(!current||!image.naturalWidth)return;
    const p=features.get(current),[x,y]=p.sjtsk,[x0,y0,x1,y1]=m.municipal.bbox;
    const px=(x-x0)*image.width/(x1-x0),py=(y1-y)*image.height/(y1-y0);
    const ctx=c.getContext('2d'),width=520,height=320,ppm=image.width/(x1-x0);
    const windowWidth=67*ppm,windowHeight=windowWidth*height/width;
    c.width=width;c.height=height;
    ctx.drawImage(image,px-windowWidth/2,py-windowHeight/2,windowWidth,windowHeight,0,0,width,height);
    if(q('tree-mark').checked){
      const r=Math.max(10,p.diameter_m_approx*.5*width/67);
      ctx.beginPath();ctx.arc(width/2,height/2,r,0,2*Math.PI);ctx.strokeStyle='#152c24';ctx.lineWidth=4.2;ctx.stroke();ctx.strokeStyle='#aef4ab';ctx.lineWidth=2.4;ctx.stroke();
      ctx.fillStyle='#d6ffd0';ctx.beginPath();ctx.arc(width/2,height/2,2,0,Math.PI*2);ctx.fill();
    }
  }
  image.onload=draw;image.onerror=()=>{q('tree-caption').textContent='Městské ortofoto se nepodařilo načíst. Dubnový snímek otevřete odkazem níže.'};
  function show(id){
    const p=features.get(id);if(!p){if(dialog.open)dialog.close();current=null;return}
    current=id;const distinct=p.confidence==='distinct';
    q('tree-title').textContent='Strom '+id+' · '+m.areas[p.area];
    q('tree-reading').textContent=(distinct?'Zřetelný na snímku. ':'Pravděpodobný strom. ')+m.cues[p.cue];
    q('tree-archive').href=p.source_url;
    q('tree-metrics').textContent='Odhad šířky koruny přibližně '+p.diameter_m_approx+' m. Výška, druh a přesná poloha kmene nejsou změřené.';
    q('tree-coordinate').textContent='S-JTSK (EPSG:5514) '+p.sjtsk.map(fmt).join(' / ')+'. Měřický snímek '+p.flight_id+'. Na osmi kontrolních bodech byla odchylka mapy nejčastěji v řádu metrů (medián '+fmt(m.checks.median_m)+' m, maximum '+fmt(m.checks.max_m)+' m).';
    draw();if(!dialog.open)dialog.showModal();
  }
  q('tree-mark').onchange=draw;
  q('tree-close').onclick=handlers.close;
  dialog.addEventListener('cancel',e=>{e.preventDefault();handlers.close()});
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)handlers.close()}});
  select.onchange=()=>handlers.area(select.value);
  choose.onchange=()=>{if(choose.value)handlers.selectTree(choose.value)};
  q('tree-open').onclick=()=>handlers.showTree(choose.value);
  q('tree-known').onchange=()=>handlers.quality(q('tree-known').checked?'distinct':'all');
  for(const b of document.querySelectorAll('[data-vegetation]'))b.onclick=()=>handlers.style(b.dataset.vegetation);
  function update(s){
    const count=catalog.features.filter(t=>s.quality!=='distinct'||t.properties.confidence==='distinct').length;
    q('tree-summary').textContent=s.vegetation==='off'?'Vrstva skrytá · 1964':count+' stromů ve vrstvě · 1964';
    if(select.dataset.quality!==s.quality){
      for(const item of select.options){
        if(item.value==='all')continue;
        const n=catalog.features.filter(f=>f.properties.area===item.value && (s.quality!=='distinct'||f.properties.confidence==='distinct')).length;
        item.textContent=m.areas[item.value]+' ('+n+')';
      }
      select.dataset.quality=s.quality;
    }
    q('tree-known').checked=s.quality==='distinct';select.value=s.area;
    options(s.area,s.quality,s.tree);
    q('tree-open').disabled=!s.tree;
    for(const b of document.querySelectorAll('[data-vegetation]'))b.setAttribute('aria-pressed',String(b.dataset.vegetation===s.vegetation));
  }
  return {show,update,has:id=>features.has(id),get:id=>features.get(id)};
}
