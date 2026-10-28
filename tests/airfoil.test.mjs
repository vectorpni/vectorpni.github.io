import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAirfoilGeometry} from '../airfoil-geometry.js';
test('airfoil has finite closed manifold skin, nondegenerate faces and outward normals',()=>{
 for(const hand of [-1,1]){const g=createAirfoilGeometry(.7,hand),p=g.attributes.position,idx=g.index.array,edges=new Map();let volume=0;
 for(let i=0;i<idx.length;i+=3){const ids=[idx[i],idx[i+1],idx[i+2]],v=ids.map(k=>[p.getX(k),p.getY(k),p.getZ(k)]);const a=v[1].map((x,j)=>x-v[0][j]),b=v[2].map((x,j)=>x-v[0][j]);const c=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];assert.ok(Math.hypot(...c)>1e-10);volume+=(v[0][0]*c[0]+v[0][1]*c[1]+v[0][2]*c[2])/6;
 for(let j=0;j<3;j++){const a=ids[j],b=ids[(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(':');const e=edges.get(key)||[0,0];e[0]++;e[1]+=a<b?1:-1;edges.set(key,e);}}
 assert.ok(volume>0,'outward winding');for(const [count,orientation] of edges.values()){assert.equal(count,2);assert.equal(orientation,0);}for(const x of g.attributes.normal.array)assert.ok(Number.isFinite(x));assert.ok(g.boundingBox.max.y<.86&&g.boundingBox.min.y>.72);g.dispose();}
});
