import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parts} from '../component-data.js';
import {knowledge} from '../knowledge.js';
import {engineeringCatalog} from '../engineering-catalog.js';
import {landmarks} from '../fallback-landmarks.js';

test('one shared component catalogue supplies 16 cards and 52 documented sections without 3D dependencies',()=>{
  assert.equal(parts.length,16);assert.equal(new Set(parts.map(p=>p.id)).size,16);
  assert.equal(parts.reduce((n,p)=>n+engineeringCatalog[p.id].sections.length,0),52);
  for(const part of parts){assert.ok(knowledge[part.id].summary);assert.ok(knowledge[part.id].sources.length);assert.ok(engineeringCatalog[part.id].unknown);}
  assert.equal(engineeringCatalog.charger.sections.length,0);
  for(const filename of ['component-data.js','knowledge.js','engineering-catalog.js','fallback-landmarks.js'])assert.doesNotMatch(fs.readFileSync(new URL('../'+filename,import.meta.url),'utf8'),/from ['"]three/);
});
test('every mapped component has a bounded, unique touch target without overlaps at supported breakpoints',()=>{
  assert.equal(new Set(landmarks.map(p=>p.id)).size,landmarks.length);
  for(const [width,compact]of [[296,true],[351,true],[366,true],[406,true],[720,false],[800,false]]){
    const points=landmarks.filter(p=>!compact||p.compact),height=width*1000/1600;
    for(const [i,a]of points.entries()){
      assert.ok(parts.some(p=>p.id===a.id));assert.ok(a.x*width>=22&&a.x*width<=width-22&&a.y*height>=22&&a.y*height<=height-22);
      for(const b of points.slice(i+1))assert.ok(Math.abs(a.x-b.x)*width>=44||Math.abs(a.y-b.y)*height>=44,`${a.id} overlaps ${b.id} at ${width}`);
    }
  }
});
test('overview and all 15 on-drone previews are checked-in lightweight WebP resources; no invented charger image',()=>{
  const files=['af18-overview.webp',...parts.filter(p=>p.id!=='charger').map(p=>'parts/'+p.id+'.webp')];
  for(const filename of files){const data=fs.readFileSync(new URL('../public/fallback/'+filename,import.meta.url));assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');assert.ok(data.length<100000);}
  assert.equal(fs.existsSync(new URL('../public/fallback/parts/charger.webp',import.meta.url)),false);
});
