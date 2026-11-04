import React,{useEffect,useRef} from 'react';
import {X,ChevronRight,Box} from 'lucide-react';
import {parts} from './component-data.js';
import {knowledge} from './knowledge.js';
import {engineeringCatalog,reconstructionNotice} from './engineering-catalog.js';
import {landmarks} from './fallback-landmarks.js';
const asset=path=>`${import.meta.env.BASE_URL}fallback/${path}`;

export function FallbackView({selected,onSelect,pending,onExplore,onRetry}){
  return <section className="fallback-view" aria-label="AF-18: просмотр по изображению">
    <figure className="fallback-figure">
      <div className="fallback-image-map">
        <img src={asset('af18-overview.webp')} width="1600" height="1000" alt="AF-18: снимок существующей 3D-модели с карбоновой рамой, четырьмя двигателями и пропеллерами, аккумулятором и нижней камерой" fetchPriority="high"/>
        {landmarks.map(point=>{const index=parts.findIndex(p=>p.id===point.id),part=parts[index];return <button key={point.id} className={'component-point'+(point.compact?' compact-point':'')} style={{left:`${point.x*100}%`,top:`${point.y*100}%`}} aria-label={`${index+1}. ${part.name}`} aria-pressed={selected===point.id} title={part.name} onClick={()=>onSelect(point.id)}>{String(index+1).padStart(2,'0')}</button>;})}
      </div>
      <figcaption>Снимок модели AF-18 · точки открывают описание. Все 16 компонентов, включая скрытые узлы и внешнее оборудование, доступны в списке.</figcaption>
    </figure>
    <div className="fallback-message">
      <p role="status">{pending?'Подготовка 3D-модели… Пока можно изучить компоненты на изображении.':'3D-просмотр сейчас недоступен. Вы можете изучить дрон на изображении и открыть описание каждой детали.'}</p>
      <div className="fallback-actions"><button className="primary-action" onClick={onExplore}><Box size={16}/>Посмотреть компоненты</button><button onClick={onRetry} disabled={pending}>{pending?'Запуск 3D…':'Повторить запуск 3D'}</button></div>
    </div>
  </section>;
}

export function ComponentExplorer({onSelect,onClose,wide}){
  const panel=useRef(),close=useRef();
  useEffect(()=>{
    close.current?.focus();
    const key=e=>{
      if(e.key==='Escape'){e.preventDefault();onClose();}
      if(e.key==='Tab'&&!wide){const buttons=[...panel.current.querySelectorAll('button')],first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
    };
    window.addEventListener('keydown',key);
    const old=document.body.style.overflow;if(!wide)document.body.style.overflow='hidden';
    return()=>{window.removeEventListener('keydown',key);document.body.style.overflow=old;};
  },[wide]);
  return <div className="explorer-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}><section className="component-explorer" ref={panel} role="dialog" aria-modal={wide?undefined:true} aria-labelledby="explorer-title">
    <div className="explorer-heading"><div><span>AF–18 / СОСТАВ КОНСТРУКЦИИ</span><h2 id="explorer-title">Компоненты</h2><p>16 компонентов · описание, устройство и источники</p></div><button ref={close} className="explorer-close" aria-label="Закрыть список компонентов" onClick={onClose}><X size={20}/></button></div>
    <ol className="component-list">{parts.map((part,i)=><li key={part.id}><button onClick={()=>onSelect(part.id)}><span className="component-list-number">{String(i+1).padStart(2,'0')}</span><span><b>{part.name}</b><small>{knowledge[part.id].summary}</small>{part.id==='charger'&&<em>Внешнее оборудование</em>}</span><ChevronRight size={16}/></button></li>)}</ol>
  </section></div>;
}

export function StaticPartPreview({id}){
  const catalog=engineeringCatalog[id];
  return <div className="static-part-study">
    {id!=='charger'?<img className="static-part-image" src={asset(`parts/${id}.webp`)} width="600" height="480" alt={`Снимок компонента: ${parts.find(p=>p.id===id).name}`} loading="lazy"/>:<p className="detail-notice">Внешнее оборудование: на дроне не установлено. Изображение неизвестной модели не добавлено.</p>}
    {catalog.sections.length>0&&<details className="static-internals"><summary>Изучить устройство узла <span>· {catalog.sections.length}</span></summary><p>{reconstructionNotice}</p><p><b>По исходным материалам:</b> {catalog.known}</p>{catalog.sections.map(section=><details key={section.id} className="static-section"><summary>{section.label}</summary><p>{section.purpose}</p><dl><div><dt>Геометрия модели</dt><dd>{section.geometry}</dd></div><div><dt>Материал</dt><dd>{section.material}</dd></div><div><dt>Соединение</dt><dd>{section.attachment}</dd></div></dl><p>{section.status}</p></details>)}<p><b>Не подтверждено:</b> {catalog.unknown}</p></details>}
  </div>;
}
