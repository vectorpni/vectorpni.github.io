import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {compactMainSurfaces} from '../viewer-static-batches.js';
import {instancePartMeshes,getPartSourceMeshes} from '../viewer-instancing.js';

test('main batches retain source geometry, component picking and exact triangle count after group motion',()=>{
 const root=new T.Group(),group=new T.Group();group.userData.part='frame';root.add(group);
 const material=new T.MeshStandardMaterial(),box=new T.Mesh(new T.BoxGeometry(.4,.3,.2),material),sphere=new T.Mesh(new T.SphereGeometry(.19,16,12),material);box.position.set(-.4,.1,0);sphere.position.set(.4,0,0);sphere.scale.set(1,.8,1);group.add(box,sphere);const meshes=[box,sphere];
 const source=meshes.map(o=>({o,position:o.geometry.attributes.position.array.slice(),normal:o.geometry.attributes.normal.array.slice()}));instancePartMeshes({frame:group},meshes);const before=meshes.slice(),triangles=before.reduce((n,o)=>n+o.geometry.index.count/3,0);const batch=compactMainSurfaces({frame:group},meshes);assert.equal(batch.savedCalls,1);assert.equal(meshes.length,1);assert.equal(meshes[0].geometry.index.count/3,triangles);assert.equal(meshes[0].userData.part,'frame');assert.deepEqual(getPartSourceMeshes(group),before);
 for(const offset of [0,.8,0]){group.position.y=offset;root.updateMatrixWorld(true);for(const s of before)s.matrixWorld.multiplyMatrices(group.matrixWorld,s.matrix);for(const x of [-.4,.4]){const ray=new T.Raycaster(new T.Vector3(x,offset+.04,2),new T.Vector3(0,0,-1));const a=ray.intersectObjects(before)[0],b=ray.intersectObjects(meshes)[0];assert.ok(a&&b);assert.ok(Math.abs(a.distance-b.distance)<1e-6);}}
 for(const s of source){assert.deepEqual(s.o.geometry.attributes.position.array,s.position);assert.deepEqual(s.o.geometry.attributes.normal.array,s.normal);}batch.created.forEach(o=>o.geometry.dispose());before.forEach(o=>o.geometry.dispose());material.dispose();
});

test('main compaction preserves instances, independent owners, materials and custom/transparent surfaces',()=>{
 const groups={},all=[];for(const id of ['frame','motors']){const group=new T.Group();group.userData.part=id;groups[id]=group;for(let i=0;i<3;i++){const m=new T.Mesh(new T.BoxGeometry(.2,.2,.2),new T.MeshStandardMaterial());m.position.x=i;group.add(m);all.push(m);}}
 const a=all[0].material;all[1].material=a;all[2].material=a;all[0].material.transparent=true;all[3].onBeforeRender=()=>{};all[4].scale.x=-1;const instanced=new T.InstancedMesh(new T.BoxGeometry(),new T.MeshStandardMaterial(),2);groups.motors.add(instanced);all.push(instanced);const before=all.slice(),batch=compactMainSurfaces(groups,all);assert.equal(batch.savedCalls,0);assert.deepEqual(all,before);for(const o of all){o.geometry.dispose();o.material.dispose();}
});
