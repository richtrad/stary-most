const BASE = 'https://mapy.mesto-most.cz/server/rest/services/';
const sources = {
  ortho64: {name:'Ortofoto 1964', service:'Ortofoto/Ortofoto1964Vghmur', credit:'Georeal Plzeň · podkladová data © MO ČR'},
  plan30: {name:'Granznerův plán · 30. léta', service:'Rastry/LagePlanLudwigGranzner', credit:'Ludwig Granzner · Mapový archiv města Mostu'},
  plan50: {name:'Orientační plán · 50. léta', service:'Rastry/OrientacniPlanMostu1950s', credit:'Mapový archiv města Mostu'},
  plan38: {name:'Plán města · 1938', service:'Rastry/LageplanDerStadtBrux1938', credit:'Mapový archiv města Mostu'},
  cenia: {name:'Historické ortofoto CENIA', credit:'CENIA · GEODIS BRNO · VGHMÚř · CC BY 4.0'}
};
export function sourceRequest(key, bounds, origin, width=1000, height=600) {
  const source=sources[key] || sources.ortho64;
  const [x,z,X,Z]=bounds, [ox,oy]=origin;
  // This service returns MAP OUT below its supported map scale.
  // Request at most 5 output pixels per metre; the canvas can enlarge the crop.
  if(key==='ortho64'||key==='plan30'){
    const limit=key==='ortho64'?5:12;
    const factor=Math.min(1,limit*(X-x)/width,limit*(Z-z)/height);
    width=Math.max(1,Math.round(width*factor));height=Math.max(1,Math.round(height*factor));
  }
  const box=[ox+x,oy-Z,ox+X,oy-z].map(n=>n.toFixed(3)).join(',');
  const args=new URLSearchParams();
  let url;
  if(key==='cenia'){
    Object.entries({SERVICE:'WMS',VERSION:'1.1.1',REQUEST:'GetMap',LAYERS:'orto',STYLES:'',SRS:'EPSG:5514',BBOX:box,WIDTH:width,HEIGHT:height,FORMAT:'image/png'}).forEach(([k,v])=>args.set(k,v));
    url='https://gis.cenia.cz/mapcache/ortofotomapa_historicka/wms?'+args;
  }else{
    Object.entries({bbox:box,bboxSR:5514,imageSR:5514,size:width+','+height,format:'jpg',f:'image'}).forEach(([k,v])=>args.set(k,v));
    url=BASE+source.service+'/MapServer/export?'+args;
  }
  return {...source,url};
}
export function fitBounds(bounds, aspect=5/3, margin=1.18, minimum=45) {
  const [x,z,X,Z]=bounds;
  const width=Math.max(minimum,(X-x)*margin,(Z-z)*margin*aspect);
  const height=width/aspect;
  return [(x+X-width)/2,(z+Z-height)/2,(x+X+width)/2,(z+Z+height)/2];
}
export function boundsOf(points) {
  return [Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];
}
export function sourceCanvas(canvas, origin, caption, link) {
  const ctx=canvas.getContext('2d');
  let current=null, loaded=null, serial=0, marks=true;
  canvas.width=1000;canvas.height=600;
  function draw(){
    if(!current || !loaded)return;
    const [x,z,X,Z]=current.bounds, sx=canvas.width/(X-x),sz=canvas.height/(Z-z);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(loaded,0,0,canvas.width,canvas.height);
    if(!marks)return;
    ctx.lineJoin='round';ctx.lineCap='round';
    const path=new Path2D();
    for(const line of current.lines || []){
      line.forEach(([a,b],i)=>path[i?'lineTo':'moveTo']((a-x)*sx,(b-z)*sz));
    }
    for(const ring of current.rings || []){
      ring.forEach(([a,b],i)=>path[i?'lineTo':'moveTo']((a-x)*sx,(b-z)*sz));
      path.closePath();
    }
    if(current.rings?.length){ctx.fillStyle='#f8d56940';ctx.fill(path,'evenodd')}
    ctx.lineWidth=4;ctx.strokeStyle='#173b30';ctx.stroke(path);
    ctx.lineWidth=2;ctx.strokeStyle='#ffe189';ctx.stroke(path);
    for(const p of current.points || []){
      ctx.beginPath();ctx.arc((p[0]-x)*sx,(p[1]-z)*sz,(p[2]||4)*sx,0,Math.PI*2);
      ctx.lineWidth=4;ctx.strokeStyle='#153e2b';ctx.stroke();ctx.lineWidth=2;ctx.strokeStyle='#d6ffae';ctx.stroke();
    }
  }
  function show(record,key='ortho64') {
    current={...record,bounds:fitBounds(record.bounds)};
    const request=sourceRequest(key,current.bounds,origin);
    caption.textContent=request.name+' · '+request.credit;
    link.href=request.url;
    const ticket=++serial;loaded=null;
    ctx.fillStyle='#e8e6db';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.font='22px Segoe UI';ctx.fillStyle='#365846';ctx.fillText('Načítám historický podklad…',30,52);
    const img=new Image();
    img.onload=()=>{if(ticket!==serial)return;loaded=img;draw()};
    img.onerror=()=>{if(ticket!==serial)return;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillText('Podklad je dostupný přes odkaz pod obrázkem.',30,52);caption.textContent+=' · náhled se nepodařilo načíst'};
    img.src=request.url;
  }
  return {show,mark(value){marks=value;draw()},clear(){serial++;current=null;loaded=null}};
}
