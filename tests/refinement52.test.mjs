import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {compactStudyMeshes} from '../engineering-batches.js';
import {createSplitCollarHalfGeometry,createBearingRaceGeometry} from '../interior-geometry.js';
import {createDetailBuilder} from '../detail-primitives.js';
import {createEngineeringAssembly} from '../engineering-assembly.js';
import {indexStudyGeometry} from '../engineering-indexing.js';

function faces(g){const p=g.attributes.position,n=g.attributes.normal,ix=g.index?.array;for(const a of Object.values(g.attributes))assert.ok([...a.array].every(Number.isFinite));for(let i=0;i<(ix?.length||p.count);i+=3){const ids=[0,1,2].map(k=>ix?ix[i+k]:i+k),a=new T.Vector3().fromBufferAttribute(p,ids[0]),b=new T.Vector3().fromBufferAttribute(p,ids[1]),c=new T.Vector3().fromBufferAttribute(p,ids[2]),cross=b.sub(a).cross(c.sub(a));assert.ok(cross.lengthSq()>1e-24,'nondegenerate face');assert.ok(cross.dot(ids.reduce((v,j)=>v.add(new T.Vector3().fromBufferAttribute(n,j)),new T.Vector3()))>-1e-12,'outward winding');}}
function triangles(root){const rows=[];root.updateMatrixWorld(true);root.traverse(o=>{if(!o.isMesh||o.isInstancedMesh)return;const g=o.geometry,ix=g.index?.array;for(let i=0;i<(ix?.length||g.attributes.position.count);i+=3){const triangle=[];for(let k=0;k<3;k++){const j=ix?ix[i+k]:i+k,v=new T.Vector3().fromBufferAttribute(g.attributes.position,j).applyMatrix4(o.matrixWorld),n=new T.Vector3().fromBufferAttribute(g.attributes.normal,j).applyNormalMatrix(new T.Matrix3().getNormalMatrix(o.matrixWorld));triangle.push([...v.toArray(),...n.toArray(),g.attributes.uv.getX(j),g.attributes.uv.getY(j)].map(x=>Math.round(x*1e5)).join(','));}rows.push(triangle.join('|'));}});return rows.sort();}

test('leaf compaction preserves every triangle, UV, normal, material and ray hit under transformed parents',()=>{
  const root=new T.Group(),leaf=new T.Group(),m=new T.MeshStandardMaterial({color:0x345678,roughness:.51});root.position.set(3,-2,4);root.rotation.y=.3;leaf.userData.leaf='board/exterior';root.add(leaf);
  for(let i=0;i<4;i++){const o=new T.Mesh(new T.BoxGeometry(.2,.1,.3),m.clone());o.position.set(i*.5,0,0);o.rotation.y=i*.1;o.userData={...leaf.userData};leaf.add(o);}
  const before=triangles(root),ray=new T.Raycaster(root.localToWorld(new T.Vector3(0,.5,0)),new T.Vector3(0,-1,0)),hit=ray.intersectObject(root,true)[0],result=compactStudyMeshes(root);assert.ok(hit);assert.equal(result.savedCalls,3);assert.equal(leaf.children.length,1);assert.equal(leaf.children[0].material.color.getHex(),m.color.getHex());assert.deepEqual(triangles(root),before);assert.ok(Math.abs(ray.intersectObject(root,true)[0].distance-hit.distance)<1e-7);assert.equal(leaf.children[0].userData.leaf,'board/exterior');faces(leaf.children[0].geometry);result.dispose();
});
test('independently moving leaves, instances, different surfaces and custom shaders never get fused',()=>{
  const root=new T.Group(),m=new T.MeshStandardMaterial(),g=new T.BoxGeometry();for(let i=0;i<2;i++){const leaf=new T.Group();root.add(leaf);leaf.add(new T.Mesh(g,m));}
  root.add(new T.InstancedMesh(g,m,4));const a=new T.Mesh(g,m.clone());a.material.roughness=.1;root.add(a);const b=new T.Mesh(g,m.clone());b.material.onBeforeCompile=()=>{};root.add(b);const negative=new T.Mesh(g,m);negative.scale.x=-1;root.add(negative);const result=compactStudyMeshes(root);assert.equal(result.savedCalls,0);assert.ok(root.children.some(o=>o.isInstancedMesh));
});
test('material comparison never serialises texture pixel sources and retains distinct texture identities',()=>{
  const root=new T.Group(),texture=new T.DataTexture(new Uint8Array([255,255,255,255]),1,1);texture.source.toJSON=()=>{throw Error('Pixel serialisation is forbidden');};
  const m=new T.MeshStandardMaterial({map:texture});for(let i=0;i<3;i++)root.add(new T.Mesh(new T.BoxGeometry(),m.clone()));const other=m.clone();other.map=texture.clone();root.add(new T.Mesh(new T.BoxGeometry(),other));const result=compactStudyMeshes(root);assert.equal(result.savedCalls,2);assert.equal(root.children.length,2);result.dispose();
});
test('colours that round to the same eight-bit swatch retain their distinct linear shader values',()=>{
  const root=new T.Group(),a=new T.MeshStandardMaterial(),b=a.clone();a.color.setRGB(.5,.5,.5);b.color.setRGB(.500001,.5,.5);assert.equal(a.color.getHex(),b.color.getHex());root.add(new T.Mesh(new T.BoxGeometry(),a),new T.Mesh(new T.BoxGeometry(),b));assert.equal(compactStudyMeshes(root).savedCalls,0);
});
test('exact indexing preserves every attribute bit and triangle, including UV seams and hard normals',()=>{
  const source=new T.BoxGeometry(.2,.1,.3).toNonIndexed(),before=source.attributes.position.array.slice(),result=indexStudyGeometry(source);assert.ok(result.index);assert.ok(result.attributes.position.count<source.attributes.position.count);let sourceBytes=0,resultBytes=result.index.array.byteLength;
  for(const [name,attr]of Object.entries(source.attributes)){sourceBytes+=attr.array.byteLength;resultBytes+=result.attributes[name].array.byteLength;const input=new Uint32Array(attr.array.buffer),out=new Uint32Array(result.attributes[name].array.buffer);for(let i=0;i<attr.count;i++)for(let k=0;k<attr.itemSize;k++)assert.equal(out[result.index.array[i]*attr.itemSize+k],input[i*attr.itemSize+k]);}
  assert.ok(resultBytes<sourceBytes);assert.deepEqual(source.attributes.position.array,before);faces(result);
});
test('study sleeves have smooth radial walls, flat ends and a genuine open bore',()=>{
  const p=new T.Group(),b=createDetailBuilder({smoothSleeves:true});b.sleeve(p,new T.MeshStandardMaterial(),[0,0,0],.2,.1,.05,undefined,32);b.finish();const g=p.children[0].geometry;faces(g);const pos=g.attributes.position,n=g.attributes.normal;for(let i=0;i<pos.count;i++)if(Math.abs(n.getY(i))<1e-6){const r=Math.hypot(pos.getX(i),pos.getZ(i));assert.ok(Math.abs(Math.abs((pos.getX(i)*n.getX(i)+pos.getZ(i)*n.getZ(i))/r)-1)<1e-6);}
  p.updateMatrixWorld(true);assert.equal(new T.Raycaster(new T.Vector3(0,1,0),new T.Vector3(0,-1,0)).intersectObject(p,true).length,0);
});
test('clamp ears, washers and bolts never intrude into the carbon arm bore',()=>{
  const source=new T.Group();source.userData.part='frame';source.add(new T.Mesh(new T.BoxGeometry(.1,.1,.1),new T.MeshStandardMaterial()));const a=createEngineeringAssembly(source);a.object.position.set(0,0,0);a.object.updateMatrixWorld(true);let arms;a.object.traverse(o=>{if(o.isGroup&&o.userData.leaf==='arms/saddles51')arms=o;});
  let minimum=Infinity;arms.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld),sx=Math.sign(v.x),sz=Math.sign(v.z),perpendicular=-(v.x-sx*1.05)*sz/Math.SQRT2+(v.z-sz*1.05)*sx/Math.SQRT2;minimum=Math.min(minimum,Math.hypot(v.y-.35,perpendicular));}});assert.ok(minimum>.10699,'all clamp geometry clears the .107 bore');a.dispose();
});
test('split clamp halves have disjoint real mating faces and retain the original bore',()=>{
  for(const upper of [true,false]){const g=createSplitCollarHalfGeometry(.133,.107,.1,upper);faces(g);g.computeBoundingBox();assert.ok(upper?g.boundingBox.max.z<=-.00199:g.boundingBox.min.z>=.00199);const p=g.attributes.position;for(let i=0;i<p.count;i++)assert.ok(Math.hypot(p.getX(i),p.getZ(i))>=.10699);}
});
test('illustrative bearing grooves clear rolling elements and preserve shaft bore and outer envelope',()=>{
  const group=new T.Group();for(const inner of [false,true]){const g=createBearingRaceGeometry(inner);faces(g);group.add(new T.Mesh(g,new T.MeshStandardMaterial()));}group.updateMatrixWorld(true);
  // Six-axis rays from a ball centre must not meet a race before its surface.
  for(const d of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0]]){const hits=new T.Raycaster(new T.Vector3(.041,0,0),new T.Vector3(...d)).intersectObject(group,true);if(hits.length)assert.ok(hits[0].distance>=.00599);}
  assert.equal(new T.Raycaster(new T.Vector3(0,1,0),new T.Vector3(0,-1,0)).intersectObject(group,true).length,0);const bounds=new T.Box3().setFromObject(group);assert.ok(Math.abs(bounds.max.x-.055)<1e-7);
});
test('new board supports touch the underside and washers seat on the top plane in assembly',()=>{
  const source=new T.Group();source.userData.part='fc';const body=new T.Mesh(new T.BoxGeometry(.6,.08,.6),new T.MeshStandardMaterial({color:0x234a37}));body.position.set(0,.32,.2);source.add(body);const a=createEngineeringAssembly(source);a.object.position.set(0,0,0);a.object.updateMatrixWorld(true);let mounts;a.object.traverse(o=>{if(o.isGroup&&o.userData.leaf==='cover/mounts51')mounts=o;});
  const dark=mounts.children.find(o=>o.material?.color.getHexString()==='24292d');assert.ok(Math.abs(new T.Box3().setFromObject(dark).max.y-.342)<1e-6,'support meets board bottom .36-.018');
  const material=new T.MeshStandardMaterial(),p=new T.Group(),b=createDetailBuilder({smoothSleeves:true});b.socket(p,material,[0,.375,0],.022*1.4);b.finish();p.children[0].geometry.computeBoundingBox();assert.ok(Math.abs(p.children[0].geometry.boundingBox.min.y-.36)<1e-6,'washer meets board top');a.dispose();
});
test('rotor upper rim and spoke hub open with the bell, while the thin shaft stays in its own section',()=>{
  const group=new T.Group();group.userData.part='motors';const source=[new T.TorusGeometry(.24,.013,10,64),new T.CylinderGeometry(.074,.074,.09,32),new T.CylinderGeometry(.025,.025,.205,24)].map((g,i)=>{const o=new T.Mesh(g,new T.MeshStandardMaterial({roughness:.4+i*.01}));o.position.set(2.08,[.705,.68,.79][i],2.08);if(i===0)o.rotation.x=Math.PI/2;group.add(o);return o;});
  const a=createEngineeringAssembly(group);for(let i=0;i<source.length;i++){let found;a.object.traverse(o=>{if(o.geometry?.attributes.position===source[i].geometry.attributes.position)found=o;});assert.ok(found);assert.equal(found.parent.userData.section,i===2?'shaft':'shell');}a.update(.01,true,true);const shell=a.object.children.find(o=>o.userData.section==='shell'),shaft=a.object.children.find(o=>o.userData.section==='shaft');assert.equal(shell.position.y,.48);assert.equal(shaft.position.y,.14);a.dispose();
});
