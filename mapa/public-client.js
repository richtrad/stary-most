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
