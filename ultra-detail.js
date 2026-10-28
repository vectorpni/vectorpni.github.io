import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Illustrative mechanical reconstruction, not manufacturer CAD. All detail is
// baked once into its owning part; no extra animation loop or dynamic geometry.
export function addUltraDetail({groups, meshes, mesh, carbon, black, grey, rubber}) {
  // Reuse the existing texture object so every carbon surface and its preview
  // receives the same fine twill. No network asset or extra material pass.
  const canvas=carbon.map.image,c=canvas.getContext('2d');canvas.width=canvas.height=256;
  c.fillStyle='#34383c';c.fillRect(0,0,256,256);
  for(let y=0;y<256;y+=16)for(let x=0;x<256;x+=16){
    const horizontal=((x/16-y/16+16)%4)<2;
    c.fillStyle=horizontal?'#41464a':'#303539';c.fillRect(x,y,16,16);
    for(let k=1;k<16;k+=3){c.fillStyle=k%2?'#45494c':'#373c40';horizontal?c.fillRect(x,y+k,16,1):c.fillRect(x+k,y,1,16);}
  }
  carbon.map.needsUpdate=true;
  for(const o of groups.camera.children)if(['183c59','254b56'].includes(o.material.color.getHexString())){
    o.material.metalness=.04;o.material.roughness=.12;
  }
  const metal=grey.clone(); metal.metalness=.78; metal.roughness=.34;
  const polymer=black.clone(); polymer.metalness=.04; polymer.roughness=.66;
  const gasket=rubber.clone(); gasket.metalness=0; gasket.roughness=.91;
  const laminate=carbon.clone(); laminate.color.set('#353a3c'); laminate.roughness=.57;
  const batches=new Map(), cache=new Map();
  const geometry=(key,make)=>{if(!cache.has(key))cache.set(key,make());return cache.get(key);};
  function add(id,material,geo,p,rotation=[0,0,0],anchor=[0,0,0]) {
    const key=id+':'+material.uuid+':'+anchor.join(',');
    if(!batches.has(key))batches.set(key,{id,material,anchor,geometries:[]});
    const matrix=new THREE.Matrix4().compose(new THREE.Vector3(...p).sub(new THREE.Vector3(...anchor)),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(1,1,1));
    batches.get(key).geometries.push(geo.clone().applyMatrix4(matrix));
  }
  const box=(id,m,p,size,rot,anchor)=>add(id,m,geometry('b'+size,()=>new THREE.BoxGeometry(...size)),p,rot,anchor);
  const ring=(id,m,p,r,t,rot=[Math.PI/2,0,0],anchor)=>add(id,m,geometry('r'+r+':'+t,()=>new THREE.TorusGeometry(r,t,6,32)),p,rot,anchor);
  const bolt=(id,p,anchor)=>{
    // A real open hex socket instead of a dark decal on a solid screw head.
    add(id,metal,geometry('socket',()=>{const s=new THREE.Shape();s.absarc(0,0,.026,0,Math.PI*2,false);const h=new THREE.Path();for(let i=0;i<6;i++){const a=-i*Math.PI/3; i?h.lineTo(Math.cos(a)*.012,Math.sin(a)*.012):h.moveTo(.012,0);}h.closePath();s.holes.push(h);return new THREE.ExtrudeGeometry(s,{depth:.015,bevelEnabled:false,curveSegments:8});}),p,[-Math.PI/2,0,0],anchor);
    ring(id,metal,[p[0],p[1]-.004,p[2]],.034,.005,undefined,anchor);
  };
  // Exposed laminate edges follow the existing chamfered plate outline.
  for(const [y,w,d] of [[.55,2.05,2.25],[.11,1.85,2]]){
    const points=[[-w/2+.2,-d/2],[w/2-.2,-d/2],[w/2,-d/2+.2],[w/2,d/2-.2],[w/2-.2,d/2],[-w/2+.2,d/2],[-w/2,d/2-.2],[-w/2,-d/2+.2]];
    for(let layer=0;layer<3;layer++)for(let i=0;i<8;i++){
      const a=points[i],b=points[(i+1)%8],dx=b[0]-a[0],dz=b[1]-a[1];
      box('frame',laminate,[(a[0]+b[0])/2,y+.007+layer*.017,(a[1]+b[1])/2],[Math.hypot(dx,dz),.004,.006],[0,-Math.atan2(dz,dx),0]);
    }
  }
  for(const x of [-1,1])for(const z of [-1,1]){
    const mx=x*2.08,mz=z*2.08,anchor=[mx,0,mz];
    // Keep the original shaft tip, but connect its lower end to the bearing.
    for(const o of groups.motors.children)if(Math.abs(o.position.x-mx)<1e-6&&Math.abs(o.position.z-mz)<1e-6&&Math.abs(o.position.y-.85)<1e-6){o.scale.y=.205/.085;o.position.y=.79;}
    for(const o of [...groups.motors.children])if((Math.abs(o.position.y-.735)<.0001||Math.abs(o.position.y-.748)<.0001)&&Math.abs(Math.hypot(o.position.x-mx,o.position.z-mz)-.18)<.001){groups.motors.remove(o);meshes.splice(meshes.indexOf(o),1);o.material.dispose();}
    for(const y of [.535,.565,.655])ring('motors',metal,[mx,y,mz],.249,.004,undefined,anchor);
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2;
      // Radial mounting tabs overlap the hub and rim and support each washer.
      box('motors',metal,[mx+Math.cos(a)*.15,.716,mz+Math.sin(a)*.15],[.17,.022,.055],[0,-a,0],anchor);
      bolt('motors',[mx+Math.cos(a)*.18,.735,mz+Math.sin(a)*.18],anchor);
    }
    ring('props',metal,[mx,.836,mz],.072,.006,undefined,anchor);
    bolt('props',[mx,.886,mz],anchor);
    for(const y of [.13,.54])ring('frame',metal,[x*.77,y,z*.83],.058,.009);
    // Extend the existing standoff through the slotted plate to its cap.
    for(const o of groups.frame.children)if(Math.abs(o.position.x-x*.77)<1e-6&&Math.abs(o.position.z-z*.83)<1e-6&&Math.abs(o.position.y-.32)<1e-6){o.scale.y=.54/.48;o.position.y=.35;}
    for(const o of [...groups.wiring.children])if(Math.abs(o.position.x-x*.77)<1e-6&&Math.abs(o.position.z-z*.83)<1e-6&&Math.abs(o.position.y-.615)<1e-6){groups.wiring.remove(o);groups.frame.add(o);o.userData.part='frame';}
    bolt('frame',[x*.77,.639,z*.83]);
    // Split arm clamp, through fasteners and landing strut ferrules.
    for(const side of [-1,1])bolt('frame',[x*1.08+side*.085,.49,z*1.08]);
    const leg=new THREE.Vector3(x*.6,-1.74,z*.44).normalize();
    for(const t of [.08,.9]){
      const p=new THREE.Vector3(x*.64,.1,z*.61).addScaledVector(new THREE.Vector3(x*.6,-1.74,z*.44),t);
      const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),leg);
      const e=new THREE.Euler().setFromQuaternion(q);
      ring('frame',metal,p.toArray(),.059,.009,[e.x,e.y,e.z]);
    }
  }
  // The pack owns its straps, buckles and strain relief during disassembly.
  for(const o of [...groups.wiring.children])if(o.geometry.type==='ExtrudeGeometry'||(o.geometry.type==='TubeGeometry'&&o.geometry.parameters.radius===.0038)||Math.abs(o.position.x-.584)<.001){groups.wiring.remove(o);groups.battery.add(o);o.userData.part='battery';}
  for(const z of [-.6,.43]){
    box('battery',metal,[.585,1.16,z],[.018,.05,.2]);
    box('battery',polymer,[.6,1.105,z],[.02,.045,.12]);
  }
  for(const z of [-.92,.68])for(const x of [-.49,.49])box('battery',gasket,[x,.915,z],[.018,.56,.012]);
  // Board sockets with individual metal contacts, no invented port markings.
  for(const [id,x,y,z,w] of [['fc',0,.435,.49,.28],['power',.38,.25,-.6,.24],['becpi',-.62,.425,-.27,.16],['becfc',.62,.425,-.27,.16],['radio',.72,.93,-.61,.13]]){
    box(id,polymer,[x,y,z],[w,.055,.07]);
    for(let i=0;i<4;i++)box(id,metal,[x+(i-1.5)*w/5,y+.03,z+.012],[.012,.025,.018]);
  }
  // Camera retaining ring, housing seams and pivot end caps.
  for(const r of [.181,.192])ring('camera',metal,[0,-1.25,.56],r,.004,[0,0,0]);
  for(const x of [-.277,.277])box('camera',gasket,[x,-1.25,.19],[.008,.32,.012]);
  for(const x of [-.355,.355])ring('camera',metal,[x,-1.25,.2],.064,.006,[0,Math.PI/2,0]);
  for(const x of [-.47,.47])for(const z of [-.52,.66])bolt('cooling',[x,-.3,z]);
  // Consolidate only new static details. Anchors keep single-motor/prop previews
  // intact; the existing instancer subsequently deduplicates identical batches.
  for(const {id,material,anchor,geometries} of batches.values()){
    const normalized=geometries.map(g=>{const n=g.index?g.toNonIndexed():g;g.deleteAttribute('uv');n.deleteAttribute('uv');return n;});
    const merged=mergeGeometries(normalized,false);
    if(!merged)throw new Error('Unable to merge AF-18 detail: '+id);
    // Supply consistent UVs for the laminate material without another texture.
    const p=merged.attributes.position,uv=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){uv[i*2]=p.getX(i);uv[i*2+1]=p.getZ(i);}merged.setAttribute('uv',new THREE.BufferAttribute(uv,2));
    mesh(merged,material,id,...anchor);
    for(const g of new Set([...geometries,...normalized]))g.dispose();
  }
  for(const g of cache.values())g.dispose();
  for(const m of [metal,polymer,gasket,laminate])m.dispose();
}
