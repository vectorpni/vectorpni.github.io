import * as THREE from 'three';

// Exact vertex reuse for newly constructed, private study buffers. Position,
// normal and UV bits all participate: no tolerance, smoothing or seam welding.
// Borrowed main-model buffers and existing indexed/instanced geometry stay put.
export function indexStudyGeometry(source){
  const attributes=Object.entries(source.attributes),count=source.attributes.position?.count;
  if(source.index||!count||Object.keys(source.morphAttributes).length||attributes.some(([,a])=>!(a.array instanceof Float32Array)||a.count!==count))return source;
  const bits=attributes.map(([,a])=>({size:a.itemSize,data:new Uint32Array(a.array.buffer,a.array.byteOffset,a.array.length)})),buckets=new Map(),unique=[],indices=new Uint32Array(count);
  const equal=(a,b)=>{for(const {size,data}of bits)for(let k=0;k<size;k++)if(data[a*size+k]!==data[b*size+k])return false;return true;};
  for(let i=0;i<count;i++){
    let hash=2166136261;for(const {size,data}of bits)for(let k=0;k<size;k++)hash=Math.imul(hash^data[i*size+k],16777619);hash>>>=0;
    const bucket=buckets.get(hash);let match;
    if(bucket)for(const index of bucket)if(equal(i,unique[index])){match=index;break;}
    if(match===undefined){match=unique.length;unique.push(i);if(bucket)bucket.push(match);else buckets.set(hash,[match]);}indices[i]=match;
  }
  if(unique.length===count)return source;
  const result=new THREE.BufferGeometry();
  for(const [name,a]of attributes){const array=new Float32Array(unique.length*a.itemSize),target=new Uint32Array(array.buffer),input=new Uint32Array(a.array.buffer,a.array.byteOffset,a.array.length);for(let i=0;i<unique.length;i++)for(let k=0;k<a.itemSize;k++)target[i*a.itemSize+k]=input[unique[i]*a.itemSize+k];result.setAttribute(name,new THREE.BufferAttribute(array,a.itemSize,a.normalized));}
  result.setIndex(new THREE.BufferAttribute(unique.length<=65535?new Uint16Array(indices):indices,1));result.groups=source.groups.map(g=>({...g}));result.setDrawRange(source.drawRange.start,source.drawRange.count);result.userData={...source.userData};result.boundingBox=source.boundingBox?.clone()||null;result.boundingSphere=source.boundingSphere?.clone()||null;
  return result;
}
