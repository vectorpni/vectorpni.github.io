import * as THREE from 'three';
// Existing end-cap exits and plug endpoints are retained. The first segment
// leaves the pack outwards; broad bends avoid a swept tube folding into itself.
export function createPackLeadCurve(z){
  const points=z>0?[[-.2,.94,z],[-.2,.94,z+.15],[-.55,.88,z+.27],[-.76,.7,z+.08],[-.72,.65,z-.18],[-.55,.65,z-.25]]:[[-.2,.94,z],[-.2,.94,z-.15],[-.4,.85,z-.39],[-.75,.7,z-.39],[-.75,.65,z-.25],[-.55,.65,z-.25]];
  return new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
}
