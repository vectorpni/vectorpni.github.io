import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createHollowTubeGeometry} from '../frame-tube-geometry.js';
import {createTwinSocketGeometry} from '../socket-geometry.js';
import {createWindingLoopGeometry,windingDimensions as d} from '../winding-geometry.js';
import {createPackLeadCurve} from '../pack-lead-geometry.js';
import {createEngineeringAssembly} from '../engineering-assembly.js';
import {createPreviewPart} from '../viewer-preview.js';
import {createGullwingLeadGeometry} from '../lead-geometry.js';

function checkFaces(g){const p=g.attributes.position,n=g.attributes.normal,ix=g.index?.array;for(const a of Object.values(g.attributes))assert.ok([...a.array].every(Number.isFinite));for(let i=0;i<(ix?.length||p.count);i+=3){const ids=[0,1,2].map(k=>ix?ix[i+k]:i+k),v=ids.map(j=>new T.Vector3().fromBufferAttribute(p,j)),face=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),normal=ids.reduce((a,j)=>a.add(new T.Vector3().fromBufferAttribute(n,j)),new T.Vector3());assert.ok(face.lengthSq()>1e-24);assert.ok(face.dot(normal)>=-1e-12);}}
test('frame tubes have open bores, inward inner skin and exactly preserved outer UVs',()=>{
  const g=createHollowTubeGeometry(.105,2,12),original=new T.CylinderGeometry(.105,.105,2,12,1,true);for(const key of ['position','normal','uv'])assert.deepEqual(g.attributes[key].array.slice(0,original.attributes[key].array.length),original.attributes[key].array);checkFaces(g);const mesh=new T.Mesh(g,new T.MeshStandardMaterial());mesh.updateMatrixWorld(true);assert.equal(new T.Raycaster(new T.Vector3(0,2,0),new T.Vector3(0,-1,0)).intersectObject(mesh).length,0);assert.ok(new T.Raycaster(new T.Vector3(0,0,0),new T.Vector3(1,0,0)).intersectObject(mesh).length>0);
});
test('twin socket has two genuine front openings and a physical divider',()=>{
  const g=createTwinSocketGeometry();checkFaces(g);const o=new T.Mesh(g,new T.MeshStandardMaterial());o.updateMatrixWorld(true);for(const y of [-.042,.042])assert.equal(new T.Raycaster(new T.Vector3(0,y,1),new T.Vector3(0,0,-1)).intersectObject(o).length,0);assert.ok(new T.Raycaster(new T.Vector3(0,0,1),new T.Vector3(0,0,-1)).intersectObject(o).length>0);
});
test('wire loop clears the rectangular stator tooth and neighbouring inner turns',()=>{
  const g=createWindingLoopGeometry();checkFaces(g);const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=Math.abs(p.getX(i)),y=Math.abs(p.getY(i));assert.ok(x>d.halfToothWidth||y>d.halfToothHeight,'wire must not intersect the tooth');}
  const points=g.parameters.path.getSpacedPoints(160),loops=[0,Math.PI/6].map(a=>{const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(Math.cos(a),0,Math.sin(a)));return points.map(p=>p.clone().applyQuaternion(q).add(new T.Vector3(Math.cos(a)*.123,0,Math.sin(a)*.123)));});let distance=Infinity;for(const a of loops[0])for(const b of loops[1])distance=Math.min(distance,a.distanceTo(b));assert.ok(distance>2*d.wireRadius,'adjacent coils need a real gap');
});
test('pack leads retain endpoints and leave the pack outwards without folded faces',()=>{
  for(const z of [.77,-1.01]){const curve=createPackLeadCurve(z);assert.deepEqual(curve.getPoint(0).toArray(),[-.2,.94,z]);assert.ok(curve.getPoint(1).distanceTo(new T.Vector3(-.55,.65,z-.25))<1e-9);assert.ok((curve.getPoint(.025).z-z)*Math.sign(z)>0);checkFaces(new T.TubeGeometry(curve,40,.029,10,false));}
});
test('baked representative ESC wires are retained even when mesh origin is zero',()=>{
  const group=new T.Group();group.userData.part='esc';const m=new T.MeshStandardMaterial();for(const sign of [-1,1]){const curve=new T.LineCurve3(new T.Vector3(sign*1.5,.4,sign*1.5),new T.Vector3(sign*2.08,.37,sign*2.08));group.add(new T.Mesh(new T.TubeGeometry(curve,8,.014,6),m));}const preview=createPreviewPart(group);assert.ok(preview.object.children.length>0);preview.object.updateMatrixWorld(true);assert.ok(preview.sphere.radius<1);preview.dispose();
});
test('GNSS lid clears the board and board lifts out before moving through the wall',()=>{
  const group=new T.Group();group.userData.part='gps';const material=new T.MeshStandardMaterial();for(const [r,h,y]of [[.28,.1,1.84],[.25,.04,1.9],[.035,1.2,1.2]]){const o=new T.Mesh(new T.CylinderGeometry(r,r,h,32),material);o.position.set(-.62,y,-.78);group.add(o);}const a=createEngineeringAssembly(group);a.object.position.set(0,0,0);const board=a.object.children.find(o=>o.userData.section==='board'),housing=a.object.children.find(o=>o.userData.section==='housing'),lid=housing.children.find(o=>o.userData.leaf==='housing/lid');assert.ok(lid);
  for(const open of [true,false])for(let i=0;i<250;i++){a.update(1/240,open);assert.ok(1.875+board.position.y<1.88+lid.position.y,'board must stay below lid');if(board.position.x>.001)assert.ok(1.827+board.position.y>1.89,'side motion starts after lifting beyond the rim');}a.dispose();
});
test('folded lead is one closed shell without coplanar overlapping bend faces',()=>{
  const g=createGullwingLeadGeometry();checkFaces(g);const p=g.attributes.position,ix=g.index?.array,edges=new Map(),key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(n=>Math.round(n*1e8)).join(':');for(let i=0;i<(ix?.length||p.count);i+=3){const ids=[0,1,2].map(k=>ix?ix[i+k]:i+k);for(let k=0;k<3;k++){const e=[key(ids[k]),key(ids[(k+1)%3])].sort().join('|');edges.set(e,(edges.get(e)||0)+1);}}assert.ok([...edges.values()].every(n=>n===2));g.computeBoundingBox();assert.ok(Math.abs(g.boundingBox.min.y)<1e-8);
});
test('private Pi chip seating leaves source transforms and shared vertex buffers intact',()=>{
  const group=new T.Group();group.userData.part='pi';const geometry=new T.BoxGeometry(.34,.05,.34),source=new T.Mesh(geometry,new T.MeshStandardMaterial());source.position.set(0,-.27,-.17);group.add(source);const before=geometry.attributes.position.array.slice(),a=createEngineeringAssembly(group);a.object.position.set(0,0,0);a.object.updateMatrixWorld(true);let chip;a.object.traverse(o=>{if(o.isMesh&&o.geometry.attributes.position===geometry.attributes.position)chip=o;});assert.ok(chip);assert.ok(Math.abs(new T.Box3().setFromObject(chip).min.y+.33)<1e-6);assert.equal(source.position.y,-.27);assert.deepEqual(geometry.attributes.position.array,before);a.dispose();
});
test('BEC board needs an actual carrier even if traces already populate its section',()=>{
  const group=new T.Group();group.userData.part='becfc';const trace=new T.Mesh(new T.BoxGeometry(.007,.001,.2),new T.MeshStandardMaterial());trace.position.set(.62,.3905,-.42);trace.userData.detailSection='board';const cover=new T.Mesh(new T.BoxGeometry(.25,.12,.4),new T.MeshStandardMaterial());cover.position.set(.62,.33,-.42);cover.userData.detailSection='cover';group.add(trace,cover);const a=createEngineeringAssembly(group);a.object.position.set(0,0,0);a.object.updateMatrixWorld(true);const board=a.object.children.find(o=>o.userData.section==='board'),substrate=board.getObjectByName('Условная плата под оболочкой');assert.ok(substrate,'traces alone are not a board');assert.ok(Math.abs(new T.Box3().setFromObject(substrate).max.y-.349)<1e-6);assert.equal(trace.position.y,.3905);a.dispose();
});
test('battery lifts only after rigid straps clear its end, and entries stay attached',()=>{
  const group=new T.Group();group.userData.part='battery';const body=new T.Mesh(new T.BoxGeometry(1.05,.65,1.65),new T.MeshStandardMaterial());body.position.set(0,.91,-.12);group.add(body);const a=createEngineeringAssembly(group),section=id=>a.object.children.find(o=>o.userData.section===id);for(const open of [true,false])for(let i=0;i<260;i++){a.update(1/240,open);const rise=section('shell').position.y;if(rise>.001)assert.ok(-.685+section('straps').position.z>.77);assert.equal(section('connector').position.y,rise);assert.equal(section('connector').position.z,0);}a.dispose();
});
