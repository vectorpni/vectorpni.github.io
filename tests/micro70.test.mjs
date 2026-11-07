import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createRecessedSocketGeometry,createBevelledAnnulusGeometry,createFoldedTabGeometry,createLaminatedToothGeometry,createSplitContactGeometry,createSolderFilletGeometry,createContactPostGeometry,createCoolingBladeGeometry,createMicroPackageGeometry} from '../micro-geometry.js';
import {createEngineeringAssembly} from '../engineering-assembly.js';

test('camera passive bodies meet their end caps without coplanar face overlap',()=>{
 const group=new T.Group();group.userData.part='camera';const a=createEngineeringAssembly(group);let sensor;
 a.object.traverse(o=>{if(o.isGroup&&o.userData.leaf==='housing/sensor51')sensor=o;});a.object.updateMatrixWorld(true);
 const ceramic=sensor.children.filter(o=>o.isMesh&&o.material.color.getHexString()==='8a8170'),metal=sensor.children.filter(o=>o.isMesh&&o.material.color.getHexString()==='7a838a');
 const direction=new T.Vector3(0,0,-1).transformDirection(sensor.matrixWorld),ray=new T.Raycaster();
 for(const x of [-.13,.13])for(let i=0;i<5;i++)for(const sign of [-1,1]){
  ray.set(sensor.localToWorld(new T.Vector3(x,-1.33+i*.04+sign*.0065,.35)),direction);
  assert.equal(ray.intersectObjects(ceramic,false).length,0,'ceramic stops before the metal end cap');
  assert.ok(ray.intersectObjects(metal,false).length,'cap still covers its seated termination');
 }
 a.dispose();
});

function valid(g){const p=g.attributes.position,n=g.attributes.normal,ix=g.index?.array,a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),normal=new T.Vector3();for(const attr of Object.values(g.attributes))for(const v of attr.array)assert.ok(Number.isFinite(v));for(let i=0;i<n.count;i++)assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<.003,'unit normal');for(let i=0;i<(ix?.length||p.count);i+=3){const ids=[0,1,2].map(k=>ix?ix[i+k]:i+k);a.fromBufferAttribute(p,ids[0]);b.fromBufferAttribute(p,ids[1]);c.fromBufferAttribute(p,ids[2]);const face=b.sub(a).cross(c.sub(a));assert.ok(face.lengthSq()>1e-24,'nondegenerate face');normal.set(0,0,0);for(const id of ids)normal.add(new T.Vector3().fromBufferAttribute(n,id));assert.ok(face.dot(normal)>-1e-12,'outward normal');}const edges=new Map(),key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v/1e-7)).join(',');for(let i=0;i<(ix?.length||p.count);i+=3){const ids=[0,1,2].map(k=>ix?ix[i+k]:i+k);for(let j=0;j<3;j++){const edge=[key(ids[j]),key(ids[(j+1)%3])].sort().join('|');edges.set(edge,(edges.get(edge)||0)+1);}}assert.ok([...edges.values()].every(n=>n===2),'closed two-manifold surface after spatial welding');g.computeBoundingBox();return g.boundingBox;}

test('socket head has a blind tool recess, a bottom and its original envelope',()=>{
 const g=createRecessedSocketGeometry(),box=valid(g),mesh=new T.Mesh(g,new T.MeshStandardMaterial());mesh.updateMatrixWorld(true);const hit=new T.Raycaster(new T.Vector3(0,1,0),new T.Vector3(0,-1,0)).intersectObject(mesh)[0];assert.ok(hit);assert.ok(Math.abs(hit.point.y-(.009-.018*.64))<1e-7);assert.ok(Math.abs(box.min.y+.009)<1e-7);assert.ok(Math.abs(box.max.y-.009)<1e-7);assert.ok(Math.abs(box.max.x-.026)<1e-7);g.dispose();mesh.material.dispose();
});

test('micro seats remain open and their bevels stay inside the previous bounds',()=>{
 const g=createBevelledAnnulusGeometry(.043,.019,.006),box=valid(g),mesh=new T.Mesh(g,new T.MeshStandardMaterial());mesh.updateMatrixWorld(true);assert.equal(new T.Raycaster(new T.Vector3(0,1,0),new T.Vector3(0,-1,0)).intersectObject(mesh).length,0);assert.ok(Math.abs(box.max.x-.043)<1e-7);assert.ok(Math.abs(box.max.y-.003)<1e-7);g.dispose();mesh.material.dispose();
});

test('layered tooth grooves never expand the former coil clearance envelope',()=>{
 const g=createLaminatedToothGeometry(),box=valid(g),size=box.getSize(new T.Vector3());assert.ok(Math.abs(size.x-.085)<1e-7&&Math.abs(size.y-.09)<1e-7&&Math.abs(size.z-.035)<1e-7);g.dispose();
});

test('folded tabs, solder toes and split contacts are finite closed solids with clear bores',()=>{
 for(const g of [createFoldedTabGeometry(),createSolderFilletGeometry(),createContactPostGeometry(.006,.06),createContactPostGeometry(.018,.16,true),createMicroPackageGeometry(.026,.010,.015)]){valid(g);g.dispose();}
 const g=createSplitContactGeometry(),box=valid(g),mesh=new T.Mesh(g,new T.MeshStandardMaterial());mesh.updateMatrixWorld(true);assert.equal(new T.Raycaster(new T.Vector3(0,1,0),new T.Vector3(0,-1,0)).intersectObject(mesh).length,0);assert.ok(box.max.y<=.0130001);g.dispose();mesh.material.dispose();
});

test('thin fan blade meets the rear hub and clears the existing guard',()=>{
 const g=createCoolingBladeGeometry(),box=valid(g),p=g.attributes.position;let root=Infinity,maxRadius=0;for(let i=0;i<p.count;i++){const radius=Math.hypot(p.getX(i),p.getY(i));root=Math.min(root,radius);maxRadius=Math.max(maxRadius,radius);}assert.ok(root<.075);assert.ok(maxRadius<.31);assert.ok(.834+box.min.z<.8315&&.834+box.max.z>.8315);g.dispose();
});

test('micro parts remain on their original moving battery/camera owners and restore exactly',()=>{
 for(const id of ['battery','camera','motors','fc']){const group=new T.Group();group.userData.part=id;const a=createEngineeringAssembly(group);assert.ok(a.detail70.conditional);const before=new Map();a.object.updateMatrixWorld(true);a.object.traverse(o=>before.set(o.id,o.matrixWorld.elements.slice()));for(let i=0;i<120;i++)a.update(1/120,i%9<4);a.update(.01,false,true);a.object.updateMatrixWorld(true);a.object.traverse(o=>assert.ok(o.matrixWorld.elements.every((v,i)=>Math.abs(v-before.get(o.id)[i])<1e-8)));a.dispose();}
});

test('Pi keeps its GPIO study without recreating the retired generic six-pin connector',()=>{
 const group=new T.Group();group.userData.part='pi';const a=createEngineeringAssembly(group);assert.ok(!a.nodes.some(n=>n.id==='connector/contacts'));assert.ok(a.nodes.some(n=>n.id==='connector/gpio51'));a.dispose();
});

test('SMD pads and solder remain with the PCB when the package section separates',()=>{
 const group=new T.Group();group.userData.part='fc';const a=createEngineeringAssembly(group);let pcb,packages;a.object.traverse(o=>{if(o.isGroup&&o.userData.leaf==='board/laminate51')pcb=o;if(o.isGroup&&o.userData.leaf==='devices/passives')packages=o;});assert.ok(pcb.userData.micro70Added>=32);assert.equal(packages.userData.micro70Added,24);a.object.updateMatrixWorld(true);const before=pcb.getWorldPosition(new T.Vector3()),body=packages.getWorldPosition(new T.Vector3());a.update(.01,true,true);assert.ok(pcb.getWorldPosition(new T.Vector3()).y<before.y);assert.ok(packages.getWorldPosition(new T.Vector3()).y>body.y);a.dispose();
});

test('ESC solder toes and footprints stay within its narrow carrier outline',()=>{
 const group=new T.Group();group.userData.part='esc';const a=createEngineeringAssembly(group);let board;a.object.traverse(o=>{if(o.isGroup&&o.userData.leaf==='board/laminate51')board=o;});board.traverse(o=>{if(!o.isMesh)return;o.geometry.computeBoundingBox();for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){const matrix=new T.Matrix4();if(o.isInstancedMesh)o.getMatrixAt(i,matrix);matrix.premultiply(o.matrix);const box=o.geometry.boundingBox.clone().applyMatrix4(matrix);assert.ok(box.min.z>=1.36-1e-6);assert.ok(box.max.z<=1.54+1e-6);}});a.dispose();
});

test('cached fastener templates never share mutable arrays or GPU ownership with callers',()=>{
 const a=createRecessedSocketGeometry(.031),b=createRecessedSocketGeometry(.031),before=b.attributes.position.array.slice();assert.notEqual(a.attributes.position.array,b.attributes.position.array);a.translate(1,2,3);a.dispose();const c=createRecessedSocketGeometry(.031);assert.deepEqual(b.attributes.position.array,before);assert.deepEqual(c.attributes.position.array,before);assert.throws(()=>createRecessedSocketGeometry(Infinity));b.dispose();c.dispose();
});
