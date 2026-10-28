import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {addUltraDetail} from '../ultra-detail.js';
import {instancePartMeshes} from '../viewer-instancing.js';
import {createMotorBellGeometry} from '../motor-geometry.js';

test('mechanical detail stays in owning groups with bounded draw budget and finite geometry',()=>{
 const ids=['frame','motors','props','battery','wiring','fc','power','becpi','becfc','radio','camera','cooling'];
 const groups=Object.fromEntries(ids.map(id=>[id,new THREE.Group()])),meshes=[];
 const context={fillRect(){},set fillStyle(v){}},image={width:128,height:128,getContext(){return context;}};
 const carbon=new THREE.MeshStandardMaterial({map:new THREE.Texture(image)}),black=new THREE.MeshStandardMaterial(),grey=black.clone(),rubber=black.clone();
 const mesh=(g,m,id,...p)=>{const o=new THREE.Mesh(g,m.clone());o.position.set(...p);o.userData.part=id;groups[id].add(o);meshes.push(o);return o;};
 const strap=mesh(new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(0,0),new THREE.Vector2(1,0),new THREE.Vector2(1,1)]),{depth:.1,bevelEnabled:false}),black,'wiring',0,0,0);
 const shaft=mesh(new THREE.CylinderGeometry(.025,.025,.085,32),grey,'motors',2.08,.85,2.08);
 const post=mesh(new THREE.CylinderGeometry(.045,.045,.48,32),black,'frame',.77,.32,.83);
 const cap=mesh(new THREE.CylinderGeometry(.055,.055,.03,32),grey,'wiring',.77,.615,.83);
 addUltraDetail({groups,meshes,mesh,carbon,black,grey,rubber});
 assert.equal(strap.parent,groups.battery);assert.equal(strap.userData.part,'battery');
 assert.equal(cap.parent,groups.frame);assert.equal(cap.userData.part,'frame');
 assert.ok(Math.abs(shaft.position.y+.085*shaft.scale.y/2-.8925)<1e-6,'shaft tip unchanged');
 assert.ok(shaft.position.y-.085*shaft.scale.y/2<.725,'shaft contacts bearing');
 assert.ok(post.position.y+.48*post.scale.y/2>=cap.position.y-.015,'standoff contacts cap');
 for(const [id,g] of Object.entries(groups))for(const o of g.children){assert.equal(o.userData.part,id);for(const v of o.geometry.attributes.position.array)assert.ok(Number.isFinite(v));}
 const root=new THREE.Group();root.add(...Object.values(groups));root.updateMatrixWorld(true);const before=new THREE.Box3().setFromObject(root);instancePartMeshes(groups,meshes);root.updateMatrixWorld(true);
 assert.ok(meshes.length<=32,'at most 32 additional draws');const after=new THREE.Box3().setFromObject(root);assert.ok(before.min.distanceTo(after.min)<1e-6&&before.max.distanceTo(after.max)<1e-6);
 for(const id of ids){groups[id].position.y=2;groups[id].updateMatrixWorld(true);for(const o of groups[id].children)assert.ok(Math.abs(o.matrixWorld.elements[13]-o.position.y-2)<1e-6);groups[id].position.y=0;}
});
test('motor vents retain original bell envelope and finite normals',()=>{
 const g=createMotorBellGeometry();g.computeBoundingBox();assert.ok(Math.abs(g.boundingBox.max.x-.247)<1e-6);assert.ok(Math.abs(g.boundingBox.max.y-.095)<1e-6);
 for(const n of g.attributes.normal.array)assert.ok(Number.isFinite(n));assert.ok(g.index.count<5000);g.dispose();
});
