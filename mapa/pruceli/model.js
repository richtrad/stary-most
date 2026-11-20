import * as T from 'three';
import {roofTones, toneFor} from '../vzhled.js';

// The GLBs use a common facade coordinate system: left jamb at x=0, street at +Z.
export function placeFront(file, house, variant, appearance) {
  const [[x,z],[xx,zz]] = house.edge;
  const yaw = T.MathUtils.degToRad(house.yaw);
  const group = file.scene;
  group.position.set(house.position[0] + x*Math.cos(yaw) + z*Math.sin(yaw), house.position[1],
    house.position[2] - x*Math.sin(yaw) + z*Math.cos(yaw));
  group.rotation.y = yaw - Math.atan2(zz-z,xx-x);
  const front = group.getObjectByName('Pruceli');
  let plaster;
  const materials = new Set();
  group.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = true;
    o.userData.cp = house.cp;
    o.userData.photoFront = false;
    for (const m of [].concat(o.material)) materials.add(m);
  });
  front.traverse(o => { if (o.isMesh) o.userData.photoFront = true; });
  for (const m of materials) {
    if (m.name === 'omitka') plaster = m;
    if (m.name === 'krytina') {
      m.color.setHex(0x8d9984);
      appearance.tint(m,toneFor(roofTones,house.id));
    }
  }
  const shapes = variant.outline.map(ring => new T.Shape(ring.map(([u,y]) => new T.Vector2(u,y))));
  const plain = new T.Mesh(new T.ShapeGeometry(shapes),plaster);
  plain.name = 'Ulicni_stena'; plain.userData = {cp:house.cp,photoFront:true};
  plain.castShadow = plain.receiveShadow = true;
  group.add(plain);
  function setLevel(level) {
    front.visible = level === 'pruceli';
    plain.visible = !front.visible;
  }
  setLevel('pruceli');
  return {group,setLevel};
}
