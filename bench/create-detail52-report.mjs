import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import zlib from 'node:zlib';
import {engineeringCatalog} from '../engineering-catalog.js';
import {detail52Ledger as ledger,componentNames as names} from './detail52-ledger.mjs';

const root='qa-artifacts/detail52',read=async name=>JSON.parse(await fs.readFile(root+'/'+name+'.json','utf8'));
const chrome=await read('chrome-final'),firefox=await read('firefox-final'),verified=await read('verified-profile'),proof=await read('indexing-proof'),before=await read('before');
const webkit=await read('webkit-status'),unit=await read('unit-tests');if(unit.exitCode!==0)throw Error('Unit tests failed');
for(const run of [chrome,firefox,verified,proof,before])if(run.results.some(r=>!r.passed))throw Error('Required acceptance run failed');
const result=(run,name)=>run.results.find(r=>r.filename.endsWith(name)).result;
const profile=result(verified,'viewer.detail52-paired-profile.js'),main=result(verified,'viewer.detail52-main-profile.js'),solo=result(verified,'viewer.detail52-single-profile.js'),stress=result(chrome,'viewer.detail50-resilience.js');
const after=result(proof,'viewer.detail52.js'),old=result(before,'viewer.detail51.js'),gallery=result(chrome,'viewer.detail52-gallery.js'),hierarchy=result(chrome,'viewer.detail52-hierarchy.js');
if(gallery.comparisons.length!==104||gallery.macros.length!==69||Object.keys(ledger).length!==52||profile.rows.length!==24||profile.rows.some(r=>r.contextLost||r.losses||r.alphaPixels<100))throw Error('Incomplete geometry or live GPU coverage');
const ids=after.rows.map(r=>r.id),hash=b=>crypto.createHash('sha256').update(b).digest('hex'),f=n=>Number(n).toFixed(2),mb=n=>f(n/1e6),esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
for(const r of after.rows)if(JSON.stringify(r.view)!==JSON.stringify(old.rows.find(o=>o.id===r.id).view))throw Error('Whole node comparison camera changed');
const entries=ids.flatMap(id=>engineeringCatalog[id].sections.map(s=>({part:id,key:id+'/'+s.id,...s,...ledger[id+'/'+s.id]})));
const quant=(a,p)=>a.slice().sort((a,b)=>a-b)[Math.floor((a.length-1)*p)];
const perf=[];for(const cpuRate of [1,4])for(const mode of ['assembled-rotation','opened-rotation','reversing'])for(const port of [5180,5175]){const rows=profile.rows.filter(r=>r.cpuRate===cpuRate&&r.mode===mode&&r.port===port),frame=rows.flatMap(r=>r.frameMs),render=rows.flatMap(r=>r.renderMs);perf.push({port,cpuRate,mode,fps:frame.length*1000/frame.reduce((n,t)=>n+t,0),minFPS:Math.min(...rows.map(r=>r.fps)),maxFPS:Math.max(...rows.map(r=>r.fps)),p95:quant(frame,.95),p99:quant(frame,.99),render95:quant(render,.95)});}
const perfTable=perf.filter(p=>p.port===5180).map(p=>{const a=perf.find(a=>a.port===5175&&a.cpuRate===p.cpuRate&&a.mode===p.mode);return `| ×${p.cpuRate} | ${p.mode} | ${f(p.fps)} → ${f(a.fps)} | ${f(p.p95)} → ${f(a.p95)} | ${f(p.p99)} → ${f(a.p99)} | ${f(p.render95)} → ${f(a.render95)} |`;}).join('\n');
const setup=port=>profile.setup.find(s=>s.port===port),baseline=setup(5180),current=setup(5175);
const pieces=after.rows.reduce((n,r)=>n+r.detail51.pieces,0),oldPieces=old.rows.reduce((n,r)=>n+r.detail51.pieces,0);
const nodeTable=after.rows.map(a=>{const b=old.rows.find(r=>r.id===a.id),s=solo.rows.filter(r=>r.id===a.id);return `| ${names[a.id]} | ${b.detail51.pieces} → ${a.detail51.pieces} | ${b.calls} → ${a.calls} | ${b.triangles} → ${a.triangles} | ${f(s.find(r=>r.cpuRate===1).fps)} / ${f(s.find(r=>r.cpuRate===4).fps)} |`;}).join('\n');
const mainTable=[1,4].map(cpu=>{const a=main.rows.filter(r=>r.port===5175&&r.cpuRate===cpu),b=main.rows.filter(r=>r.port===5180&&r.cpuRate===cpu),median=a=>{a=a.slice().sort((x,y)=>x-y);return a.length%2?a[Math.floor(a.length/2)]:(a[a.length/2-1]+a[a.length/2])/2;};return `| ×${cpu} | ${f(median(b.map(r=>r.readyMs)))} → ${f(median(a.map(r=>r.readyMs)))} | ${f(median(b.map(r=>r.rotation.fps)))} → ${f(median(a.map(r=>r.rotation.fps)))} | ${b[0].rotation.calls} → ${a[0].rotation.calls} | ${b[0].rotation.triangles} → ${a[0].rotation.triangles} |`;}).join('\n');
const files=await fs.readdir('pages-dist/assets'),assets=[];for(const file of files){const b=await fs.readFile('pages-dist/assets/'+file);assets.push({file,bytes:b.length,gzip:zlib.gzipSync(b).length,sha256:hash(b)});}if(!assets.some(a=>after.setup.runtimeChunk.endsWith('/'+a.file)))throw Error('Wrong production chunk');
await fs.writeFile(root+'/build.json',JSON.stringify({createdAt:new Date().toISOString(),assets},null,2));
const snapshot=JSON.parse(await fs.readFile('../vector-pni-pre-5.2/SOURCE-MANIFEST.json','utf8')),modified=[];
for(const row of snapshot.files){const b=await fs.readFile(row.file).catch(()=>null);if(!b||hash(b)!==row.sha256)modified.push(row.file);}
const preserved=['src.jsx','viewer-presentation.js','reference-detail.js','ultra-detail.js','engineering-detail.js','viewer-instancing.js','viewer-preview.js','engineering-catalog.js','.github/workflows/pages.yml'];for(const file of preserved)if(modified.includes(file))throw Error('Protected source unexpectedly changed: '+file);
const beforeCSS=await fs.readFile('../vector-pni-pre-5.2/style.css','utf8'),afterCSS=await fs.readFile('style.css','utf8');if(beforeCSS.slice(beforeCSS.indexOf(':root'))!==afterCSS.slice(afterCSS.indexOf(':root')))throw Error('Design CSS changed');
const zipHash=hash(await fs.readFile(root+'/Vector-PNI-source-before-5.2.zip'));
const buildTable=assets.filter(a=>/\.(js|css)$/.test(a.file)).map(a=>`| ${a.file} | ${a.bytes} | ${a.gzip} |`).join('\n');
const sectionTables=ids.map(id=>`## ${names[id]}\n\n| Подузел | Реализовано в 5.1 | Уточнено в 5.2 | Что остаётся условным / отсутствует | Нужные данные |\n|---|---|---|---|---|\n${entries.filter(e=>e.part===id).map(e=>`| ${e.label} | ${e.before} | ${e.refined} | ${e.remaining} | ${e.required} |`).join('\n')}\n`).join('\n');
const report=`# Vector PNI 5.2 — уточнение геометрии и проверка полностью раскрытых узлов

Дата: 31.10.2026. Основа — сохранённая локальная 5.1, Git HEAD ${snapshot.gitHead}. Публикация и коммит не выполнялись.

## Результат

Проверены 15 моделируемых основных узлов и все 52 раздела. В интерфейсе остаются 16 основных карточек: зарядное устройство внешнее, его неизвестная внутренняя конструкция не добавлялась. Вместо ${oldPieces} учётных геометрических элементов теперь ${pieces}: добавлены ${pieces-oldPieces} элементов существующих обойм, остальные улучшения перерабатывают имеющиеся поверхности. Это счётчик вызовов построения, а не число заводских деталей и не показатель инженерной полноты.

Исправлены сплошные «разъёмные» обоймы, вторжение крепёжных ушей в отверстие луча, отсутствие нижних ответных ушей, зазоры новых стоек/шайб у плат и ошибочная принадлежность верхнего обода/опоры спиц двигателя валу. Добавлены явно условные дорожки подшипников; разделители согласованы с кольцами. У круглых новых втулок и головок исправлены боковые нормали; шестигранные грани сохранены. Детализация окружностей увеличена там, где макроснимки показывали квадратные отверстия или заметные многоугольники. Цвета, PBR-параметры, свет и основные пропорции не менялись.

Совместимые поверхности объединены только внутри одного листа и одного родителя. Инстансы и самостоятельно анимируемые ветви сохранены. Индексация переиспользует вершины с побитово одинаковыми координатами, нормалями и UV: без округления и сглаживания швов. Построение и кэш кратковременны; в requestAnimationFrame новые геометрии не создаются. 173 пары GPU-изображений до/после индексации полностью совпали. Сохранённые 5.1/5.2 сравниваются в одинаковых ракурсах и масштабе отдельно от этой проверки.

## Измеренные показатели

Изолированный нагрузочный атлас содержит по одному представителю каждого из 15 узлов, включая мотор, винт и ESC, а не четыре физических двигателя. В продукте изучается один внутренний узел за раз. Разрешение буфера 1000×900, DPR 1, исходные материалы/свет. GPU: ${current.renderer}; логических потоков браузер сообщает ${current.hardwareConcurrency}. Браузер: ${verified.browserVersion}. CPU ×4 — CDP-эмуляция, GPU не замедляется.

| Показатель | 5.1 | 5.2 |
|---|---:|---:|
| Draw calls всех раскрытых узлов | ${baseline.calls} | ${current.calls} |
| Треугольники этих узлов | ${baseline.triangles} | ${current.triangles} |
| Массивы данных геометрии CPU, байт | ${baseline.cpuGeometryBytes} | ${current.cpuGeometryBytes} |
| Геометрии / текстуры WebGL атласа | ${baseline.gpuResources.geometries} / ${baseline.gpuResources.textures} | ${current.gpuResources.geometries} / ${current.gpuResources.textures} |
| Heap после GC, отдельный CPU ×4 прогон, байт | ${old.profiles.find(p=>p.cpuRate===4).loadedHeapBytes} | ${after.profiles.find(p=>p.cpuRate===4).loadedHeapBytes} |

Draw calls снижены на ${f((1-current.calls/baseline.calls)*100)}%, данные геометрии CPU — на ${f((1-current.cpuGeometryBytes/baseline.cpuGeometryBytes)*100)}%. Треугольников больше на ${f((current.triangles/baseline.triangles-1)*100)}%: это уточнённые круглые поверхности, половины обойм и дорожки, не добавление неизвестных устройств. До индексации промежуточная 5.2 занимала 15 056 220 байт массивов, после — ${current.cpuGeometryBytes}. Это не замер всей RAM процесса или VRAM драйвера. JS heap и WebGL.info счётчики приведены отдельно.

FPS ниже — объединение двух окон ABBA для каждой версии, p95/p99 рассчитаны по исходным интервалам кадров. Каждое окно содержит минимум 1,8 с и 60 кадров после 400 мс прогрева. Одновременно жив только один нагрузочный атлас. Каждый кадр проверяется на потерю WebGL; в конце окна проверяются реальные непустые пиксели и ошибки GL. Частота экрана ограничивает максимальный FPS. Результаты конкретной среды не являются обещанием скорости телефона.

| CPU | Режим | FPS 5.1 → 5.2 | p95 кадра, мс | p99 кадра, мс | p95 CPU render, мс |
|---|---|---:|---:|---:|---:|
${perfTable}

| Основная сцена | Время до ready, мс (медиана двух запусков) | FPS вращения | Draw calls | Треугольники |
|---|---:|---:|---:|---:|
${mainTable}

Время ready включает холодную загрузку страницы и первый кадр, зависит от сети и шейдерного прогрева. Главный экран не загружает внутренний модуль до открытия изучения конструкции.

| Узел | Учётные новые элементы 5.1 → 5.2 | Draw calls | Треугольники | FPS одного раскрытого узла CPU ×1 / ×4 |
|---|---:|---:|---:|---:|
${nodeTable}

## Проверки и ограничения измерений

- 62 unit-теста: геометрия/нормали, реальные отверстия, зазоры, соединение плат, движение обода, точность индексации, материалы, исходные функции и освобождение ресурсов.
- Chromium: ${chrome.results.length} сценариев заключительного прогона, плюс ${verified.results.length} сценариев с усиленными проверками GPU. Все принятые сценарии прошли.
- Firefox ${firefox.browserVersion}: ${firefox.results.length} заключительных сценариев прошли, включая все разделы, иерархию, приближение, восстановление WebGL, шрифт и сетевую неисправность.
- Выбраны все ${hierarchy.rows.reduce((n,r)=>n+r.sections,0)} раздела и ${hierarchy.rows.reduce((n,r)=>n+r.leaves,0)} доступных листьев в обоих конечных состояниях. Для каждого раздела проверены лучи выбора; для каждого узла — 120 конфликтующих обновлений с точным возвратом матриц и инстансов.
- Стресс: ${stress.cycles} циклов при CPU ×4, ${f(chrome.results.find(r=>r.filename.endsWith('viewer.detail50-resilience.js')).durationMs/1000)} с. Открытие/закрытие, разборка, смена компонента, вращение, масштабирование, размеры окна и три принудительных потери/восстановления внутреннего контекста. После закрытия: ${stress.final.livingRenderers} живой renderer, ${stress.final.canvases} canvas, ${stress.final.pending} ожидающих RAF; GPU-ресурсы основной сцены ${stress.final.mainMemory.geometries}/${stress.final.mainMemory.textures}. Это не часовой тест.
- Отдельно: 45 последовательных раскрытий всех 15 узлов, контроль heap после GC и неизменных регистраций основной сцены. После удаления атласа ${after.profiles[0].afterDisposal.geometries} геометрий и ${after.profiles[0].afterDisposal.textures} текстура окружения до её отдельного удаления.
- Размеры: 320, 375, 390, 430, 768, 1024 и 1440 px, горизонтальный 844×390; эмуляция DPR 2 и настоящие синтетические touch/pinch-события Chromium. Физические смартфоны не проверялись.

При первоначальном двойном атласе произошла потеря WebGL-контекста: последующие «144 FPS» были таймингами цикла без подтверждённой отрисовки. Эти результаты отклонены. Профилировщик исправлен: последовательные контексты, минимальное число кадров, контроль context loss, alpha-пикселей и GL errors. Данные прежних попыток сохранены в performance-acceptance.json и indexing-proof.json, их парные FPS не используются в таблице выше. Причину GPU-сброса на уровне драйвера без системной диагностики установить нельзя.

Исторический Firefox-тайм-аут загрузки 5.1 не имеет достаточного журнала для доказательства причины. Намеренная задержка Google Fonts CSS воспроизвела блокировку load и запуска 3D в старой версии. Точные прежние WOFF2 Manrope теперь локальны, лицензия OFL включена; этот воспроизводимый сценарий проходит. Журнал HTTP, ошибок страницы и предупреждений WebGL добавлен в runner. Расхождение раннего теста шрифта оказалось измерением до загрузки кириллицы всех начертаний: после явного ожидания метрики одинаковы, изменения дизайна для обхода не вносились. В одном промежуточном Firefox-запуске canvas не открылся вовремя; причина не доказана, повторные прогоны фиксированной сборки прошли.

WebKit: ${webkit.available?(webkit.passed?'запущен, проверка прошла':'запущен, проверка не прошла'):'фактическая попытка запуска завершилась отсутствием исполняемого файла Playwright; тесты не выполнялись'}. Подробности в webkit-status.json и webkit-attempt.txt. Safari/iOS, Android на физическом устройстве, GPU frame time и память драйвера не измерены. Автоматический анализ нормалей/вырожденных треугольников и локальные проверки зазоров не заменяют CAD-проверку всех пересечений или механический расчёт.

## Сравнительная галерея

[Открыть галерею 5.1 / 5.2](qa-artifacts/detail52/index.html): 15 основных узлов в двух состояниях, 104 пары разделов (52 × собрано/разобрано), 69 пар внутренних макроснимков и две пары атласов. Одинаковые камеры и source-ориентиры проверены автоматически; для повторяющихся креплений часть макроснимков показывает одного представителя. Полный комплект остаётся в паре раздела. Все изображения получены WebGL, без дорисовки. Хеши — images.json.

## Полнота геометрии и недостающие исходные данные

Ни один узел не назван заводски точной CAD-сборкой. Набор интерфейсов Pi 4 и справочного H743-SLIM подтверждает состав интерфейсов, но не ревизию и размещение на AF-18. Общие механические принципы подшипника и камеры не подтверждают конкретный мотор/оптическую схему. Внутренняя батарея, RF-тракты, схемы преобразователей, реальные соединения и посадочные допуски остаются условными там, где нет данных. Пустые неизвестные схемы не заменены выдуманными микросхемами или номиналами.

Использованы исходный код/таблица/изображения проекта и справочные материалы прежней 5.1: [H743-SLIM-V4](https://www.mateksys.com/?portfolio=h743-slim-v4), [чертёж Raspberry Pi 4](https://datasheets.raspberrypi.com/rpi4/raspberry-pi-4-mechanical-drawing.pdf), [описание интерфейсов Pi 4](https://datasheets.raspberrypi.com/rpi4/raspberry-pi-4-datasheet.pdf). Это не заводская документация AF-18; новые точные размеры из иллюстраций не выводились.

${sectionTables}

## Сборка, файлы и откат

Production: npm run build:pages проходит; статические пути и хешированные локальные шрифты проверены через preview. Конфигурация GitHub Pages не менялась, Actions публикации не запускались. Предупреждение Vite о главном чанке >500 kB остаётся; отдельный код внутреннего просмотра загружается отложенно. Новых зависимостей нет.

| Файл production | Байт | Gzip, байт |
|---|---:|---:|
${buildTable}

Изменённые ранее существовавшие файлы относительно сохранённой 5.1: ${modified.map(s=>'`'+s+'`').join(', ')}. Новые рабочие модули: engineering-batches.js, engineering-indexing.js; новые WOFF2/лицензии/README в assets/fonts и public/fonts; tests/refinement52.test.mjs, tests/viewer.detail52*.js, bench/detail52-ledger.mjs и bench/create-detail52-report.mjs. Исходная сцена, материалы/освещение, каталог, preview и Pages workflow из проверенного списка имеют прежние SHA256. Тело CSS после :root совпадает побайтно.

Браузерный runner использует Playwright из родительской рабочей папки; этот пакет не добавлен в production-зависимости. Для повторения сравнений нужны preview основной сборки на 5175 и сохранённой 5.1 на 5180; тест побитового сравнения индексации использует также сохранённую промежуточную сборку на 5182. Обычные unit-тесты и production-сборка запускаются через npm test и npm run build:pages без этих серверов.

Снимок исходной 5.1: C:/Sites/MyWebsite/vector-pni-pre-5.2, ${snapshot.files.length} файлов и SHA256-манифест. ZIP: qa-artifacts/detail52/Vector-PNI-source-before-5.2.zip, SHA256 ${zipHash}. Прежние резервные версии не удалены. Изменения оставлены в рабочем дереве для просмотра.

Перед выпуском нужна ручная проверка реальных iOS/Android, особенно продолжительного GPU-нагруза. Для инженерной точности нужны перечисленные CAD/BOM/фото/схемы. Состояние готово к дальнейшей проверке и последующей разрешённой публикации; публикация в рамках этой работы не выполнялась.
`;
await fs.writeFile('FULL-DETAIL-5.2.md',report);await fs.writeFile(root+'/FULL-DETAIL-5.2.md',report.replaceAll('qa-artifacts/detail52/',''));
const pair=(a,b,label)=>`<h4>${esc(label)}</h4><div class="pair">${[[a,'5.1'],[b,'5.2']].map(([src,title])=>`<figure><figcaption>${title}</figcaption><a href="${src}"><img loading="lazy" width="1000" height="900" src="${src}"></a></figure>`).join('')}</div>`;
const html=`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AF-18 — сравнение 5.1 / 5.2</title><style>body{margin:24px;background:#edf1ef;color:#244333;font:15px/1.55 system-ui}article{background:white;padding:20px;margin:24px 0;border-radius:12px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0}img{display:block;width:100%;height:auto}a{color:inherit}p{max-width:1050px}.note{padding:16px;background:#fff}h1{font-size:28px}h2{font-size:23px}@media(max-width:700px){.pair{grid-template-columns:1fr}body{margin:12px}}</style><h1>AF-18 — уточнение геометрии 5.2</h1><p class="note">${pieces} учётных геометрических элементов; 15 моделируемых узлов / 52 раздела. Это визуальная реконструкция, без заявления заводской CAD-точности. Материалы, свет и основной дизайн сохранены. Клик по изображению открывает исходный WebGL-кадр 1000×900.</p><nav>${ids.map(id=>`<a href="#${id}">${esc(names[id])}</a>`).join(' · ')}</nav>${ids.map(id=>`<article id="${id}"><h2>${esc(names[id])}</h2>${pair('before/'+id+'-assembled.png','after/'+id+'-assembled.png','Общий вид: собрано')}${pair('before/'+id+'-opened.png','after/'+id+'-opened.png','Общий вид: разобрано')}${entries.filter(e=>e.part===id).map(e=>`<section><h3>${esc(e.label)}</h3>${pair('sections-before/'+id+'-'+e.id+'-assembled.png','sections-after/'+id+'-'+e.id+'-assembled.png','Собранный подузел')}${pair('sections-before/'+id+'-'+e.id+'-opened.png','sections-after/'+id+'-'+e.id+'-opened.png','Раскрытый подузел')}<p><b>Что уточнено:</b> ${esc(e.refined)}</p><p><b>Условно / отсутствует:</b> ${esc(e.remaining)}</p><p><b>Нужны:</b> ${esc(e.required)}</p></section>`).join('')}<h3>Внутренние детали крупно</h3>${gallery.macros.filter(m=>m.part===id).map(m=>`<section>${pair('macros-before/'+m.file,'macros-after/'+m.file,m.label)}<p>${esc(m.description)}${m.representative?' Показан один повторяющийся элемент; полный комплект виден в паре раздела.':''}</p></section>`).join('')}</article>`).join('')}<article><h2>Все 15 узлов загружены</h2>${pair('before/atlas-assembled.png','after/atlas-assembled.png','Собрано')}${pair('before/atlas-opened.png','after/atlas-opened.png','Полностью раскрыто')}<p>Изолированный синтетический атлас, по одному представителю каждого типа узла. Штатный интерфейс изучает один узел.</p></article></html>`;
await fs.writeFile(root+'/index.html',html);await fs.writeFile(root+'/ledger.json',JSON.stringify(entries,null,2));await fs.writeFile(root+'/gallery.json',JSON.stringify(gallery,null,2));
const featured=[['Обойма луча','frame-arms--saddles51.png'],['Подшипниковый узел','motors-shaft--rolling51.png'],['Оптический канал','camera-optics--barrel51.png'],['Обод вентилятора','cooling-fan--hub51.png']];
await fs.writeFile(root+'/featured.html','<!doctype html><html lang="ru"><meta charset="utf-8"><style>body{margin:16px;background:#edf1ef;color:#244333;font:15px/1.4 system-ui}main{display:grid;grid-template-columns:1fr 1fr;gap:12px}article{background:white;padding:10px;border-radius:8px}h1{font-size:22px;margin:0 0 12px}h2{font-size:15px;margin:0 0 6px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:6px}figure{margin:0}figcaption{font-size:12px}img{width:100%;height:auto;display:block}</style><h1>AF-18 — 5.1 / 5.2</h1><main>'+featured.map(([label,file])=>'<article><h2>'+label+'</h2><div class="pair">'+['before','after'].map((version,i)=>'<figure><figcaption>'+['5.1','5.2'][i]+'</figcaption><img width="1000" height="900" src="macros-'+version+'/'+file+'"></figure>').join('')+'</div></article>').join('')+'</main></html>');
const expected=[];for(const version of ['before','after']){for(const id of ids)for(const state of ['assembled','opened'])expected.push(version+'/'+id+'-'+state+'.png');for(const state of ['assembled','opened'])expected.push(version+'/atlas-'+state+'.png');for(const c of gallery.comparisons)expected.push('sections-'+version+'/'+c.part+'-'+c.section+'-'+(c.opened?'opened':'assembled')+'.png');for(const m of gallery.macros)expected.push('macros-'+version+'/'+m.file);}
const images=[];for(const file of expected)images.push({file,sha256:hash(await fs.readFile(root+'/'+file))});if(images.length!==410)throw Error('Incomplete gallery');await fs.writeFile(root+'/images.json',JSON.stringify(images,null,2));
await fs.writeFile(root+'/summary.json',JSON.stringify({createdAt:new Date().toISOString(),pieces,baseline,current,perf,modified,preserved,sourceZIP:zipHash,images:images.length},null,2));
for(const name of ['chrome-final','firefox-final','verified-profile','indexing-proof','ledger','images','build','summary'])await fs.copyFile(root+'/'+name+'.json','bench/results/detail52-'+name+'.json');
console.log(JSON.stringify({report:'FULL-DETAIL-5.2.md',gallery:root+'/index.html',images:images.length,sections:entries.length,pieces}));
