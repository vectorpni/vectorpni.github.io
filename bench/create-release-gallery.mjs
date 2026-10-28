import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const directory=fileURLToPath(new URL('../qa-artifacts/release42/',import.meta.url));
const ids=['overview','frame','motors','props','battery','camera','fasteners','motor-fasteners','exploded'];
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><title>Vector PNI 4.2 — release comparison</title>
<style>body{max-width:1800px;margin:32px auto;padding:0 20px;background:#edf0f2;color:#253e30;font:16px/1.5 Arial}h1{font-size:28px}figure{margin:24px 0}img{display:block;width:100%;height:auto;border-radius:12px}figcaption{padding:8px 0}a{color:#22563c}</style>
<h1>AF-18: 4.0 / 4.1 / 4.2</h1><p>Left: Ultra 4.0. Middle: 4.1. Right: release candidate 4.2. Same camera, viewport and model geometry. 4.2 preserves the 4.1 materials and lighting. Main-scene images are pixel-identical between 4.1 and 4.2.</p>
${ids.map(id=>`<figure><a href="compare-${id}.png"><img src="compare-${id}.png" alt="${id}" loading="lazy"></a><figcaption>${id} — <a href="before-${id}.png">4.0 PNG</a> / <a href="materials-${id}.png">4.1 PNG</a> / <a href="after-${id}.png">4.2 PNG</a></figcaption></figure>`).join('\n')}
<p>Maximum zoom: ${['main','frame','motors','props','battery','camera'].map(id=>`<a href="maxzoom-${id}.png">${id}</a>`).join(' · ')}</p></html>`;
writeFileSync(directory+'index.html',html);console.log(directory+'index.html');
