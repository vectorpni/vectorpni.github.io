import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const directory=fileURLToPath(new URL('../qa-artifacts/materials41/',import.meta.url));
const ids=['overview','frame','motors','props','battery','camera','fasteners','motor-fasteners','exploded'];
const versions={before:'Ultra 4.0',materials:'4.1 materials / identical 4.0 lighting',after:'4.1 materials + studio lighting'};
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><title>Vector PNI 4.1 — controlled comparison</title>
<style>body{max-width:1800px;margin:32px auto;padding:0 20px;background:#edf0f2;color:#253e30;font:16px/1.5 Arial}h1{font-size:28px}figure{margin:24px 0}img{display:block;width:100%;height:auto;border-radius:12px}figcaption{padding:8px 0}a{color:#22563c}</style>
<h1>AF-18 4.1: materials and lighting</h1><p>Left: saved Ultra 4.0. Middle: new materials under identical old lighting and exposure. Right: final materials and new studio lighting. Identical camera transforms, FOV and viewport. Isolated groups are shown for inspection only. The screenshots are untouched browser captures.</p>
${ids.map(id=>`<figure><a href="compare-${id}.png"><img src="compare-${id}.png" alt="${id}" loading="lazy"></a><figcaption>${id} — ${Object.entries(versions).map(([v,name])=>`<a href="${v}-${id}.png">${name}: original PNG</a>`).join(' / ')}</figcaption></figure>`).join('\n')}
</html>`;
writeFileSync(directory+'index.html',html);console.log(directory+'index.html');
