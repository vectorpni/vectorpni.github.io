import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera} from 'three';
import {createViewerControls} from '../viewer-controls.js';

function target(){
  const t=new EventTarget(),listeners=new Map(),add=t.addEventListener.bind(t),remove=t.removeEventListener.bind(t);
  t.addEventListener=(type,fn,options)=>{if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);add(type,fn,options);};
  t.removeEventListener=(type,fn,options)=>{listeners.get(type)?.delete(fn);remove(type,fn,options);};
  t.listeners=listeners;return t;
}
test('detached preview controls release the original root listeners, also while Ctrl is held',()=>{
  const root=target(),canvas=target();canvas.style={};canvas.getRootNode=()=>root;
  const camera=new PerspectiveCamera();camera.position.z=5;
  const control=createViewerControls(camera,canvas);
  assert.equal(typeof control._interceptControlDown,'function');assert.equal(typeof control._interceptControlUp,'function');
  assert.equal(root.listeners.get('keydown').size,1);
  const event=new Event('keydown');event.key='Control';root.dispatchEvent(event);assert.equal(root.listeners.get('keyup').size,1);
  canvas.getRootNode=()=>canvas;control.dispose();control.dispose();
  assert.ok([...root.listeners.values()].every(s=>s.size===0));assert.ok([...canvas.listeners.values()].every(s=>s.size===0));
});
