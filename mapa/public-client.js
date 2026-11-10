export function normalizeCity(publicData) {
  const streets = [], detailedRoadIndices = [];
  for (const street of publicData.streets) {
    for (const path of street.paths) {
      if (street.id === 24) detailedRoadIndices.push(streets.length);
      streets.push(path);
    }
  }
  return {
    crs: publicData.crs,
    buildings: publicData.buildings.map(b => [b.id,b.heightM,b.parts.map(p=>[p.outer,p.holes || []])]),
    streets, detailedRoadIndices, streetSurfaceModels: []
  };
}

export function selectLocalModels(input, notice, houses, refresh) {
  const versions = Object.values(houses).flatMap(h =>
    Object.entries(h.pilotVersions).map(([layer, version]) => ({h,layer,version})));
  input.addEventListener('change', async () => {
    const files=Array.from(input.files);
    if (!files.length) return;
    input.disabled=true;
    const changed=[];
    let skipped=0;
    try {
      for (const file of files) {
        const candidates=versions.filter(v=>v.version.bytes===file.size);
        if (!candidates.length) { skipped++; continue; }
        const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
        const hash=Array.from(new Uint8Array(digest), b=>b.toString(16).padStart(2,'0')).join('');
        const item=candidates.find(v=>v.version.sha256===hash);
        if (!item) {skipped++; continue;}
        const {h,layer,version}=item;
        if (h.variants[layer].local) continue;
        h.variants[layer]={...version,url:URL.createObjectURL(file),local:true};
        changed.push([h.cp,layer]);
      }
      if (changed.length) refresh(changed);
      const active=Object.values(houses).flatMap(h=>Object.values(h.variants)).filter(v=>v.local).length;
      notice.textContent='Místní modely se shodným SHA-256: '+active+' / 6.'+(skipped?' Soubory mimo pilot: '+skipped+'.':'');
    } catch (err) {
      if (changed.length) refresh(changed);
      notice.textContent='Čtení souboru se přerušilo. Jednotlivé modely můžete vybrat znovu.';
    } finally {
      input.disabled=false;
      input.value='';
    }
  });
}
