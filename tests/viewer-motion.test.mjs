import test from 'node:test';
import assert from 'node:assert/strict';
import {springTo} from '../viewer-motion.js';

test('spring is independent of frame subdivision',()=>{
  const whole={value:.2,velocity:.3},subdivided={...whole};springTo(whole,1,.04);for(let i=0;i<4;i++)springTo(subdivided,1,.01);
  assert.ok(Math.abs(whole.value-subdivided.value)<1e-12);assert.ok(Math.abs(whole.velocity-subdivided.velocity)<1e-12);
});
test('retargeting preserves the current position and velocity',()=>{
  const state={value:0,velocity:0};for(let i=0;i<12;i++)springTo(state,1,1/60);const before={...state};springTo(state,0,0);assert.equal(state.value,before.value);assert.equal(state.velocity,before.velocity);
  for(let i=0;i<150;i++)springTo(state,0,1/60);assert.equal(state.value,0);assert.equal(state.velocity,0);
});
test('assembly stays bounded during rapid reversals and settles',()=>{
  const state={value:0,velocity:0};for(let i=0;i<300;i++){springTo(state,Math.floor(i/7)%2,1/60);assert.ok(state.value>=0&&state.value<=1);assert.ok(Number.isFinite(state.velocity));}for(let i=0;i<150;i++)springTo(state,1,1/60);assert.equal(state.value,1);assert.equal(state.velocity,0);
});
test('reduced motion snaps and idle spring does no further work',()=>{
  const state={value:.3,velocity:2};assert.equal(springTo(state,1,0,13,true),true);assert.deepEqual(state,{value:1,velocity:0});assert.equal(springTo(state,1,1/60),false);
});
