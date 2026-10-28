import * as THREE from 'three';

// Same planform and envelope as the existing reconstruction. A closed skin adds
// tapered thickness, camber and opposite pitch for the documented CW/CCW pair.
export function createAirfoilGeometry(angle,handedness=1) {
  const positions=[],uv=[],indices=[],n=44,m=12,stride=m+1,layer=(n+1)*stride;
  for(let side=0;side<2;side++)for(let i=0;i<=n;i++){
    const t=i/n,r=.065+t*1.51,width=.025+.14*Math.pow(Math.sin(Math.PI*t),.65)*(1-.36*t),sweep=.11*Math.sin(t*Math.PI)-.055*t;
    for(let j=0;j<=m;j++){
      const u=j/m,v=u-.5,across=v*width*2+sweep;
      const thickness=.003+.014*Math.sin(Math.PI*u)*Math.pow(Math.sin(Math.PI*t),.6);
      const y=.79+handedness*v*width*(.62-.48*t)+Math.sin(u*Math.PI)*.018*Math.sin(t*Math.PI)+(side?-1:1)*thickness/2;
      positions.push(r*Math.cos(angle)-across*Math.sin(angle),y,r*Math.sin(angle)+across*Math.cos(angle));uv.push(t,u);
      if(i<n&&j<m){const p=side*layer+i*stride+j;side?indices.push(p,p+stride,p+1,p+1,p+stride,p+stride+1):indices.push(p,p+1,p+stride,p+1,p+stride+1,p+stride);}
    }
  }
  const quad=(a,b)=>indices.push(b,a,b+layer,a,a+layer,b+layer);
  for(let i=0;i<n;i++){quad((i+1)*stride,i*stride);quad(i*stride+m,(i+1)*stride+m);}
  for(let j=0;j<m;j++){quad(j,j+1);quad(n*stride+j+1,n*stride+j);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
}
