import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

export function createViewerControls(camera,element) {
  const root=element.getRootNode(),controls=new OrbitControls(camera,element),dispose=controls.dispose.bind(controls);
  let disposed=false;
  controls.dispose=()=>{
    if(disposed)return;disposed=true;
    dispose();
    // Three r180 disconnect() recomputes getRootNode(). React may already have
    // detached the canvas during passive-effect cleanup. Remove its bound root
    // handlers from the original root too, including keyup when Ctrl is held.
    // Keep this small compatibility fix covered when upgrading OrbitControls.
    root.removeEventListener('keydown',controls._interceptControlDown,{capture:true});
    root.removeEventListener('keyup',controls._interceptControlUp,{capture:true});
  };
  return controls;
}
