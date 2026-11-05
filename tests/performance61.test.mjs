import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {instancePartMeshes} from '../viewer-instancing.js';
import {createEngineeringAssembly} from '../engineering-assembly.js';
import {compactStudyMeshes} from '../engineering-batches.js';
import {createStudyMaterialPool} from '../engineering-materials.js';
import {createStudyMaterialKey} from '../study-material-key.js';

test('material serialisation is reused within one immutable construction pass, not across later edits',()=>{
 const material=new T.MeshStandardMaterial(),group=new T.Group(),geometry=new T.BoxGeometry();let serialisations=0;const toArray=material.color.toArray;material.color.toArray=function(...args){serialisations++;return toArray.apply(this,args);};for(let i=0;i<20;i++){const mesh=new T.Mesh(geometry,material);mesh.position.x=i;group.add(mesh);}const meshes=[...group.children];instancePartMeshes({part:group},meshes);assert.equal(serialisations,1);assert.equal(meshes.length,1);assert.equal(meshes[0].count,20);
 const other=new T.Group(),a=new T.Mesh(geometry,material),b=new T.Mesh(geometry,material.clone());material.roughness=.13;other.add(a,b);const next=[a,b];instancePartMeshes({part:other},next);assert.equal(next.length,2,'a later changed surface must stay distinct');
});

test('one construction signature is shared by compaction and material pooling',()=>{
 const root=new T.Group(),material=new T.MeshStandardMaterial(),geometry=new T.BoxGeometry(),signature=createStudyMaterialKey();let calls=0;const toJSON=material.toJSON;material.toJSON=function(...args){calls++;return toJSON.apply(this,args);};
 for(let i=0;i<4;i++){const mesh=new T.Mesh(geometry.clone(),material);mesh.userData.leaf='test';mesh.position.x=i;root.add(mesh);}
 const batch=compactStudyMeshes(root,{materialKey:signature}),pool=createStudyMaterialPool(root,{materialKey:signature});assert.equal(calls,1);assert.equal(root.children.length,1);assert.equal(batch.savedCalls,3);pool.setHighlighted(root.children[0],true);assert.ok(root.children[0].material.emissiveIntensity>0);pool.setHighlighted(root.children[0],false);assert.equal(root.children[0].material.emissiveIntensity,0);pool.dispose();batch.dispose();geometry.dispose();material.dispose();
});

test('isolated study picking skips hidden branches and preserves visible instance hits',()=>{
 const source=new T.Group();source.userData.part='motors';const body=new T.Mesh(new T.CylinderGeometry(.2,.2,.2,24),new T.MeshStandardMaterial());body.position.set(2.08,.6,2.08);source.add(body);source.updateMatrixWorld(true);
 const a=createEngineeringAssembly(source),camera=new T.PerspectiveCamera(35,1,.001,100);a.update(.01,true,true);a.select('stator/windings',true);a.object.updateMatrixWorld(true);const sphere=a.selectionBounds().sphere;camera.position.copy(sphere.center).add(new T.Vector3(.8,.6,1).normalize().multiplyScalar(sphere.radius*3));camera.lookAt(sphere.center);camera.updateMatrixWorld(true);
 let hiddenCalls=0,visibleCalls=0,hits=0;const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
 a.object.traverse(o=>{if(!o.isMesh)return;const raycast=o.raycast;o.raycast=function(...args){if(visible(this))visibleCalls++;else hiddenCalls++;return raycast.apply(this,args);};});
 const ray=new T.Raycaster();
 for(let y=-.8;y<=.8;y+=.2)for(let x=-.8;x<=.8;x+=.2){const actual=a.pick(x,y,camera);assert.equal(hiddenCalls,0);ray.setFromCamera(new T.Vector2(x,y),camera);const hit=ray.intersectObject(a.object,true).find(h=>visible(h.object));let expected=null;if(hit){let o=hit.object;while(o&&!o.userData.leaf)o=o.parent;expected=o?.userData.leaf||null;if(hit.instanceId!==undefined)expected+='@'+hit.object.id+':'+hit.instanceId;hits++;}assert.equal(actual,expected);hiddenCalls=0;}
 assert.ok(hits>0);assert.ok(visibleCalls>0);const selected=a.pick(0,0,camera);if(selected?.includes('@')){a.select(selected,true);assert.equal(a.pick(0,0,camera),selected,'isolated instance retains original index');}
 a.dispose();body.geometry.dispose();body.material.dispose();
});

test('immutable source fingerprints invalidate on attribute versions, replacements and topology',()=>{
 for(const edit of ['version','replacement','topology']){const source=new T.BoxGeometry(),owner=new T.Group();owner.add(new T.Mesh(source,new T.MeshStandardMaterial()));instancePartMeshes({part:owner},[...owner.children],{cacheImmutableGeometry:true});
  if(edit==='version'){source.attributes.position.setX(0,.7);source.attributes.position.needsUpdate=true;}else if(edit==='replacement'){const uv=source.attributes.uv.clone();uv.setX(0,.123);source.setAttribute('uv',uv);}else source.setDrawRange(0,18);
  const wrapper=new T.BufferGeometry();wrapper.attributes={...source.attributes};wrapper.index=source.index;wrapper.groups=source.groups.map(g=>({...g}));wrapper.setDrawRange(source.drawRange.start,source.drawRange.count);
  const group=new T.Group(),material=new T.MeshStandardMaterial();group.add(new T.Mesh(wrapper,material),new T.Mesh(source.clone(),material));const meshes=[...group.children];instancePartMeshes({part:group},meshes,{disposeDeduplicatedGeometry:false});assert.equal(meshes.length,1,edit);assert.ok(meshes[0].isInstancedMesh);assert.equal(meshes[0].count,2);
 }
});
