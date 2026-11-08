import * as T from 'three';

import {createBevelledAnnulusGeometry} from './micro-geometry.js';

// Deterministic finish studies, not measured AF-18 material scans. Immutable
// CPU pixels may be shared; every returned Texture owns its renderer handles.
let grainPixels;
function texture(data,size,anisotropy,colorSpace=T.NoColorSpace){const t=new T.DataTexture(data,size,size);t.colorSpace=colorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.generateMipmaps=true;t.anisotropy=anisotropy;t.needsUpdate=true;return t;}
export function createManufacturingSurfaceTexture(anisotropy=1){
 const size=128;if(!grainPixels){grainPixels=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const hash=((x*73856093)^(y*19349663))>>>0,noise=(hash%23)/22,i=(y*size+x)*4;grainPixels[i]=126+Math.round(noise*4);grainPixels[i+1]=234+Math.round(noise*12);grainPixels[i+2]=255;grainPixels[i+3]=255;}}
 const t=texture(grainPixels,size,anisotropy);t.repeat.set(12,12);t.name='PNI 7.1 subtle manufacturing roughness';t.userData.pniSurface71=true;return t;
}
export function applyManufacturingFinish(material,surface){
 if(material.userData.pniFinish71||material.roughnessMap||material.map||material.roughness<.12)return;
 material.roughnessMap=surface;material.roughness=Math.min(1,material.roughness/(240/255));material.userData.pniFinish71=true;
}
export function findManufacturingSurface(root){let surface;root.traverse(o=>{if(!surface&&o.material?.roughnessMap?.userData.pniSurface71)surface=o.material.roughnessMap;});return surface;}
export function createWebbingTextures(anisotropy=1,repeat=[6,2]){
 const size=128,color=new Uint8Array(size*size*4),surface=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const warp=(Math.floor(x/4)-Math.floor(y/4)+32)%4<2,strand=warp?x:y,crown=.5+.5*Math.cos((strand%4+.5)*Math.PI/2),noise=(((x*13)^(y*31))%7)/7,i=(y*size+x)*4,tone=35+8*crown+noise;for(let c=0;c<3;c++)color[i+c]=tone; color[i+3]=255;surface[i]=125+12*crown+noise;surface[i+1]=238+10*(1-crown);surface[i+2]=255;surface[i+3]=255;}
 const c=texture(color,size,anisotropy,T.SRGBColorSpace),s=texture(surface,size,anisotropy);c.repeat.fromArray(repeat);s.repeat.fromArray(repeat);return {color:c,surface:s};
}

// A flat annular tool reference with six true flats, an open round bore and
// chamfered seats. The old segments/4 arc division produced only three sides.
export function createHexSeatGeometry(outer,inner,height){
 const b=Math.min(height*.12,(outer*Math.cos(Math.PI/6)-inner)*.2);if(!(b>0))throw Error('Bore crosses hex flats');
 const shape=new T.Shape();for(let i=0;i<6;i++){const a=i*Math.PI/3,r=outer-b/Math.cos(Math.PI/6);i?shape.lineTo(Math.cos(a)*r,Math.sin(a)*r):shape.moveTo(r,0);}shape.closePath();const hole=new T.Path();hole.absarc(0,0,inner+b,0,2*Math.PI,true);shape.holes.push(hole);
 const g=new T.ExtrudeGeometry(shape,{depth:height-2*b,bevelEnabled:true,bevelSize:b,bevelThickness:b,bevelSegments:1,curveSegments:12}).translate(0,0,-(height-2*b)/2).rotateX(-Math.PI/2);g.normalizeNormals();return g;
}
export const cameraWindowSeat71={cylinderCentreZ:.567,cylinderThickness:.025,convexCentreZ:.605,convexRadius:.107,convexScaleZ:.0253/.107,frontBoreRadius:.109};

// Existing concentric rings previously floated ahead of the barrel. This open
// support collar seats them without changing the established outer silhouette.
// Conditional mechanical reconstruction; no new optical element or mechanism.
export function createOpticalHoodSeatGeometry(){
 const points=[[.19,.553],[.19,.601],[.186,.601],[.186,.597],[.172,.588],[.154,.579],[.136,.570],[.133,.553],[.19,.553]].map(p=>new T.Vector2(...p));
 const g=new T.LatheGeometry(points,64).rotateX(Math.PI/2);g.normalizeNormals();return g;
}

// Study-only tessellation: the general drone keeps its current geometry. The
// existing visible circular surfaces get private buffers on demand.
export function refineCameraStudySurfaces(sourceMeshes,preview,owned){
 let surfaces=0,addedTriangles=0;
 for(const source of sourceMeshes){const g=source.geometry,p=g.parameters;let high;
  if(g.type==='TorusGeometry'&&p.tube===.008&&p.radius>=.14&&p.radius<.195&&p.tubularSegments===32)high=new T.TorusGeometry(p.radius,p.tube,10,64);
  else if(g.type==='SphereGeometry'&&Math.abs(p.radius-cameraWindowSeat71.convexRadius)<1e-8)high=new T.SphereGeometry(p.radius,64,32);
  else if(g.type==='CylinderGeometry'&&p.radiusTop===.13&&p.height===cameraWindowSeat71.cylinderThickness)high=new T.CylinderGeometry(p.radiusTop,p.radiusBottom,p.height,96,p.heightSegments,p.openEnded,p.thetaStart,p.thetaLength);
  else if(source.userData.studySurface71==='front-retainer')high=createBevelledAnnulusGeometry(.123,.109,.018,96,.001).rotateX(Math.PI/2).translate(0,-1.25,.61);
  if(!high)continue;let used=false;preview.traverse(o=>{if(!o.isMesh||o.geometry.attributes.position!==g.attributes.position)return;o.geometry=high;if(o.isInstancedMesh){o.computeBoundingBox();o.computeBoundingSphere();}used=true;});
  if(used){owned.add(high);surfaces++;addedTriangles+=((high.index?.count||high.attributes.position.count)-(g.index?.count||g.attributes.position.count))/3;}else high.dispose();
 }
 return {surfaces,addedTriangles,onDemand:true};
}

// Existing small round washers remain the same toroidal shape and owners.
// Repeated source references share one study-only buffer, never a main buffer.
export function refineStudyWasherSurfaces(sourceMeshes,preview,owned){
 let surfaces=0,addedTriangles=0;const seen=new Set();
 for(const source of sourceMeshes){const g=source.geometry,p=g.parameters;if(seen.has(g)||g.type!=='TorusGeometry'||p.radius>.08||p.tubularSegments>=48)continue;seen.add(g);
  const high=new T.TorusGeometry(p.radius,p.tube,Math.max(8,p.radialSegments),64,p.arc);let used=false;
  preview.traverse(o=>{if(!o.isMesh||o.geometry.attributes.position!==g.attributes.position)return;o.geometry=high;if(o.isInstancedMesh){o.computeBoundingBox();o.computeBoundingSphere();}const count=o.isInstancedMesh?o.count:1;surfaces+=count;addedTriangles+=((high.index?.count||high.attributes.position.count)-(g.index?.count||g.attributes.position.count))/3*count;used=true;});
  if(used)owned.add(high);else high.dispose();
 }
 return {surfaces,addedTriangles,onDemand:true};
}
