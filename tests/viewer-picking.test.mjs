import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPartPicker} from '../viewer-picking.js';
import {instancePartMeshes} from '../viewer-instancing.js';

function fixture(){
  const root=new THREE.Group(),groups={},meshes=[];
  for(let i=0;i<16;i++){
    const id='part'+i,g=new THREE.Group();g.userData.part=id;root.add(g);groups[id]=g;
    if(i===15)continue;
    for(const dx of [-.14,.14]){
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(.2,.3,.25),new THREE.MeshStandardMaterial());
      mesh.position.set((i%5-2)*1.1+dx,Math.floor(i/5)-1,0);mesh.userData.part=id;g.add(mesh);meshes.push(mesh);
    }
  }
  instancePartMeshes(groups,meshes);root.updateMatrixWorld(true);
  return {root,groups,meshes};
}
test('part bounds preserve exact hits, distance and instanceId through assembly and transformed parents',()=>{
  const {root,groups,meshes}=fixture(),pick=createPartPicker(groups),ray=new THREE.Raycaster();let hits=0,misses=0;
  for(let step=0;step<4;step++){
    root.rotation.y=step*.12;root.scale.set(1+step*.1,1,1);root.position.x=step*.05;
    Object.values(groups).forEach((g,i)=>g.position.z=step*(i%3)*.12);root.updateMatrixWorld(true);
    for(let y=-1.5;y<=1.5;y+=.15)for(let x=-3.5;x<=3.5;x+=.13){
      ray.set(new THREE.Vector3(x,y,5),new THREE.Vector3(0,0,-1));
      const expected=ray.intersectObjects(meshes,false)[0],actual=pick(ray);
      assert.equal(actual?.object,expected?.object);assert.equal(actual?.instanceId,expected?.instanceId);
      if(expected){hits++;assert.ok(Math.abs(actual.distance-expected.distance)<1e-9);}else{misses++;assert.equal(actual,null);}
    }
  }
  assert.ok(hits>100&&misses>100);
});
test('missed groups skip mesh raycasts and layer masks remain effective',()=>{
  const {groups,meshes}=fixture(),pick=createPartPicker(groups),ray=new THREE.Raycaster();let calls=0;
  for(const mesh of meshes){const original=mesh.raycast;mesh.raycast=function(...args){calls++;return original.apply(this,args);};}
  ray.set(new THREE.Vector3(20,20,5),new THREE.Vector3(0,0,-1));assert.equal(pick(ray),null);assert.equal(calls,0);
  ray.set(new THREE.Vector3(-2.34,-1,5),new THREE.Vector3(0,0,-1));assert.ok(pick(ray));assert.ok(calls<meshes.length);
  ray.layers.set(1);assert.equal(pick(ray),null);
});
