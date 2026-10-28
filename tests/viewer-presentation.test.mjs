import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {applyStudioMaterials,createCarbonTextures,configureStudioLighting} from '../viewer-presentation.js';
import {instancePartMeshes} from '../viewer-instancing.js';

test('carbon color and packed surface have deterministic distinct color encodings',()=>{
 const a=createCarbonTextures(4),b=createCarbonTextures(4);
 assert.equal(a.color.colorSpace,THREE.SRGBColorSpace);assert.equal(a.surface.colorSpace,THREE.NoColorSpace);
 assert.deepEqual(a.color.image.data,b.color.image.data);assert.equal(a.color.image.data.byteLength,256*256*4);
 assert.equal(a.color.anisotropy,4);assert.equal(a.color.generateMipmaps,true);assert.deepEqual(a.color.repeat.toArray(),[5,5]);
 assert.ok(a.surface.image.data.some((v,i)=>i%4===1&&v>200));
 for(const x of [a,b]){x.color.dispose();x.surface.dispose();}
});
test('PBR adjustment preserves geometry and transforms and keeps fasteners instanced',()=>{
 const groups=Object.fromEntries(['frame','props','motors','battery','camera','fc'].map(id=>[id,new THREE.Group()])),source=new THREE.Texture(),meshes=[];
 const add=(id,g,m,x=0)=>{const o=new THREE.Mesh(g,m);o.position.x=x;o.userData.part=id;groups[id].add(o);meshes.push(o);return o;};
 const shape=new THREE.Shape([new THREE.Vector2(0,0),new THREE.Vector2(1,0),new THREE.Vector2(1,1),new THREE.Vector2(0,1)]);
 const plate=add('frame',new THREE.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:false}),new THREE.MeshStandardMaterial({map:source,bumpMap:source}));
 const prop=add('props',new THREE.BoxGeometry(1,.01,.2),new THREE.MeshStandardMaterial({map:source,bumpMap:source}));
 const geometry=new THREE.CylinderGeometry(.02,.02,.03,12);for(const x of [-.2,.2])add('motors',geometry,new THREE.MeshStandardMaterial({color:'#454c53',metalness:.78}),x);
 const glass=add('camera',new THREE.SphereGeometry(.1),new THREE.MeshStandardMaterial({color:'#183c59'}));
 const originals=meshes.map(o=>({o,p:o.geometry.attributes.position.array.slice(),n:o.geometry.attributes.normal.array.slice(),index:o.geometry.index?.array.slice(),matrix:o.position.toArray()}));
 const textures=applyStudioMaterials(groups,source,2);
 assert.equal(plate.material.map,textures.color);assert.equal(plate.material.bumpMap,textures.surface);assert.equal(plate.material.roughnessMap,textures.surface);assert.equal(plate.material.vertexColors,true);
 assert.equal(prop.material.map,null);assert.equal(prop.material.metalness,0);assert.equal(glass.material.metalness,0);assert.ok(glass.material.roughness<.1);
 for(const old of originals){assert.deepEqual(old.o.geometry.attributes.position.array,old.p);assert.deepEqual(old.o.geometry.attributes.normal.array,old.n);assert.deepEqual(old.o.geometry.index?.array,old.index);assert.deepEqual(old.o.position.toArray(),old.matrix);}
 instancePartMeshes(groups,meshes);assert.equal(groups.motors.children.length,1);assert.equal(groups.motors.children[0].isInstancedMesh,true);assert.equal(groups.motors.children[0].count,2);
 textures.color.dispose();textures.surface.dispose();
});
test('studio config reuses the light rig without extra realtime lights',()=>{
 const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(),new THREE.DirectionalLight(),new THREE.DirectionalLight());const renderer={};configureStudioLighting(scene,renderer);
 assert.equal(scene.children.length,3);assert.equal(scene.children.filter(o=>o.isDirectionalLight).length,2);assert.equal(renderer.toneMappingExposure,.98);assert.ok(scene.environmentIntensity>0&&scene.environmentIntensity<1);
 assert.ok(scene.children.every(o=>!o.castShadow));
});
