// A resolution change need not resize the CSS box (e.g. moving between
// displays). ResizeObserver alone therefore misses it. Re-arm the media query
// after each change; no polling or extra animation loop is necessary.
export function watchPixelRatio(onChange,display=window) {
  let media,active=true,last=display.devicePixelRatio;
  function bind(){
    media?.removeEventListener('change',change);
    media=display.matchMedia(`(resolution: ${display.devicePixelRatio}dppx)`);
    media.addEventListener('change',change);
  }
  function change(){if(!active||display.devicePixelRatio===last)return;last=display.devicePixelRatio;bind();onChange();}
  bind();
  display.addEventListener('resize',change);
  display.addEventListener('pageshow',change);
  return ()=>{active=false;media.removeEventListener('change',change);display.removeEventListener('resize',change);display.removeEventListener('pageshow',change);};
}
