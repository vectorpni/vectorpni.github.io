import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Two genuinely separate clamp halves, with a planar joint. Only the curved
// walls get radial normals; the cut faces and end faces keep their hard edges.
export function createSplitCollarHalfGeometry(outer,inner,length,upper=true,gap=.004){
  const a=Math.asin(gap/2/outer),b=Math.asin(gap/2/inner),s=new T.Shape();
  s.absarc(0,0,outer,a,Math.PI-a,false);s.lineTo(-Math.cos(b)*inner,gap/2);s.absarc(0,0,inner,Math.PI-b,b,true);s.closePath();
  const g=removeCollapsedFaces(new T.ExtrudeGeometry(s,{depth:length,bevelEnabled:false,curveSegments:12}).translate(0,0,-length/2).rotateX(-Math.PI/2));
  const p=g.attributes.position,n=g.attributes.normal;
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),r=Math.hypot(x,z),dot=(n.getX(i)*x+n.getZ(i)*z)/r;if(Math.abs(n.getY(i))<1e-6&&Math.abs(dot)>.9)n.setXYZ(i,Math.sign(dot)*x/r,0,Math.sign(dot)*z/r);}
  if(!upper)g.rotateY(Math.PI);return g;
}

// Illustrative open deep-groove races, sized to the existing teaching bearing.
// No bearing standard, catalogue size or actual AF-18 race profile is claimed.
export function createBearingRaceGeometry(innerRace=false){
  const h=.025,pitch=.041,clearanceRadius=.0062,edge=.0055,segments=32;
  const y=[-h/2,...Array.from({length:9},(_,i)=>-edge+2*edge*i/8),h/2];
  const groove=v=>pitch+(innerRace?-1:1)*Math.sqrt(clearanceRadius**2-Math.min(edge,Math.abs(v))**2);
  const outer=y.map(v=>new T.Vector2(innerRace?groove(v):.055,v));
  const inner=y.map(v=>new T.Vector2(innerRace?.027:groove(v),v));
  const outside=new T.LatheGeometry(outer,segments),inside=new T.LatheGeometry(inner,segments),normal=inside.attributes.normal,index=inside.index.array;
  for(let i=0;i<normal.count;i++)normal.setXYZ(i,-normal.getX(i),-normal.getY(i),-normal.getZ(i));
  for(let i=0;i<index.length;i+=3){const n=index[i+1];index[i+1]=index[i+2];index[i+2]=n;}
  const top=new T.RingGeometry(inner.at(-1).x,outer.at(-1).x,segments).rotateX(-Math.PI/2).translate(0,h/2,0),bottom=new T.RingGeometry(inner[0].x,outer[0].x,segments).rotateX(Math.PI/2).translate(0,-h/2,0);
  const g=mergeGeometries([outside,inside,top,bottom],false);for(const p of [outside,inside,top,bottom])p.dispose();return g;
}

// Bevelled circular paths can leave coincident endpoint triangles at y=0.
// Drop those faces and unused attributes, preserving every surviving normal/UV.
export function removeCollapsedFaces(g){
  const p=g.attributes.position,ix=g.index?.array,indices=[],a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
  for(let i=0;i<(ix?.length||p.count);i+=3){const ia=ix?ix[i]:i,ib=ix?ix[i+1]:i+1,ic=ix?ix[i+2]:i+2;a.fromBufferAttribute(p,ia);b.fromBufferAttribute(p,ib);c.fromBufferAttribute(p,ic);if(b.sub(a).cross(c.sub(a)).lengthSq()>1e-24)indices.push(ia,ib,ic);}
  g.setIndex(indices);const result=g.toNonIndexed();g.dispose();return result;
}

// Display-unit geometry, never a manufacturer drawing. XY panel, normal +Z.
export function createPanelGeometry(width,height,thickness,holes=[],radius=.01){
  for(const [x,y,r]of holes)if(r<=0||Math.abs(x)+r>=width/2||Math.abs(y)+r>=height/2)throw Error('A panel bore must stay inside its outline');
  const x=-width/2,y=-height/2,r=Math.min(radius,width/4,height/4),s=new T.Shape();
  s.moveTo(x+r,y);s.lineTo(x+width-r,y);s.quadraticCurveTo(x+width,y,x+width,y+r);s.lineTo(x+width,y+height-r);s.quadraticCurveTo(x+width,y+height,x+width-r,y+height);s.lineTo(x+r,y+height);s.quadraticCurveTo(x,y+height,x,y+height-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
  for(const [cx,cy,hr]of holes){const p=new T.Path();p.absarc(cx,cy,hr,0,Math.PI*2,true);s.holes.push(p);}
  const prominentBore=holes.some(([, ,r])=>r>Math.min(width,height)*.2);
  return new T.ExtrudeGeometry(s,{depth:thickness,bevelEnabled:false,curveSegments:prominentBore?32:12}).translate(0,0,-thickness/2);
}
export function createBoardGeometry(width,depth,thickness,holes=[]){return createPanelGeometry(width,depth,thickness,holes.map(([x,z,r])=>[x,-z,r]),.012).rotateX(-Math.PI/2);}

export function createOpenSocketGeometry(w,h,d,wall=.012){
  const rectangle=(width,height,r)=>{const s=new T.Shape(),x=-width/2,y=-height/2;s.moveTo(x+r,y);s.lineTo(x+width-r,y);s.quadraticCurveTo(x+width,y,x+width,y+r);s.lineTo(x+width,y+height-r);s.quadraticCurveTo(x+width,y+height,x+width-r,y+height);s.lineTo(x+r,y+height);s.quadraticCurveTo(x,y+height,x,y+height-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;};
  const shape=rectangle(w,h,.008);shape.holes.push(rectangle(w-2*wall,h-2*wall,.004));return new T.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false,curveSegments:4}).translate(0,0,-d/2);
}

export function createCoreWindingGeometry(inner,outer,height,wire=.003){
  const x=(outer-inner)/2+.004,y=height/2+.004,r=.005,p=new T.Path();p.moveTo(-x+r,-y);p.lineTo(x-r,-y);p.quadraticCurveTo(x,-y,x,-y+r);p.lineTo(x,y-r);p.quadraticCurveTo(x,y,x-r,y);p.lineTo(-x+r,y);p.quadraticCurveTo(-x,y,-x,y-r);p.lineTo(-x,-y+r);p.quadraticCurveTo(-x,-y,-x+r,-y);
  class Loop extends T.Curve{getPoint(t,target=new T.Vector3()){const v=p.getPoint(t);return target.set(v.x,v.y,0);}}
  return new T.TubeGeometry(new Loop(),64,wire,6,true);
}

// A curved optical surface with a genuine edge; no overlapping flat discs.
export function createLensElementGeometry(radius=.082,thickness=.013){
  const profile=[];for(let i=0;i<=12;i++){const r=radius*i/12;profile.push(new T.Vector2(r,-thickness/2-.012*(1-(r/radius)**2)));}
  for(let i=12;i>=0;i--){const r=radius*i/12;profile.push(new T.Vector2(r,thickness/2+.006*(1-(r/radius)**2)));}
  const g=new T.LatheGeometry(profile,64).rotateX(Math.PI/2),p=g.attributes.position,ix=g.index.array,indices=[],a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
  // Lathe's collapsed pole quads otherwise contain a zero-area triangle.
  for(let i=0;i<ix.length;i+=3){a.fromBufferAttribute(p,ix[i]);b.fromBufferAttribute(p,ix[i+1]);c.fromBufferAttribute(p,ix[i+2]);if(b.sub(a).cross(c.sub(a)).lengthSq()>1e-24)indices.push(ix[i],ix[i+1],ix[i+2]);}
  return g.setIndex(indices);
}
