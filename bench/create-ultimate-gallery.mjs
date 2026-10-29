import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const root=path.resolve('qa-artifacts/ultimate');
const views={overview:'Общий вид',top:'Сверху',front:'Спереди',exploded:'Разобранная модель',motors:'Двигатель',frame:'Карбоновая рама',props:'Пропеллер',battery:'Аккумулятор',camera:'Камера',electronics:'Электроника',fasteners:'Крепёж',mobile:'Мобильный интерфейс','mobile-card':'Карточка на телефоне','landscape-safe-area':'Горизонтальный экран: safe-area','card-navigation':'Смена компонента: прокрутка и фокус'};
const rows=[];
for(const [id,label]of Object.entries(views)){
  const [before,after]=await Promise.all(['before','after'].map(v=>fs.readFile(path.join(root,v,id+'.png'))));
  const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),equal=hash(before)===hash(after);
  rows.push({id,label,byteIdentical:equal,beforeSHA256:hash(before),afterSHA256:hash(after)});
}
const html='<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vector PNI — Ultimate QA</title><style>body{margin:24px;background:#edf0f2;color:#253d30;font:16px Arial,sans-serif}h1{font-size:26px}article{background:white;padding:16px;border-radius:12px;margin:24px 0}h2{font-size:20px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}img{display:block;max-width:100%;height:auto;margin:auto}figure{margin:0}figcaption{padding:12px 0}small{display:block;margin:12px 0;color:#506859}a{color:inherit}@media(max-width:650px){.pair{grid-template-columns:1fr}}</style><h1>Vector PNI: опубликованная 4.2 и локальный кандидат</h1><p>Исходные браузерные скриншоты. Одинаковые viewport, камера, FOV и DPR. В крупных планах прочие группы скрыты только для диагностики. Первые 13 пар должны сохранять изображение; последние две показывают исправления интерфейса. Safe-area эмулирована в Chromium; физический iPhone не проверялся.</p><nav>'+rows.map(r=>'<a href="#'+r.id+'">'+r.label+'</a>').join(' · ')+'</nav>'+rows.map(r=>'<article id="'+r.id+'"><h2>'+r.label+'</h2><small>'+(r.byteIdentical?'PNG совпадают побайтно.':'Ожидаемое исправление интерфейса: inset / прокрутка / клавиатурный фокус.')+'</small><section class="pair">'+['before','after'].map((v,i)=>'<figure><figcaption>'+['До: стабильная 4.2','После: локальный кандидат'][i]+'</figcaption><img loading="lazy" src="'+v+'/'+r.id+'.png"></figure>').join('')+'</section></article>').join('')+'</html>';
await fs.writeFile(path.join(root,'index.html'),html);await fs.writeFile(path.join(root,'image-hashes.json'),JSON.stringify(rows,null,2));
console.log(JSON.stringify({output:root,comparisons:rows.length,unchangedModelViews:rows.filter(r=>r.byteIdentical).length}));
