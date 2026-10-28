import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const directory=fileURLToPath(new URL('../qa-artifacts/ultra-final/',import.meta.url));
const ids=['overview','frame','motors','props','battery','camera','fasteners','motor-fasteners','exploded'];
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><title>AF-18 Ultra 4.0 — final comparison</title>
<style>body{max-width:1500px;margin:32px auto;padding:0 20px;background:#edf0f2;color:#253e30;font:16px/1.5 Arial}h1{font-size:28px}figure{margin:24px 0}img{display:block;width:100%;height:auto;border-radius:12px}figcaption{padding:8px 0}a{color:#22563c}</style>
<h1>AF-18 Ultra 4.0: final visual comparison</h1>
<p>Left: original f1471f5. Right: final Ultra 4.0. Identical viewport, FOV, camera position and orientation. Neighbouring groups are hidden in isolated close-ups for inspection only. Browser captures have not been retouched.</p>
${ids.map(id=>`<figure><a href="compare-${id}.png"><img src="compare-${id}.png" alt="${id}" loading="lazy"></a><figcaption>${id} — <a href="before-${id}.png">before original PNG</a> / <a href="after-${id}.png">after original PNG</a></figcaption></figure>`).join('\n')}
<p>Maximum zoom: ${['main','frame','motors','props','battery','camera'].map(id=>`<a href="maxzoom-${id}.png">${id}</a>`).join(' · ')}</p></html>`;
writeFileSync(directory+'index.html',html);
console.log(directory+'index.html');
