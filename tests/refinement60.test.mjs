import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createCableSaddleGeometry} from '../detail60-mechanical.js';
import {createSlottedBuckleGeometry,createNotchedRetainerGeometry} from '../detail60-camera-battery.js';
import {createEngineeringAssembly} from '../engineering-assembly.js';
import {createStudyMaterialPool} from '../engineering-materials.js';
import {escFastenerSeat} from '../esc-fasteners.js';

function mesh(g){return new T.Mesh(g,new T.MeshStandardMaterial());}
function valid(g){const p=g.attributes.position,n=g.attributes.normal,ix=g.index?.array;for(const a of Object.values(g.attributes))for(const value of a.array)assert.ok(Number.isFinite(value));const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),normal=new T.Vector3();for(let i=0;i<(ix?.length||p.count);i+=3){const ids=[0,1,2].map(k=>ix?ix[i+k]:i+k);a.fromBufferAttribute(p,ids[0]);b.fromBufferAttribute(p,ids[1]);c.fromBufferAttribute(p,ids[2]);const face=b.sub(a).cross(c.sub(a));assert.ok(face.lengthSq()>1e-24);normal.set(0,0,0);for(const id of ids)normal.add(new T.Vector3().fromBufferAttribute(n,id));assert.ok(face.dot(normal)>-1e-12);}}
test('hollow cable saddle clears both the inherited carbon arm and cable axes',()=>{
  const g=createCableSaddleGeometry();valid(g);const o=mesh(g);o.updateMatrixWorld(true);
  for(const y of [-.04,.09])assert.equal(new T.Raycaster(new T.Vector3(0,y,1),new T.Vector3(0,0,-1)).intersectObject(o).length,0);
  assert.ok(new T.Raycaster(new T.Vector3(.112,-.04,1),new T.Vector3(0,0,-1)).intersectObject(o).length);g.dispose();o.material.dispose();
});
test('buckle has two real open strap slots and a solid middle bridge',()=>{
  const g=createSlottedBuckleGeometry();valid(g);const o=mesh(g);o.updateMatrixWorld(true);
  for(const y of [-.036,.036])assert.equal(new T.Raycaster(new T.Vector3(1,y,0),new T.Vector3(-1,0,0)).intersectObject(o).length,0);
  assert.ok(new T.Raycaster(new T.Vector3(1,0,0),new T.Vector3(-1,0,0)).intersectObject(o).length);g.dispose();o.material.dispose();
});
test('notched lens retainer has outward faces and never closes the optical axis',()=>{
  const g=createNotchedRetainerGeometry();valid(g);const o=mesh(g);o.updateMatrixWorld(true);
  assert.equal(new T.Raycaster(new T.Vector3(0,0,1),new T.Vector3(0,0,-1)).intersectObject(o).length,0);
  assert.ok(new T.Raycaster(new T.Vector3(0,.12,1),new T.Vector3(0,0,-1)).intersectObject(o).length);g.dispose();o.material.dispose();
});
test('PCB vias pass through the actual carrier and both pads without modifying source buffers',()=>{
  const source=new T.Group();source.userData.part='fc';const body=mesh(new RoundedBoxGeometry(.6,.08,.6,2,.008));body.material.color.set('#234a37');body.position.set(0,.32,.2);source.add(body);const original=body.geometry.attributes.position.array.slice(),a=createEngineeringAssembly(source);a.object.position.set(0,0,0);a.select('board',true);a.object.updateMatrixWorld(true);
  const x=.6*.34,z=.2-1.5*.6*.085;assert.equal(new T.Raycaster(new T.Vector3(x,1,z),new T.Vector3(0,-1,0)).intersectObject(a.object,true).filter(h=>{let p=h.object;while(p){if(!p.visible)return false;p=p.parent;}return true;}).length,0);
  assert.ok(a.detail60.pieces>40);assert.ok(a.nodes.find(n=>n.id==='board/vias60'));a.dispose();assert.deepEqual(body.geometry.attributes.position.array,original);
});
test('new child details retain ownership through reversible nested motion',()=>{
  for(const id of ['battery','camera']){
    const source=new T.Group();source.userData.part=id;const body=mesh(new T.BoxGeometry(...(id==='camera'?[.56,.4,.45]:[1.05,.65,1.65])));body.position.set(...(id==='camera'?[0,-1.25,.2]:[0,.91,-.12]));source.add(body);const a=createEngineeringAssembly(source);a.object.updateMatrixWorld(true);const before=new Map();a.object.traverse(o=>before.set(o.id,o.matrixWorld.elements.slice()));for(let i=0;i<200;i++)a.update(1/120,i%11<5);a.select(null,false);a.update(.01,false,true);a.object.updateMatrixWorld(true);a.object.traverse(o=>assert.ok(o.matrixWorld.elements.every((v,i)=>Math.abs(v-before.get(o.id)[i])<1e-8)));assert.ok(a.detail60.pieces>20);a.dispose();
  }
});

test('ordinary study surfaces share one material without highlight bleeding between leaves',()=>{
  const root=new T.Group(),source=new T.MeshStandardMaterial({color:'#abcdef',roughness:.41}),a=mesh(new T.BoxGeometry()),b=mesh(new T.BoxGeometry());a.material=source;b.material=source.clone();root.add(a,b);
  const pool=createStudyMaterialPool(root);assert.equal(pool.counts.ordinary,1);assert.equal(a.material,b.material);assert.notEqual(a.material,source);pool.setHighlighted(a,true);assert.notEqual(a.material,b.material);assert.equal(a.material.emissiveIntensity,.22);assert.equal(b.material.emissive.getHex(),0);pool.setHighlighted(b,true);assert.equal(a.material,b.material);pool.setHighlighted(a,false);assert.equal(a.material.emissive.getHex(),0);assert.equal(b.material.emissiveIntensity,.22);pool.setHighlighted(b,false);assert.equal(a.material,b.material);assert.equal(pool.counts.highlighted,1);pool.dispose();
});

test('study pool preserves precise colours, distinct textures and instancing program variants',()=>{
  const root=new T.Group(),texture=new T.DataTexture(new Uint8Array([255,255,255,255]),1,1);texture.source.toJSON=()=>{throw Error('No pixel serialisation');};
  const material=new T.MeshStandardMaterial({map:texture});material.color.setRGB(.5,.5,.5);const a=mesh(new T.BoxGeometry()),b=mesh(new T.BoxGeometry()),c=mesh(new T.BoxGeometry()),d=new T.InstancedMesh(new T.BoxGeometry(),material,2);a.material=material;b.material=material.clone();b.material.color.setRGB(.500001,.5,.5);c.material=material.clone();c.material.map=texture.clone();root.add(a,b,c,d);const pool=createStudyMaterialPool(root);assert.equal(pool.counts.ordinary,4);assert.equal(a.material.map,texture);assert.notEqual(a.material,b.material);assert.notEqual(a.material,c.material);assert.notEqual(a.material,d.material);pool.dispose();
});

test('material variants release only owned materials and remain disposable after context restoration',()=>{
  const root=new T.Group(),source=new T.MeshStandardMaterial(),a=new T.Mesh(new T.BoxGeometry(),source);root.add(a);let sourceDisposed=0,baseDisposed=0,highlightDisposed=0;source.addEventListener('dispose',()=>sourceDisposed++);const pool=createStudyMaterialPool(root),base=a.material;base.addEventListener('dispose',()=>baseDisposed++);pool.setHighlighted(a,true);a.material.addEventListener('dispose',()=>highlightDisposed++);pool.dispose();pool.setHighlighted(a,false);assert.equal(a.material,base);pool.setHighlighted(a,true);pool.dispose();assert.equal(sourceDisposed,0);assert.equal(baseDisposed,2);assert.equal(highlightDisposed,2);
});

test('conditional ESC PCB and supports align with the existing diagonal shell and return exactly',()=>{
  const source=new T.Group();source.userData.part='esc';const cover=mesh(new RoundedBoxGeometry(.46,.17,.23,2,.008));cover.position.set(1.45,.46,1.45);cover.rotation.y=Math.PI/4;source.add(cover);const before=cover.matrix.clone(),a=createEngineeringAssembly(source);a.object.position.set(0,0,0);a.object.updateMatrixWorld(true);
  const inverse=new T.Matrix4().makeTranslation(1.45,0,1.45).multiply(new T.Matrix4().makeRotationY(Math.PI/4)).invert();let pcb; a.object.traverse(o=>{if(o.userData.leaf==='board/substrate'&&o.isGroup)pcb=o;});assert.ok(pcb);
  const testCarrier=()=>{let vertices=0;pcb.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).applyMatrix4(inverse);assert.ok(Math.abs(v.x)<.191&&Math.abs(v.z)<.091,'carrier stays inside the matching shell footprint');vertices++;}});assert.ok(vertices>0);};testCarrier();
  a.object.traverse(o=>{if(!o.isGroup||!o.name.startsWith('Внутренние детали в системе'))return;const bounds=new T.Box3();o.traverse(mesh=>{if(!mesh.isMesh)return;if(mesh.isInstancedMesh)mesh.computeBoundingBox();else mesh.geometry.computeBoundingBox();bounds.union((mesh.isInstancedMesh?mesh.boundingBox:mesh.geometry.boundingBox).clone().applyMatrix4(mesh.matrixWorld.clone().premultiply(inverse)));});assert.ok(bounds.min.y>.375&&bounds.max.y<.545,'authored internals clear the original bottom and roof');assert.ok(bounds.min.x>-.23&&bounds.max.x<.23&&bounds.min.z>-.115&&bounds.max.z<.115,'authored internals clear side walls');});
  const closed=new Map();a.object.traverse(o=>closed.set(o.id,o.matrixWorld.elements.slice()));for(let i=0;i<180;i++)a.update(1/120,i%13<6);a.update(.01,false,true);a.object.updateMatrixWorld(true);testCarrier();a.object.traverse(o=>assert.ok(o.matrixWorld.elements.every((v,i)=>Math.abs(v-closed.get(o.id)[i])<1e-8)));assert.deepEqual(cover.matrix,before);a.dispose();
});

test('opened camera exposes its complete sensor assembly between the case and removed back cover',()=>{
  const source=new T.Group();source.userData.part='camera';const body=mesh(new T.BoxGeometry(.56,.4,.45));body.position.set(0,-1.25,.2);source.add(body);const a=createEngineeringAssembly(source);let shell,sensor,back;a.object.traverse(o=>{if(!o.isGroup)return;if(o.userData.leaf==='housing/open-case51')shell=o;if(o.userData.leaf==='housing/sensor51')sensor=o;if(o.userData.leaf==='housing/back51')back=o;});
  for(let i=0;i<320;i++){a.update(1/120,i<160);a.object.updateMatrixWorld(true);assert.ok(new T.Box3().setFromObject(sensor).min.z>new T.Box3().setFromObject(back).max.z+.005,'sensor stays clear of the cover and its screws during reversal');}
  a.update(.01,true,true);a.object.updateMatrixWorld(true);const caseBox=new T.Box3().setFromObject(shell),sensorBox=new T.Box3().setFromObject(sensor),backBox=new T.Box3().setFromObject(back);assert.ok(sensorBox.max.z<caseBox.min.z-.005,'all sensor supports clear the rear case opening');assert.ok(sensorBox.min.z>backBox.max.z+.005,'sensor does not collide with the removed cover');a.update(.01,false,true);assert.equal(sensor.position.z,0);a.dispose();
});

test('camera replaces the rotated solid source barrel once, retaining its material and open bore',()=>{
  const source=new T.Group();source.userData.part='camera';const barrel=mesh(new T.CylinderGeometry(.19,.19,.15,64));barrel.position.set(0,-1.25,.48);barrel.rotation.x=Math.PI/2;barrel.material.color.set('#334455');barrel.material.roughness=.47;source.add(barrel);const positions=barrel.geometry.attributes.position.array.slice(),a=createEngineeringAssembly(source);let oldSurface=false,newSurface=false;a.object.traverse(o=>{if(o.geometry?.attributes.position===barrel.geometry.attributes.position)oldSurface=true;if(o.isMesh&&o.userData.leaf==='optics/barrel51'&&o.material.color.getHexString()==='334455'){newSurface=true;assert.equal(o.material.roughness,.47);}});assert.equal(oldSurface,false);assert.ok(newSurface);a.object.position.set(0,0,0);a.select('optics/barrel51',true);a.object.updateMatrixWorld(true);assert.equal(new T.Raycaster(new T.Vector3(0,-1.25,2),new T.Vector3(0,0,-1)).intersectObject(a.object,true).filter(h=>{let o=h.object;while(o){if(!o.visible)return false;o=o.parent;}return true;}).length,0);a.dispose();assert.deepEqual(barrel.geometry.attributes.position.array,positions);
});

test('battery stitch is seated on its webbing face using private geometry and keeps source data unchanged',()=>{
  const source=new T.Group();source.userData.part='battery';const points=Array.from({length:16},(_,i)=>new T.Vector3(Math.cos(i*Math.PI/8)*.5,.92+Math.sin(i*Math.PI/8)*.3,-.683)),thread=mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points,true),64,.0038,4,true));thread.material.color.set('#973426');source.add(thread);const original=thread.geometry.attributes.position.array.slice(),a=createEngineeringAssembly(source);a.object.position.set(0,0,0);a.object.updateMatrixWorld(true);let seated;a.object.traverse(o=>{if(o.material?.color.getHexString()==='973426')seated=o;});assert.ok(seated);const bounds=new T.Box3().setFromObject(seated);assert.ok(bounds.max.z<=-.6849999,'stitch does not intrude through the webbing face');assert.notEqual(seated.geometry.attributes.position,thread.geometry.attributes.position);a.dispose();assert.deepEqual(thread.geometry.attributes.position.array,original);
});

test('all sixteen existing ESC screws touch the actual case or fin geometry instead of floating',()=>{
  for(const sx of [-1,1])for(const sz of [-1,1]){const root=new T.Group(),angle=sx*sz*Math.PI/4,cx=sx*1.45,cz=sz*1.45,body=mesh(new RoundedBoxGeometry(.46,.17,.23,2,.008));body.position.set(cx,.46,cz);body.rotation.y=angle;root.add(body);for(let i=0;i<9;i++){const fin=mesh(new RoundedBoxGeometry(.34,.018,.011,2,.002));fin.position.set(cx,.56+(i%2)*.004,cz+(i-4)*.025);fin.rotation.y=angle;root.add(fin);}root.updateMatrixWorld(true);for(let i=0;i<4;i++){const p=escFastenerSeat(cx,cz,angle,i),hit=new T.Raycaster(new T.Vector3(p.x,1,p.z),new T.Vector3(0,-1,0)).intersectObject(root,true)[0];assert.ok(hit);assert.ok(Math.abs(p.y-.023/2-hit.point.y)<1e-6,'head underside touches the existing support surface');}}
});
