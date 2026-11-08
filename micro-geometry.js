import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {removeCollapsedFaces} from './interior-geometry.js';

// Display units and generic mechanical forms, never manufacturer dimensions.
// The existing envelope and attachment axes are retained by every replacement.
// Bounded CPU templates never reach a renderer. Deep clones keep all callers'
// transforms, uploads, disposal and WebGL restoration independent.
const socketTemplates=new Map();
export function createRecessedSocketGeometry(radius=.026,height=.018){
  if(!(Number.isFinite(radius)&&Number.isFinite(height)&&radius>0&&height>0))throw Error('Invalid socket envelope');
  const key=radius+':'+height;if(socketTemplates.has(key))return socketTemplates.get(key).clone();
  const segments=24,b=Math.min(radius*.06,height*.16),top=height/2,bottom=-top,floor=top-height*.64;
  const p=[],n=[],uv=[],rings=[[radius-b,bottom],[radius,bottom+b],[radius,top-b],[radius-b,top],[radius*.46,top],[radius*.43,top-b],[radius*.43,floor]];
  const point=(ring,i)=>{const angle=i*Math.PI*2/segments,[r,y]=rings[ring],sector=Math.PI/3,hex=ring>=4?r*Math.cos(Math.PI/6)/Math.cos((angle%(Math.PI/3))-sector/2):r;return new T.Vector3(Math.cos(angle)*hex,y,Math.sin(angle)*hex);};
  const triangle=(a,b,c,normals)=>{const face=b.clone().sub(a).cross(c.clone().sub(a));if(face.lengthSq()<1e-24)return;face.normalize();for(const [i,v]of [a,b,c].entries()){p.push(v.x,v.y,v.z);const normal=normals?.[i]||face;n.push(normal.x,normal.y,normal.z);uv.push(v.x/(2*radius)+.5,v.z/(2*radius)+.5);}};
  for(let band=0;band<3;band++)for(let i=0;i<segments;i++){
    const a=point(band,i),b=point(band+1,i),c=point(band+1,i+1),d=point(band,i+1);
    const smooth=(i)=>new T.Vector3(Math.cos(i*Math.PI*2/segments),band===0?-1:band===2?1:0,Math.sin(i*Math.PI*2/segments)).normalize();
    const normals=band<3?[smooth(i),smooth(i),smooth(i+1),smooth(i+1)]:null;
    triangle(a,b,c,normals&&[normals[0],normals[1],normals[2]]);triangle(a,c,d,normals&&[normals[0],normals[2],normals[3]]);
  }
  // Circular outside stays at 24 sides. The six genuinely planar socket faces
  // need only their six corners, not four coplanar subdivisions on every side.
  const outer=Array.from({length:segments},(_,i)=>point(3,i)),inner=Array.from({length:6},(_,i)=>point(4,i*segments/6)),all=[...outer,...inner];
  const faces=T.ShapeUtils.triangulateShape(outer.map(v=>new T.Vector2(v.x,v.z)),[inner.map(v=>new T.Vector2(v.x,v.z))]);
  for(const [a,b,c]of faces){const va=all[a],vb=all[b],vc=all[c];if(vb.clone().sub(va).cross(vc.clone().sub(va)).y>0)triangle(va,vb,vc);else triangle(va,vc,vb);}
  for(let band=4;band<6;band++)for(let i=0;i<6;i++){const a=point(band,i*4),b=point(band+1,i*4),c=point(band+1,(i+1)*4),d=point(band,(i+1)*4);triangle(a,b,c);triangle(a,c,d);}
  for(let i=0;i<6;i++)triangle(point(6,i*4),new T.Vector3(0,floor,0),point(6,(i+1)*4));
  for(let i=0;i<segments;i++)triangle(point(0,i),point(0,i+1),new T.Vector3(0,bottom,0));
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(p,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(n,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.userData.micro70='blind hex recess, floor and rim bevel';
  if(socketTemplates.size>=32){const oldest=socketTemplates.keys().next().value;socketTemplates.get(oldest).dispose();socketTemplates.delete(oldest);}socketTemplates.set(key,geometry);return geometry.clone();
}

export function createBevelledAnnulusGeometry(outer,inner,height,segments=32,bevelLimit=Infinity){
  if(!(outer>inner&&inner>0&&height>0))throw Error('Invalid open seat');
  const b=Math.min((outer-inner)*.15,height*.2,bevelLimit),y=height/2;
  const profile=[[outer-b,-y],[outer,-y+b],[outer,y-b],[outer-b,y],[inner+b,y],[inner,y-b],[inner,-y+b],[inner+b,-y],[outer-b,-y]].map(p=>new T.Vector2(...p));
  const g=new T.LatheGeometry(profile,segments);g.normalizeNormals();g.userData.micro70='open seat with four edge bevels';return g;
}

const profileAlongX=(points,width)=>{const shape=new T.Shape();for(const [i,[z,y]]of points.entries())i?shape.lineTo(-z,y):shape.moveTo(-z,y);shape.closePath();return removeCollapsedFaces(new T.ExtrudeGeometry(shape,{depth:width,bevelEnabled:false,steps:1}).translate(0,0,-width/2).rotateY(Math.PI/2));};

export function createFoldedTabGeometry(width=.075,length=.046){
  const h=.003,lo=-.006,hi=.003;
  const g=profileAlongX([[-length/2,lo],[length*.12,lo],[length*.34,hi],[length/2,hi],[length/2,hi+h],[length*.28,hi+h],[length*.06,lo+h],[-length/2,lo+h]],width);
  g.userData.micro70='thin folded illustrative tab';return g;
}

export function createSolderFilletGeometry(width=.02,length=.012,height=.006){
  const shape=new T.Shape();shape.moveTo(length/2,0);shape.lineTo(-length/2,0);shape.lineTo(-length/2,height);shape.quadraticCurveTo(length*.1,height*.12,length/2,height*.04);shape.closePath();
  const g=removeCollapsedFaces(new T.ExtrudeGeometry(shape,{depth:width,bevelEnabled:false,curveSegments:5}).translate(0,0,-width/2).rotateY(Math.PI/2));g.userData.micro70='seated concave solder fillet';return g;
}

export function createLaminatedToothGeometry(width=.085,height=.09,depth=.035){
  const points=[[-depth/2,-height/2]];
  for(const y of [-.027,-.009,.009,.027])points.push([-depth/2,y-.0015],[-depth/2+.0012,y-.0015],[-depth/2+.0012,y+.0015],[-depth/2,y+.0015]);
  points.push([-depth/2,height/2],[depth/2,height/2]);
  for(const y of [.027,.009,-.009,-.027])points.push([depth/2,y+.0015],[depth/2-.0012,y+.0015],[depth/2-.0012,y-.0015],[depth/2,y-.0015]);
  points.push([depth/2,-height/2]);const g=profileAlongX(points,width);g.userData.micro70='recessed layer edges within existing stator tooth';return g;
}

export function createSplitContactGeometry(outer=.017,inner=.010,height=.026){
  const gap=.06,s=new T.Shape();s.absarc(0,0,outer,gap,Math.PI*2-gap,false);s.lineTo(Math.cos(gap)*inner,-Math.sin(gap)*inner);s.absarc(0,0,inner,Math.PI*2-gap,gap,true);s.closePath();
  const g=removeCollapsedFaces(new T.ExtrudeGeometry(s,{depth:height,bevelEnabled:false,curveSegments:12}).translate(0,0,-height/2).rotateX(-Math.PI/2));g.userData.micro70='single split illustrative spring contact';return g;
}

export function createMicroPackageGeometry(w,h,d){const g=removeCollapsedFaces(new RoundedBoxGeometry(w,h,d,2,Math.min(w,h,d)*.09));g.userData.micro70='chamfered existing package';return g;}

export function createContactPostGeometry(width,height,square=false){
  const r=square?width/Math.SQRT2:width,tip=Math.min(height*.12,width*.65);
  const source=new T.LatheGeometry([[0,-height/2],[r,-height/2],[r,height/2-tip],[r*.58,height/2],[0,height/2]].map(p=>new T.Vector2(...p)),square?4:16);source.normalizeNormals();const g=removeCollapsedFaces(source);
  if(square){g.rotateY(Math.PI/4);g.computeVertexNormals();}g.userData.micro70='contact post with seated base and chamfered tip';return g;
}

// Six blades remain the six existing illustrative fan members. The thin swept
// planform fits the current guard and seats into its existing rear hub.
export function createCoolingBladeGeometry(){
  const sides=[[],[]];
  for(let i=0;i<=16;i++){
    const t=i/16,u=1-t,x=u*u*.068+2*u*t*.17+t*t*.246,y=2*u*t*.03+t*t*.134,dx=2*u*(.17-.068)+2*t*(.246-.17),dy=2*u*.03+2*t*(.134-.03),length=Math.hypot(dx,dy),width=.026*(1-t)+.017*t;
    for(const [index,sign]of [-1,1].entries())sides[index].push([x-sign*dy/length*width,y+sign*dx/length*width]);
  }
  const shape=new T.Shape([...sides[0],...sides[1].reverse()].map(p=>new T.Vector2(...p)));const g=removeCollapsedFaces(new T.ExtrudeGeometry(shape,{depth:.009,bevelEnabled:false,steps:1} ).translate(0,0,-.0045));g.userData.micro70Fan=true;return g;
}
