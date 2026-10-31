import React,{useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {createEngineeringAssembly} from './engineering-assembly.js';
import {engineeringCatalog,reconstructionNotice} from './engineering-catalog.js';
import {createViewerControls} from './viewer-controls.js';
import {watchPixelRatio} from './viewer-resolution.js';
import {createStudioEnvironment,configureStudioLighting} from './viewer-presentation.js';
import {springTo} from './viewer-motion.js';
export {createEngineeringAssembly,createStudioEnvironment,configureStudioLighting};

export default function EngineeringInspector({group}) {
  const host=useRef(),api=useRef(),[failed,setFailed]=useState(false),[ready,setReady]=useState(false),[opened,setOpened]=useState(false),[selected,setSelected]=useState(null),[isolated,setIsolated]=useState(false),[nodes,setNodes]=useState([]);
  const catalog=engineeringCatalog[group.userData.part],selectedLeaf=selected?.split('@')[0],baseSelection=catalog.sections.find(s=>s.id===selectedLeaf)||nodes.find(n=>n.id===selectedLeaf),selection=baseSelection&&selected?.includes('@')?{...baseSelection,label:baseSelection.label+' · видимый элемент '+(Number(selected.split(':').at(-1))+1)}:baseSelection,section=selectedLeaf?.split('/')[0];
  useEffect(()=>{
    let renderer,assembly,environment,control,ro,unwatch,frame=null,dead=false,contextLost=false,dirty=true,last=performance.now(),fitDistance=0,targetOpen=false,cameraMove=null,firstFrame=true,lastSelection=null;
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.001,100),motion=matchMedia('(prefers-reduced-motion: reduce)');
    const release=()=>{assembly?.dispose();environment?.dispose();};
    try {
      renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));host.current.appendChild(renderer.domElement);
      assembly=createEngineeringAssembly(group);scene.add(assembly.object);setNodes(assembly.nodes);
      scene.add(new THREE.HemisphereLight(0xffffff,0x939fa5,3));const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(3,5,4);scene.add(key);const fill=new THREE.DirectionalLight(0xc0d4e4,1.5);fill.position.set(-3,2,-3);scene.add(fill);
      environment=createStudioEnvironment(renderer,128);scene.environment=environment.texture;configureStudioLighting(scene,renderer,{preview:true});
      camera.position.set(.8,.6,1).normalize();control=createViewerControls(camera,renderer.domElement);control.enableDamping=true;control.enablePan=false;control.minDistance=defaultMinimum();control.maxDistance=assembly.sphere.radius*20;
    } catch {release();control?.dispose();renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();setFailed(true);return;}
    function invalidate(){dirty=true;if(frame===null&&!dead&&!document.hidden&&!contextLost){last=performance.now();frame=requestAnimationFrame(tick);}}
    function defaultMinimum(){return assembly.sphere.radius*(['battery','camera','gps','radio','esc','becpi','becfc','cooling'].includes(group.userData.part)?.95:.12);}
    const trackedCenter=new THREE.Vector3();
    function tick(now) {
      frame=null;if(dead||contextLost||document.hidden)return;
      const dt=Math.min((now-last)/1000,.05);last=now;let active=assembly.update(dt,targetOpen,motion.matches);
      if(cameraMove){if(cameraMove.focus){const {node,localCenter,direction,distance}=cameraMove.focus;trackedCenter.copy(localCenter);node.localToWorld(trackedCenter);for(const axis of ['x','y','z']){cameraMove.goal['t'+axis]=trackedCenter[axis];cameraMove.goal['p'+axis]=trackedCenter[axis]+direction[axis]*distance;}}let moving=false;for(const [key,state]of Object.entries(cameraMove.states)){moving=springTo(state,cameraMove.goal[key],dt,12,motion.matches)||moving;if(key[0]==='p')camera.position[key[1]]=state.value;else control.target[key[1]]=state.value;}if(!moving&&!active){control.minDistance=cameraMove.minimum;cameraMove=null;}active=active||moving;}
      control.update();if(dirty||active){scene.updateMatrixWorld(true);renderer.render(scene,camera);dirty=false;if(firstFrame){firstFrame=false;setReady(true);}}
      if(active&&frame===null)frame=requestAnimationFrame(tick);
    }
    function moveCamera(position,target,minimum=control.minDistance) {
      const states={},goal={};for(const axis of ['x','y','z']){states['p'+axis]={value:camera.position[axis],velocity:cameraMove?.states['p'+axis]?.velocity||0};goal['p'+axis]=position[axis];states['t'+axis]={value:control.target[axis],velocity:cameraMove?.states['t'+axis]?.velocity||0};goal['t'+axis]=target[axis];}control.minDistance=Math.min(minimum,camera.position.distanceTo(control.target));cameraMove={states,goal,minimum};invalidate();
    }
    const overview=()=>moveCamera(new THREE.Vector3(.8,.6,1).normalize().multiplyScalar(fitDistance),new THREE.Vector3(),defaultMinimum());
    const focus=()=>{
      const key=assembly.selected,selection=assembly.selectionBounds();if(!selection)return;const {node,sphere}=selection;if(!Number.isFinite(sphere.radius)||sphere.radius===0)return;
      const minimum=Math.max(.008,sphere.radius*1.05);
      const half=Math.min(THREE.MathUtils.degToRad(camera.fov)/2,Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*camera.aspect));
      const direction=camera.position.clone().sub(control.target).normalize(),distance=Math.max(sphere.radius/Math.sin(half)*1.15,minimum*1.1),localCenter=node.worldToLocal(sphere.center.clone());moveCamera(direction.clone().multiplyScalar(distance).add(sphere.center),sphere.center,minimum);cameraMove.focus={node,localCenter,direction,distance};
    };
    api.current={set(open,key,only){targetOpen=open;assembly.select(key,only);if(key!==lastSelection){lastSelection=key;cameraMove=null;}invalidate();},overview,focus};
    const resize=()=>{const w=host.current.clientWidth,h=host.current.clientHeight;if(!w||!h)return;const ratio=Math.min(devicePixelRatio,1.6);if(renderer.getPixelRatio()!==ratio)renderer.setPixelRatio(ratio);renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();const half=Math.min(THREE.MathUtils.degToRad(camera.fov)/2,Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*camera.aspect)),distance=assembly.sphere.radius/Math.sin(half)*1.08;if(!fitDistance)camera.position.multiplyScalar(distance);else camera.position.sub(control.target).multiplyScalar(distance/fitDistance).add(control.target);fitDistance=distance;cameraMove=null;invalidate();};
    const lost=e=>{e.preventDefault();contextLost=true;cancelAnimationFrame(frame);frame=null;release();setFailed(true);};
    const restored=()=>{if(dead)return;try{environment?.dispose();environment=createStudioEnvironment(renderer,128);scene.environment=environment.texture;contextLost=false;setFailed(false);invalidate();}catch{setFailed(true);}};
    const visibility=()=>{if(document.hidden){cancelAnimationFrame(frame);frame=null;}else invalidate();};
    let down=null,pending=null;const pointers=new Set();
    const start=e=>{pending=null;pointers.add(e.pointerId);down=pointers.size===1&&e.button===0?{x:e.clientX,y:e.clientY,id:e.pointerId}:null;};
    const moved=e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)down=null;};
    const end=e=>{pointers.delete(e.pointerId);pending=down?.id===e.pointerId&&!pointers.size&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<=6?down:null;down=null;};
    const cancel=e=>{pointers.delete(e.pointerId);down=null;pending=null;};
    const clicked=e=>{if(!pending)return;pending=null;const r=renderer.domElement.getBoundingClientRect(),key=assembly.pick((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1,camera);if(key&&key!==assembly.selected){setSelected(key);setIsolated(false);}};
    const stopFocus=()=>{cameraMove=null;};
    const canvas=renderer.domElement,listeners={pointerdown:start,pointermove:moved,pointerup:end,pointercancel:cancel,click:clicked,webglcontextlost:lost,webglcontextrestored:restored};
    for(const [event,fn]of Object.entries(listeners))canvas.addEventListener(event,fn);
    document.addEventListener('visibilitychange',visibility);motion.addEventListener('change',invalidate);control.addEventListener('change',invalidate);control.addEventListener('start',stopFocus);
    ro=new ResizeObserver(resize);ro.observe(host.current);unwatch=watchPixelRatio(resize);resize();
    return()=>{dead=true;api.current=null;cancelAnimationFrame(frame);ro.disconnect();unwatch();document.removeEventListener('visibilitychange',visibility);motion.removeEventListener('change',invalidate);for(const [event,fn]of Object.entries(listeners))canvas.removeEventListener(event,fn);control.removeEventListener('change',invalidate);control.removeEventListener('start',stopFocus);control.dispose();release();renderer.dispose();renderer.forceContextLoss();canvas.remove();};
  },[group]);
  useEffect(()=>{api.current?.set(opened,selected,isolated);},[opened,selected,isolated,nodes]);
  return <div className="engineering-inspector">
    <div className="part-preview engineering-stage" ref={host} aria-label="Многоуровневое устройство узла">{failed?<p className="detail-error" role="alert">Не удалось отобразить узел. Внешний вид и описание остаются доступны.</p>:!ready&&<p className="detail-error" role="status">Подготовка геометрии узла…</p>}</div>
    <div className="detail-actions"><button aria-pressed={opened} onClick={()=>setOpened(v=>!v)}>{opened?'Собрать узел':'Разобрать узел'}</button><button onClick={()=>{setSelected(null);setIsolated(false);api.current?.overview();}}>Общий вид узла</button></div>
    <p className="detail-notice">{reconstructionNotice}</p>
    <nav className="detail-tree" aria-label="Состав выбранного узла">{catalog.sections.map(s=><div key={s.id}><button aria-pressed={section===s.id} onClick={()=>{setSelected(s.id);setIsolated(false);}}>{s.label}</button>{section===s.id&&<div className="detail-leaves">{nodes.filter(n=>n.section===s.id).map(n=><button key={n.id} aria-pressed={selected===n.id} onClick={()=>{setSelected(n.id);setIsolated(false);}}>{n.label}</button>)}</div>}</div>)}</nav>
    {selection&&<div className="detail-selection" aria-live="polite"><b>{selection.label}</b><p>{selection.description||selection.purpose+'. '+selection.geometry+'. '+selection.material+'. '+selection.attachment+'. Условная реконструкция.'}</p><div className="detail-actions"><button aria-pressed={isolated} onClick={()=>setIsolated(v=>!v)}>{isolated?'Показать весь узел':'Только выбранное'}</button><button onClick={()=>api.current?.focus()}>Приблизить деталь</button></div></div>}
    <details className="detail-evidence"><summary>Что подтверждено и что неизвестно</summary><p>{catalog.known}</p><p>Не подтверждено: {catalog.unknown}</p><p>Источники и справочные примеры — в разделе «Источники» этой карточки.</p></details>
  </div>;
}
