import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPreviewPart} from '../viewer-preview.js';
import {instancePartMeshes} from '../viewer-instancing.js';

test('preview reuses geometry, shares private materials and retains instancing',()=>{
 const group=new THREE.Group();group.userData.part='frame';const geo=new THREE.BoxGeometry(.2,.1,.3),texture=new THREE.DataTexture(new Uint8Array(4),1,1),material=new THREE.MeshStandardMaterial({map:texture,emissive:0x66816e,emissiveIntensity:.42});
 for(let i=0;i<12;i++){const o=new THREE.Mesh(geo,material);o.position.set(i*.2,.5,0);o.userData.part='frame';group.add(o);}
 const all=[...group.children];instancePartMeshes({frame:group},all);const mainMatrix=group.children[0].instanceMatrix.array.slice();let geometryDisposed=0,textureDisposed=0,mainMaterialDisposed=0;geo.addEventListener('dispose',()=>geometryDisposed++);texture.addEventListener('dispose',()=>textureDisposed++);material.addEventListener('dispose',()=>mainMaterialDisposed++);
 const preview=createPreviewPart(group);assert.equal(preview.object.children.length,1);const mesh=preview.object.children[0];assert.ok(mesh.isInstancedMesh);assert.equal(mesh.count,12);assert.notEqual(mesh.geometry,geo);assert.equal(mesh.geometry.attributes.position,geo.attributes.position);assert.equal(mesh.geometry.index,geo.index);assert.notEqual(mesh.material,material);assert.notEqual(mesh.material.map,texture);assert.equal(mesh.material.map.source,texture.source);assert.equal(mesh.material.emissiveIntensity,0);assert.equal(material.emissiveIntensity,.42);assert.deepEqual(group.children[0].instanceMatrix.array,mainMatrix);
 preview.dispose();assert.equal(geometryDisposed,0);assert.equal(textureDisposed,0);assert.equal(mainMaterialDisposed,0);
});
test('preview owns disposable wrappers without copying vertex or pixel data',()=>{
 const group=new THREE.Group();group.userData.part='frame';const geometry=new THREE.BoxGeometry(),texture=new THREE.DataTexture(new Uint8Array(4),1,1),material=new THREE.MeshStandardMaterial({map:texture,bumpMap:texture});for(let i=0;i<2;i++){const mesh=new THREE.Mesh(geometry,material);mesh.userData.part='frame';group.add(mesh);}
 const preview=createPreviewPart(group),mesh=preview.object.children[0];let geoDisposed=0,texDisposed=0;
 mesh.geometry.addEventListener('dispose',()=>geoDisposed++);mesh.material.map.addEventListener('dispose',()=>texDisposed++);
 assert.equal(mesh.geometry.attributes.normal.array,geometry.attributes.normal.array);assert.equal(mesh.material.map.image.data,texture.image.data);assert.equal(mesh.material.map,mesh.material.bumpMap);
 preview.dispose();assert.equal(geoDisposed,1);assert.equal(texDisposed,1);
 // Context loss/restore reuses the same CPU data and requires a new GPU cleanup.
 preview.dispose();assert.equal(geoDisposed,2);assert.equal(texDisposed,2);
});
test('single motor preview keeps all detail of one rotor and source bounds',()=>{
 const group=new THREE.Group();group.userData.part='motors';const geo=new THREE.CylinderGeometry(.2,.2,.3),m=new THREE.MeshStandardMaterial();for(const x of [-2.08,2.08])for(const z of [-2.08,2.08])for(let i=0;i<4;i++){const o=new THREE.Mesh(geo,m);o.position.set(x,.5+i*.1,z);o.userData.part='motors';group.add(o);}
 const preview=createPreviewPart(group);assert.equal(preview.object.children[0].count,4);assert.ok(preview.sphere.radius<.5);preview.object.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(preview.object),center=bounds.getCenter(new THREE.Vector3());assert.ok(center.length()<1e-6);preview.dispose();
});
test('preview deduplication never disposes borrowed duplicate geometry',()=>{
 const group=new THREE.Group();group.userData.part='fc';let disposed=0;for(let i=0;i<3;i++){const g=new THREE.BoxGeometry(.1,.1,.1);g.addEventListener('dispose',()=>disposed++);const o=new THREE.Mesh(g,new THREE.MeshStandardMaterial());o.userData.part='fc';group.add(o);}const p=createPreviewPart(group);p.dispose();assert.equal(disposed,0);
});
