import fs from 'node:fs/promises';
import * as THREE from 'three';
import {createDetailBuilder,createEngineeringMaterials} from '../detail-primitives.js';
import {disposeSceneResources} from '../viewer-resources.js';
const rows=[];
for(const instanceRepeated of [false,true]){
  const object=new THREE.Group(),materials=createEngineeringMaterials(),b=createDetailBuilder();
  for(let i=0;i<60;i++)b.ring(object,materials.copper,[i*.01,0,0],.037,.005,[0,0,0]);b.finish({instanceRepeated});
  let bytes=0,triangles=0;object.traverse(o=>{if(!o.isMesh)return;const g=o.geometry;bytes+=Object.values(g.attributes).reduce((n,a)=>n+a.array.byteLength,0)+(g.index?.array.byteLength||0)+(o.instanceMatrix?.array.byteLength||0);triangles+=(g.index?.count||g.attributes.position.count)/3*(o.count||1);});
  rows.push({variant:instanceRepeated?'instanced':'merged',elements:60,draws:object.children.length,triangles,typedBufferBytes:bytes});disposeSceneResources(object);Object.values(materials).forEach(m=>m.dispose());
}
await fs.writeFile('qa-artifacts/detail50/winding-memory.json',JSON.stringify({method:'CPU typed arrays only: same 60 torus loops; vertex, normal, UV, index and instance matrix buffers. Not process RSS or GPU timing.',rows},null,2));console.log(JSON.stringify(rows));
