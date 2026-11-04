import React,{useEffect,useRef,useState} from 'react';

export const INITIALIZATION_TIMEOUT=20000;
export const RESTORE_TIMEOUT=8000;

// The shell, cards and image never import Three.js. Probe only WebGL 2 (the
// version used by our renderer), and release this short-lived context at once.
export function supportsWebGL(){
  let gl;
  try{gl=document.createElement('canvas').getContext('webgl2');return !!gl;}
  catch{return false;}
  finally{try{gl?.getExtension('WEBGL_lose_context')?.loseContext();}catch{/* Probe cleanup must not prevent the static shell. */}}
}

class SceneBoundary extends React.Component{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(){this.props.onFailure();}
  render(){return this.state.failed?null:this.props.children;}
}

export function ViewerSession({onStatus,onModule,...props}){
  const [Engine,setEngine]=useState(null),callbacks=useRef();
  callbacks.current={onStatus,onModule};
  const events=useRef({ready:()=>{},failure:()=>{}});
  useEffect(()=>{
    let cancelled=false,timer,terminal=false;
    const clear=()=>clearTimeout(timer);
    const fail=()=>{if(cancelled||terminal)return;terminal=true;clear();setEngine(null);callbacks.current.onStatus('fallback');};
    events.current={
      ready:()=>{if(cancelled||terminal)return;clear();callbacks.current.onStatus('ready');},
      failure:reason=>{
        if(cancelled||terminal)return;
        if(reason?.recoverable){clear();callbacks.current.onStatus('fallback');timer=setTimeout(fail,RESTORE_TIMEOUT);}
        else fail();
      }
    };
    callbacks.current.onStatus('loading');
    if(!supportsWebGL())fail();
    else{
      timer=setTimeout(fail,INITIALIZATION_TIMEOUT);
      import('./viewer-engine.jsx').then(module=>{
        if(cancelled||terminal)return;
        callbacks.current.onModule(module);setEngine(()=>module.default);
      }).catch(fail);
    }
    return()=>{cancelled=true;clear();};
  },[]);
  return Engine?<SceneBoundary onFailure={()=>events.current.failure()}><Engine {...props} onReady={()=>events.current.ready()} onError={reason=>{if(reason)events.current.failure(reason);}}/></SceneBoundary>:null;
}
