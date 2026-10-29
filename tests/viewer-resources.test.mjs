import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {disposeSceneResources} from '../viewer-resources.js';

test('GPU cleanup deduplicates owned resources and leaves CPU data and environment ownership intact',()=>{
  const scene=new THREE.Scene(),g=new THREE.BoxGeometry(),t=new THREE.DataTexture(new Uint8Array(4),1,1),m=new THREE.MeshStandardMaterial({map:t,bumpMap:t}),env=new THREE.Texture();scene.environment=env;
  const instance=new THREE.InstancedMesh(g,m,2);scene.add(instance,new THREE.Mesh(g,m));
  const counts={geometry:0,texture:0,material:0,instance:0,environment:0};for(const [key,o]of Object.entries({geometry:g,texture:t,material:m,instance,environment:env}))o.addEventListener('dispose',()=>counts[key]++);
  const positions=g.attributes.position.array,pixels=t.image.data,matrices=instance.instanceMatrix.array;
  disposeSceneResources(scene,[new THREE.Mesh(g,m)]);
  assert.deepEqual(counts,{geometry:1,texture:1,material:1,instance:1,environment:0});
  assert.equal(g.attributes.position.array,positions);assert.equal(t.image.data,pixels);assert.equal(instance.instanceMatrix.array,matrices);assert.equal(scene.children.length,2);
  disposeSceneResources(scene);assert.equal(counts.geometry,2);assert.equal(counts.instance,2);
});
