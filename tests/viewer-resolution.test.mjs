import test from 'node:test';
import assert from 'node:assert/strict';
import {watchPixelRatio} from '../viewer-resolution.js';

test('resolution observer re-arms once per change and releases all listeners',()=>{
  const queries=[],display=Object.assign(new EventTarget(),{devicePixelRatio:1,matchMedia(query){const media=new EventTarget();media.query=query;media.callbacks=new Set();const add=media.addEventListener.bind(media),remove=media.removeEventListener.bind(media);media.addEventListener=(type,fn)=>{media.callbacks.add(fn);add(type,fn);};media.removeEventListener=(type,fn)=>{media.callbacks.delete(fn);remove(type,fn);};queries.push(media);return media;}});
  let calls=0;const dispose=watchPixelRatio(()=>calls++,display);
  assert.equal(queries[0].query,'(resolution: 1dppx)');
  for(const dpr of [2,3,1]){
    const old=queries.at(-1);display.devicePixelRatio=dpr;old.dispatchEvent(new Event('change'));
    assert.equal(old.callbacks.size,0);assert.equal(queries.at(-1).callbacks.size,1);assert.equal(queries.at(-1).query,`(resolution: ${dpr}dppx)`);
  }
  assert.equal(calls,3);display.dispatchEvent(new Event('resize'));assert.equal(calls,3);
  display.devicePixelRatio=2;display.dispatchEvent(new Event('resize'));assert.equal(calls,4);
  display.dispatchEvent(new Event('pageshow'));assert.equal(calls,4);
  dispose();assert.ok(queries.every(q=>q.callbacks.size===0));display.devicePixelRatio=3;queries.at(-1).dispatchEvent(new Event('change'));display.dispatchEvent(new Event('resize'));assert.equal(calls,4);
});
