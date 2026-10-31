import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createHollowTubeGeometry} from './frame-tube-geometry.js';

// Short-lived construction cache. The finished batches own their vertex buffers.
export function createDetailBuilder({smoothSleeves=false}={}) {
  const cache=new Map(), batches=new Map();
  const geometry=(key,make)=>{if(!cache.has(key))cache.set(key,make());return cache.get(key);};
  function add(parent,material,g,position=[0,0,0],rotation=[0,0,0],scale=[1,1,1]) {
    parent.userData.modeledPieces=(parent.userData.modeledPieces||0)+1;
    const key=parent.uuid+':'+material.uuid;
    if(!batches.has(key))batches.set(key,{parent,material,items:[]});
    const matrix=new THREE.Matrix4().compose(new THREE.Vector3(...position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(...scale));
    batches.get(key).items.push({geometry:g,matrix});
  }
  const box=(p,m,at,size,rot)=>add(p,m,geometry('box'+size,()=>new THREE.BoxGeometry(...size)),at,rot);
  const cylinder=(p,m,at,r,h,rot,segments=24)=>add(p,m,geometry('cyl'+[r,h,segments],()=>new THREE.CylinderGeometry(r,r,h,segments)),at,rot);
  // An actual bore, not a dark disc over a solid cylinder. Axis is local Y.
  function sleeve(p,m,at,outer,inner,height,rot=[0,0,0],segments=32) {
    const g=geometry('sleeve'+[outer,inner,height,segments],()=>{
      // Study-only option: radial wall normals, separate flat annular ends and
      // at least 16 sides for a round bore at macro scale. Polygonal nuts retain
      // their hard edges. The main AF-18 uses the unchanged default builder.
      if(smoothSleeves&&segments>6)return createHollowTubeGeometry(outer,height,Math.max(outer>=.1?48:outer>=.03?24:16,Math.round(segments/2)),inner);
      const shape=new THREE.Shape();shape.absarc(0,0,outer,0,Math.PI*2,false);
      const hole=new THREE.Path();hole.absarc(0,0,inner,0,Math.PI*2,true);shape.holes.push(hole);
      const result=new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,curveSegments:segments/4});
      result.translate(0,0,-height/2);result.rotateX(-Math.PI/2);return result;
    });add(p,m,g,at,rot);
  }
  const ring=(p,m,at,r,t,rot=[Math.PI/2,0,0])=>add(p,m,geometry('ring'+[r,t],()=>new THREE.TorusGeometry(r,t,6,32)),at,rot);
  function rod(p,m,a,b,r=.01) {
    const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),direction=vb.clone().sub(va),length=direction.length();
    if(length<1e-8)throw Error('Zero-length engineering connection');
    const rot=new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize()));
    cylinder(p,m,va.add(vb).multiplyScalar(.5).toArray(),r,length,rot.toArray().slice(0,3),12);
  }
  function cable(p,m,points,r=.012) {
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    const g=new THREE.TubeGeometry(curve,24,r,6,false);add(p,m,g);g.dispose();
  }
  function socket(p,m,at,r=.026,rotation=[0,0,0]) {
    const head=geometry('hex-head'+r,()=>{
      const shape=new THREE.Shape();shape.absarc(0,0,r,0,Math.PI*2,false);const hole=new THREE.Path();
      for(let i=0;i<6;i++){const a=-i*Math.PI/3;i?hole.lineTo(Math.cos(a)*r*.43,Math.sin(a)*r*.43):hole.moveTo(r*.43,0);}hole.closePath();shape.holes.push(hole);
      const g=new THREE.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:false,curveSegments:smoothSleeves?16:8});g.translate(0,0,-.009);g.rotateX(-Math.PI/2);
      if(smoothSleeves){const p=g.attributes.position,n=g.attributes.normal;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),radius=Math.hypot(x,z);if(Math.abs(radius-r)<1e-7&&Math.abs(n.getY(i))<1e-6)n.setXYZ(i,x/radius,0,z/radius);}}
      return g;
    });add(p,m,head,at,rotation);
    // Washer and head share the same axis and meet, with an open centre.
    const delta=new THREE.Vector3(0,-.012,0).applyEuler(new THREE.Euler(...rotation));
    sleeve(p,m,new THREE.Vector3(...at).add(delta).toArray(),r*1.25,r*.49,.006,rotation,24);
  }
  function finish({instanceRepeated=false,indexed=false,normalizeGeometry=g=>g}={}) {
    const normalizedSources=new Map();
    const sourceFor=g=>{if(!indexed||g.index)return g;if(!normalizedSources.has(g))normalizedSources.set(g,normalizeGeometry(g));return normalizedSources.get(g);};
    for(const {parent,material,items} of batches.values()) {
      if(instanceRepeated&&items.length>=4&&items.every(item=>item.geometry===items[0].geometry)){
        const mesh=new THREE.InstancedMesh(sourceFor(items[0].geometry).clone(),material,items.length);items.forEach((item,i)=>mesh.setMatrixAt(i,item.matrix));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();mesh.name=parent.name;mesh.userData={...parent.userData};parent.add(mesh);continue;
      }
      const transformed=items.map(({geometry,matrix})=>sourceFor(geometry).clone().applyMatrix4(matrix));
      const normalized=transformed.map(g=>{const n=indexed?g:g.index?g.toNonIndexed():g;if(indexed&&!n.index)n.setIndex(Array.from({length:n.attributes.position.count},(_,i)=>i));n.deleteAttribute('uv');n.deleteAttribute('color');return n;});
      const g=mergeGeometries(normalized,false);if(!g)throw Error('Invalid engineering batch');
      const a=g.attributes.position,uv=new Float32Array(a.count*2);for(let i=0;i<a.count;i++){uv[i*2]=a.getX(i);uv[i*2+1]=a.getZ(i);}g.setAttribute('uv',new THREE.BufferAttribute(uv,2));
      g.computeBoundingBox();g.computeBoundingSphere();
      const mesh=new THREE.Mesh(g,material);
      mesh.name=parent.name;mesh.userData={...parent.userData};parent.add(mesh);
      for(const item of new Set([...transformed,...normalized]))item.dispose();
    }
    for(const [source,g]of normalizedSources)if(g!==source)g.dispose();normalizedSources.clear();
    for(const g of cache.values())g.dispose();batches.clear();cache.clear();
  }
  return {add,box,cylinder,sleeve,ring,rod,cable,socket,finish};
}

export function createEngineeringMaterials() {
  const m=(color,metalness,roughness)=>new THREE.MeshStandardMaterial({color,metalness,roughness,envMapIntensity:.75});
  return {metal:m('#7a838a',.92,.34),dark:m('#24292d',0,.6),rubber:m('#202321',0,.88),pcb:m('#234a37',0,.64),contact:m('#c4a462',.95,.32),copper:m('#ad6b3c',.96,.34),ceramic:m('#8a8170',0,.77),red:m('#8d3038',0,.67),glass:m('#253e47',0,.075)};
}
