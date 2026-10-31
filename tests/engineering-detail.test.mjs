import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createDetailBuilder,createEngineeringMaterials} from '../detail-primitives.js';
import {engineeringCatalog} from '../engineering-catalog.js';
import {createEngineeringAssembly} from '../engineering-assembly.js';
import {addEngineeringDetail} from '../engineering-detail.js';

test('all 16 owners have evidence, omissions and explicit conditional detail metadata',()=>{
  assert.equal(Object.keys(engineeringCatalog).length,16);assert.equal(engineeringCatalog.charger.sections.length,0);
  for(const row of Object.values(engineeringCatalog)){assert.ok(row.known.length&&row.unknown.length);const ids=new Set();for(const s of row.sections){assert.ok(!ids.has(s.id));ids.add(s.id);for(const k of ['label','purpose','geometry','material','attachment','status'])assert.ok(s[k].length);assert.equal(s.offset.length,3);assert.ok(s.offset.every(Number.isFinite));}}
});
test('mechanical sleeves have a real bore and finite nondegenerate outward faces',()=>{
  const p=new THREE.Group(),m=createEngineeringMaterials(),b=createDetailBuilder();b.sleeve(p,m.metal,[0,0,0],.1,.05,.2);b.socket(p,m.metal,[.3,0,0]);b.finish();const g=p.children[0].geometry,a=g.attributes.position,n=g.attributes.normal;
  for(let i=0;i<a.count;i+=3){const v=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(a,i+j)),face=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));assert.ok(face.lengthSq()>1e-24);const normal=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(n,i+j)).reduce((a,b)=>a.add(b),new THREE.Vector3());assert.ok(face.dot(normal)>0);}
  p.updateMatrixWorld(true);const ray=new THREE.Raycaster(new THREE.Vector3(0,1,0),new THREE.Vector3(0,-1,0));assert.equal(ray.intersectObject(p,true).length,0,'axis is open');
});
test('repeated winding geometry is instanced with the same envelope and less buffer memory',()=>{
  const results=[];for(const instanceRepeated of [false,true]){const p=new THREE.Group(),m=createEngineeringMaterials(),b=createDetailBuilder();for(let i=0;i<60;i++)b.ring(p,m.copper,[i*.01,0,0],.037,.005,[0,0,0]);b.finish({instanceRepeated});p.updateMatrixWorld(true);const mesh=p.children[0],g=mesh.geometry;results.push({bounds:new THREE.Box3().setFromObject(p),bytes:Object.values(g.attributes).reduce((n,a)=>n+a.array.byteLength,0)+(g.index?.array.byteLength||0)+(mesh.instanceMatrix?.array.byteLength||0),mesh});}
  assert.ok(results[1].mesh.isInstancedMesh);assert.equal(results[1].mesh.count,60);assert.ok(results[1].bytes<results[0].bytes/10);assert.ok(results[0].bounds.min.distanceTo(results[1].bounds.min)<1e-6);assert.ok(results[0].bounds.max.distanceTo(results[1].bounds.max)<1e-6);
});
test('new exterior SMDs sit on their boards and ESC detail stays under the heat sink',()=>{
  const rows=[];addEngineeringDetail({mesh(g,m,id,x=0,y=0,z=0){const o=new THREE.Mesh(g,m.clone());o.position.set(x,y,z);rows.push({id,o});return o;}});
  assert.equal(rows.filter(r=>r.id==='esc').length,0,'no packages intersect the exterior ESC heat sink');
  const tops={fc:.36,power:.21,becpi:.39,becfc:.39,pi:-.33};for(const [id,top]of Object.entries(tops)){const row=rows.find(r=>r.id===id&&r.o.material.color.getHexString()==='8a8170');assert.ok(row);row.o.geometry.computeBoundingBox();assert.ok(Math.abs(row.o.geometry.boundingBox.min.y-top)<1e-6,id+' packages have a supported seat');}
  const support=rows.find(r=>r.id==='fc'&&r.o.material.color.getHexString()==='202321');support.o.geometry.computeBoundingBox();assert.ok(Math.abs(support.o.geometry.boundingBox.min.y-.177)<1e-6);assert.ok(Math.abs(support.o.geometry.boundingBox.max.y-.28)<1e-6);
});
test('power node clears the lower plate without changing relative child transforms',()=>{
  const power=new THREE.Group(),a=new THREE.Mesh(new THREE.BoxGeometry(1.25,.06,.95),new THREE.MeshStandardMaterial()),c=new THREE.Mesh(new THREE.BoxGeometry(.1,.02,.1),new THREE.MeshStandardMaterial());a.position.set(0,.18,-.28);c.position.set(.2,.25,-.3);power.add(a,c);const delta=c.position.clone().sub(a.position);addEngineeringDetail({groups:{power},mesh(g,m,id,x=0,y=0,z=0){const o=new THREE.Mesh(g,m.clone());o.position.set(x,y,z);if(id==='power')power.add(o);return o;}});assert.ok(a.position.y-.03>.177);assert.ok(c.position.clone().sub(a.position).distanceTo(delta)<1e-12);assert.ok(Math.abs(a.position.y-.23)<1e-12);
});
test('nested motor opens reversibly, isolates leaves, and owns GPU wrappers without mutating source',()=>{
  const g=new THREE.Group();g.userData.part='motors';const material=new THREE.MeshStandardMaterial(),geometry=new THREE.CylinderGeometry(.2,.2,.2,24);for(const y of [.45,.61,.7]){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(2.08,y,2.08);g.add(mesh);}g.updateMatrixWorld(true);const original=geometry.attributes.position.array.slice();let disposed=0;geometry.addEventListener('dispose',()=>disposed++);
  const a=createEngineeringAssembly(g);assert.equal(a.catalog.sections.length,4);assert.ok(a.nodes.some(n=>n.id==='stator/windings'));for(const section of a.catalog.sections)assert.ok(a.object.children.find(g=>g.userData.section===section.id).children.length);
  for(let k=0;k<200;k++)a.update(1/60,k%13<6);for(let k=0;k<120;k++)a.update(1/60,false);assert.ok(Math.abs(a.amount)<.0001);a.update(.01,true,true);assert.equal(a.amount,1);
  a.select('stator/windings',true);let selected=0,other=0;a.object.traverseVisible(o=>{if(o.isMesh){if(o.userData.leaf==='stator/windings')selected++;else other++;}});assert.ok(selected>0);assert.equal(other,0);
  a.select('stator/windings',false);a.object.traverse(o=>{if(o.isMesh)assert.equal(o.material.emissiveIntensity>0,o.userData.leaf==='stator/windings','highlight belongs only to the selected leaf');});
  const winding=a.object.getObjectByName('Изолированные обмотки').children[0];assert.ok(winding.isInstancedMesh);assert.equal(winding.count,60,'repeated winding loops share a single geometry');
  const matrices=winding.instanceMatrix.array.slice();a.select('stator/windings@'+winding.id+':17',true);assert.equal(winding.count,1);assert.deepEqual(winding.instanceMatrix.array.slice(0,16),matrices.slice(17*16,18*16));assert.ok(a.selectionBounds().sphere.radius<.1,'fourth-level focus uses one visible element');a.select(null,false);assert.equal(winding.count,60);assert.deepEqual(winding.instanceMatrix.array,matrices);
  a.select(null,false);assert.deepEqual(geometry.attributes.position.array,original);a.dispose();a.dispose();assert.equal(disposed,0);assert.ok(material.emissive.getHex()===0);
});
