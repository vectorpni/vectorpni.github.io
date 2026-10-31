import * as THREE from 'three';
import {createPreviewPart} from './viewer-preview.js';
import {createDetailBuilder,createEngineeringMaterials} from './detail-primitives.js';
import {engineeringCatalog} from './engineering-catalog.js';
import {disposeSceneResources} from './viewer-resources.js';
import {springTo} from './viewer-motion.js';
import {createWindingLoopGeometry} from './winding-geometry.js';
import {getPartSourceMeshes} from './viewer-instancing.js';
import {createGullwingLeadGeometry} from './lead-geometry.js';
import {addInteriorGeometry} from './engineering-interiors.js';
import {compactStudyMeshes} from './engineering-batches.js';
import {indexStudyGeometry} from './engineering-indexing.js';

// This module is fetched only when the visitor opens a node's construction.
// All exterior geometry is borrowed through renderer-private GPU wrappers.
function classify(id,o) {
  if(o.userData.detailSection)return o.userData.detailSection;
  const {x,y,z}=o.position,type=o.geometry.type,color=o.material.color.getHexString();
  if(id==='frame')return type==='ExtrudeGeometry'?'plates':y<0||y<.13&&Math.abs(x)>.6&&Math.abs(x)<.7&&Math.abs(z)>.54&&Math.abs(z)<.73?'landing':Math.abs(x)>1||Math.abs(z)>1?'arms':'mounts';
  if(id==='motors'){
    const p=o.geometry.parameters;
    // An origin on the motor axis does not make the whole rotor rim a shaft.
    // The reference builder joins this upper rim and hub to the bell spokes.
    if(type==='TorusGeometry'&&p.radius>.12&&y>.67||type==='CylinderGeometry'&&Math.abs(p.radiusTop-.074)<1e-8&&Math.abs(p.height-.09)<1e-8)return 'shell';
    return ['ad6b3c','a96e38'].includes(color)?'stator':Math.abs(x-2.08)<.075&&Math.abs(z-2.08)<.075&&y>.67?'shaft':y<.515?'base':'shell';
  }
  if(id==='props')return o.geometry.userData.airfoil||type==='BufferGeometry'&&y===0?'blades':'hub';
  if(id==='battery')return o.name==='battery exterior 5.0'?(color==='202321'?'connector':'straps'):type==='ExtrudeGeometry'||type==='TubeGeometry'||x>.56||x<-.55?'straps':x<-.52?'connector':'shell';
  if(id==='camera')return type==='TubeGeometry'?'housing':Math.abs(x)>.29||y>-1.1?'mounts':z>=.475?'optics':'housing';
  if(id==='cooling')return type==='TubeGeometry'?'fan':type==='CylinderGeometry'&&z>.8?(o.geometry.parameters.radiusTop<.03?'housing':'fan'):type==='RoundedBoxGeometry'&&Math.abs(y+.325)<.001?'housing':y>-.43?'heatsink':'housing';
  if(id==='gps')return y<1.82?'mounts':'housing';
  if(id==='radio')return y>1.0||type==='TubeGeometry'?'connector':['234a37','264b38'].includes(color)?'board':'housing';
  if(id==='wiring')return type==='TubeGeometry'||type==='CylinderGeometry'&&o.geometry.parameters.radiusTop<=.022&&o.geometry.parameters.height>.2?'loom':type==='RoundedBoxGeometry'&&(o.geometry.parameters.width===.18&&o.geometry.parameters.height===.25||o.geometry.parameters.width===.13&&o.geometry.parameters.height===.1)?'mounts':'connector';
  const boardY={fc:.32,pi:-.38,power:.23,becpi:.33,becfc:.33,esc:.46}[id];
  if(id==='pi'&&(type==='CylinderGeometry'&&o.geometry.parameters.radiusTop===.009&&o.geometry.parameters.height===.16||type==='RoundedBoxGeometry'&&o.geometry.parameters.width===.035&&Math.abs(z+.48)<.001))return 'connector';
  if(id==='becfc'&&type==='RoundedBoxGeometry'&&Math.abs(y-.33)<.001)return 'cover';
  if(type==='TubeGeometry'||(id==='pi'&&Math.abs(x)>.38&&y>-.3))return 'connector';
  if(type==='TorusGeometry'||type==='CylinderGeometry'&&Math.abs(y-boardY)>.07)return 'cover';
  if(['264b38','234a37'].includes(color))return 'board';
  if(id==='esc'&&(y>.54||o.geometry.type==='RoundedBoxGeometry'&&Math.abs(y-.46)<.001))return 'cover';
  return 'devices';
}

export function createEngineeringAssembly(group) {
  const id=group.userData.part,catalog=engineeringCatalog[id];
  if(!catalog?.sections.length)throw Error('No documented model geometry for '+id);
  const gpsHousing=id==='gps'?getPartSourceMeshes(group).find(o=>o.geometry.type==='CylinderGeometry'&&Math.abs(o.position.y-1.84)<.001):null;
  const preview=createPreviewPart(group,{classify:o=>classify(id,o),leafFor:o=>id==='gps'&&o.position.y>=1.895?{id:'lid',label:'Крышка и её крепёж'}:null,include:o=>(o!==gpsHousing)&&(id!=='motors'||(!['ad6b3c','a96e38'].includes(o.material.color.getHexString())&&!(o.geometry.type==='CylinderGeometry'&&Math.abs(o.position.y-.48)<1e-6&&o.geometry.parameters.height===.28)))});
  const {object,sections}=preview,materials=createEngineeringMaterials(),b=createDetailBuilder(),nodes=[],added=[];
  const privateGeometries=new Set();
  if(id==='becfc')for(const [key,delta]of [['board',-.041],['devices',-.041],['connector',-.0485]])for(const child of sections.get(key)?.children||[]){if(child.isInstancedMesh){for(let i=0;i<child.count;i++)child.instanceMatrix.array[i*16+13]+=delta;child.instanceMatrix.needsUpdate=true;child.computeBoundingBox();child.computeBoundingSphere();}else{child.position.y+=delta;child.updateMatrix();}}
  if(id==='pi'){
    let lead;const matrix=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),scale=new THREE.Vector3();
    object.traverse(o=>{if(!o.isMesh)return;o.geometry.computeBoundingBox();const size=o.geometry.boundingBox.getSize(new THREE.Vector3()),chip=Math.abs(size.x-.34)<1e-5&&Math.abs(size.z-.34)<1e-5||Math.abs(size.x-.11)<1e-5&&Math.abs(size.z-.16)<1e-5,isLead=Math.abs(size.x-.009)<1e-5&&Math.abs(size.y-.02)<1e-5&&Math.abs(size.z-.05)<1e-5;if(!chip&&!isLead)return;
      if(isLead){if(!lead){lead=createGullwingLeadGeometry(.009,.023);privateGeometries.add(lead);}o.geometry=lead;}
      for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){if(o.isInstancedMesh)o.getMatrixAt(i,matrix);else{o.updateMatrix();matrix.copy(o.matrix);}matrix.decompose(p,q,scale);p.y=isLead?-.33:-.33+size.y/2;if(isLead)q.setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI);matrix.compose(p,q,scale);if(o.isInstancedMesh)o.setMatrixAt(i,matrix);else{matrix.decompose(o.position,o.quaternion,o.scale);o.updateMatrix();}}
      if(o.isInstancedMesh){o.instanceMatrix.needsUpdate=true;o.computeBoundingBox();o.computeBoundingSphere();}
    });
  }
  for(const row of catalog.sections) {
    if(!sections.has(row.id)){const section=new THREE.Group();section.name=row.id;section.userData={part:id,section:row.id};object.add(section);sections.set(row.id,section);}
    const section=sections.get(row.id);section.name=row.label;
    const outer=new THREE.Group();outer.name='Внешние детали';outer.userData={part:id,section:row.id,leaf:row.id+'/exterior'};
    for(const child of [...section.children]){if(child.isGroup&&child.userData.leaf){nodes.push({id:child.userData.leaf,section:row.id,label:child.name,description:'Крышка существующего кожуха с исходным крепежом и маркировкой. Геометрия условная; сначала поднимается для освобождения платы.'});continue;}outer.add(child);child.userData={...outer.userData};}
    if(outer.children.length){section.add(outer);nodes.push({id:outer.userData.leaf,section:row.id,label:'Внешние детали',description:'Существующая геометрия модели. Размеры и расположение условны; источник — текущая реконструкция.'});}
  }
  function detail(section,key,label,description) {
    const parent=new THREE.Group();parent.name=label;parent.userData={part:id,section,leaf:section+'/'+key};sections.get(section).add(parent);added.push(parent);
    nodes.push({id:parent.userData.leaf,section,label,description:description+' Визуальная реконструкция; заводские размеры и спецификация не подтверждены.'});return parent;
  }
  if(id==='motors') {
    const cx=2.08,cz=2.08,stator=detail('stator','laminations','Пакет и зубцы статора','Показан принцип неподвижного статора, а не подтверждённое число полюсов.'),coils=detail('stator','windings','Изолированные обмотки','Условные пучки витков на зубцах. Количество витков и схема соединений не воспроизводятся.'),bearing=detail('shaft','bearings','Подшипниковые кольца','Условные наружное и внутреннее кольца; тип и размер подшипника неизвестны.');
    for(let k=0;k<5;k++)b.sleeve(stator,materials.metal,[cx,.53+k*.017,cz],.115,.04,.013);
    const windingGeometry=createWindingLoopGeometry();
    for(let i=0;i<12;i++) {
      const a=i*Math.PI/6,rot=[0,-a,0],x=cx+Math.cos(a)*.137,z=cz+Math.sin(a)*.137;
      b.box(stator,materials.metal,[x,.575,z],[.085,.09,.035],rot);
      // Coil loops surround a radial tooth, with an insulating inner clearance.
      const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(Math.cos(a),0,Math.sin(a))),e=new THREE.Euler().setFromQuaternion(q);
      for(let k=0;k<5;k++)b.add(coils,materials.copper,windingGeometry,[cx+Math.cos(a)*(.123+k*.0105),.575,cz+Math.sin(a)*(.123+k*.0105)],e.toArray().slice(0,3));
    }
    windingGeometry.dispose();
    for(const y of [.5,.69]) {b.sleeve(bearing,materials.metal,[cx,y,cz],.055,.03,.025);b.sleeve(bearing,materials.dark,[cx,y,cz],.046,.035,.027);}
    const base=detail('base','seat','Открытое основание','В учебном разрезе сплошной внутренний цилиндр прежней модели заменён полой посадкой, чтобы он не закрывал статор. Общая модель дрона не изменена.');b.sleeve(base,materials.dark,[cx,.4,cz],.24,.14,.06);
  } else if(id==='gps'||id==='radio') {
    const cx=id==='gps'?-.62:.72,cy=id==='gps'?1.836:.9,cz=id==='gps'?-.78:-.61,w=id==='gps'?.34:.16,d=id==='gps'?.34:.08;
    if(id==='gps'){
      const board=detail('board','substrate','Условный носитель','Расположение платы внутри существующего кожуха показано для изучения компоновки.');b.box(board,materials.pcb,[cx,cy,cz],[w,.018,d]);
      const shell=detail('housing','cup','Полость кожуха','Существующий внешний цилиндр раскрыт в полый кожух с опорной полкой платы. Толщина стенки и полка условны; реальные детали модуля неизвестны.');materials.housing=gpsHousing.material.clone();b.sleeve(shell,materials.housing,[cx,1.84,cz],.28,.255,.1);b.cylinder(shell,materials.housing,[cx,1.7945,cz],.255,.009);b.sleeve(shell,materials.housing,[cx,1.813,cz],.255,.18,.028);
    }
    const devices=detail('board','packages','Обобщённые корпуса','Без указания чипсета и назначения отдельных микросхем.');
    if(id==='gps'){b.box(devices,materials.dark,[cx,cy+.024,cz],[w*.4,.03,d*.4]);for(let i=0;i<6;i++)for(const side of [-1,1])b.box(devices,materials.contact,[cx+(i-2.5)*w*.1,cy+.009,cz+side*d*.4],[w*.045,.008,d*.08]);}
    else {b.box(devices,materials.dark,[cx,cy,cz+.02],[w*.4,.035,.02]);for(let i=0;i<6;i++)for(const side of [-1,1])b.box(devices,materials.contact,[cx+(i-2.5)*w*.1,cy+side*d*.35,cz+.012],[w*.045,.006,.004]);}
  } else if(['fc','power','pi','becpi','becfc','esc'].includes(id)) {
    const [cx,y,cz,w,d]={fc:[0,.37,.2,.6,.6],pi:[0,-.31,.05,1.05,1.25],power:[0,.27,-.28,1.15,.85],becpi:[-.62,.4,-.42,.23,.35],becfc:[.62,.4,-.42,.23,.35],esc:[1.45,.56,1.45,.38,.18]}[id];
    let boardTop={fc:.36,pi:-.33,power:.26,becpi:.39,becfc:.349,esc:.509}[id];
    const hasSubstrate=getPartSourceMeshes(group).some(o=>classify(id,o)==='board'&&o.geometry.type==='RoundedBoxGeometry'&&o.geometry.parameters.height>=.01&&o.geometry.parameters.width>=w*.6&&o.geometry.parameters.depth>=d*.6);
    if(!hasSubstrate){const substrate=detail('board','substrate','Условная плата под оболочкой','Внутренняя плата реконструирована без неподтверждённых дорожек и схемы.');b.box(substrate,materials.pcb,[cx,boardTop-.009,cz],[w,.018,d]);}
    const passives=detail('devices','passives','SMD-корпуса и выводы','Механический вид обобщённых корпусов, без номиналов, маркировки и электрической схемы.');
    for(let i=0;i<8;i++) {
      const x=cx+(i-3.5)*w*.095,z=cz+d*.3;
      b.box(passives,materials.dark,[x,boardTop+.014,z],[w*.045,.028,.038]);
      for(const side of [-1,1])b.box(passives,materials.metal,[x,boardTop+.009,z+side*.025],[w*.047,.018,.012]);
    }
    const contacts=detail('connector','contacts','Контактная колодка','Открытый кожух и отдельные контакты; распиновка не заявляется.');
    b.box(contacts,materials.dark,[cx,boardTop+.0045,cz-d*.43],[w*.6,.009,.1]);
    b.box(contacts,materials.dark,[cx,boardTop+.04,cz-d*.43-.043],[w*.6,.08,.014]);
    for(const side of [-1,1])b.box(contacts,materials.dark,[cx+side*w*.3,boardTop+.04,cz-d*.43],[.014,.08,.1]);
    for(let i=0;i<6;i++)b.cylinder(contacts,materials.contact,[cx+(i-2.5)*w*.09,boardTop+.03,cz-d*.43],.006,.06,undefined,8);
  } else if(id==='camera') {
    const aperture=detail('optics','retainer','Посадка оптического окна','Открытая оправа отделена от наружного стекла. Внутренняя многолинзовая схема неизвестна и не добавлена.');
    b.sleeve(aperture,materials.dark,[0,-1.25,.49],.12,.086,.025,[Math.PI/2,0,0],96);
  } else if(id==='battery') {
    const fastening=detail('straps','keepers','Пряжки и держатели','Ленты связаны с аккумулятором. Реальная конструкция ячеек неизвестна; условная учебная стопка находится в разделе упаковки.');
    for(const z of [-.6,.43])for(const side of [-1,1])b.rod(fastening,materials.metal,[.6,1.08,z+side*.085],[.6,1.18,z+side*.085],.008);
  } else if(id==='frame') {
    const contact=detail('mounts','bushings','Втулки и посадочные кольца','Условные разделительные втулки со сквозной осью.');
    for(const x of [-.77,.77])for(const z of [-.83,.83])b.sleeve(contact,materials.metal,[x,.32,z],.055,.028,.04);
  } else if(id==='props') {
    const seat=detail('hub','bore','Посадочная втулка','Условная осевая втулка. Посадочные размеры производителя неизвестны.');b.sleeve(seat,materials.metal,[2.08,.782,2.08],.055,.028,.018);
  } else if(id==='cooling') {
    const seat=detail('fan','bearing','Опора ступицы','Условная посадочная втулка за существующей ступицей.');b.sleeve(seat,materials.metal,[0,-.65,.823],.075,.032,.024,[Math.PI/2,0,0]);
  } else if(id==='wiring') {
    const plug=detail('connector','contact-sleeves','Контактные гильзы','Условные отдельные гильзы в существующем корпусе разъёма. Не монтажная схема.');for(const dx of [-.035,.035])b.sleeve(plug,materials.contact,[-.56+dx,.735,.5],.017,.01,.026);
  }
  b.finish({instanceRepeated:true,indexed:true,normalizeGeometry:indexStudyGeometry});
  const retired=[];
  const interior=addInteriorGeometry({id,group,object,sections,detail,materials,privateGeometries,retired});
  const borrowed=new Set(getPartSourceMeshes(group).map(o=>o.geometry.attributes.position)),indexed=new Map();
  object.traverse(o=>{if(!o.isMesh||o.geometry.index||borrowed.has(o.geometry.attributes.position))return;const source=o.geometry;if(!indexed.has(source)){const result=indexStudyGeometry(source);indexed.set(source,result);if(result!==source){privateGeometries.delete(source);privateGeometries.add(result);source.dispose();}}o.geometry=indexed.get(source);});
  indexed.clear();
  for(const section of sections.values())for(const child of [...section.children])if(child.isGroup&&!child.children.length)child.removeFromParent();
  // A replaced proxy must disappear from the tree as well as the scene.
  for(let i=nodes.length-1;i>=0;i--){let present=false;object.traverse(o=>{if(o.userData.leaf===nodes[i].id&&o.children?.length)present=true;});if(!present)nodes.splice(i,1);}
  // A selected leaf must not recolour a neighbour using the same source material.
  const leafMaterials=new Map();object.traverse(o=>{if(!o.isMesh)return;const key=o.userData.leaf+':'+o.material.uuid;if(!leafMaterials.has(key))leafMaterials.set(key,o.material.clone());o.material=leafMaterials.get(key);});
  const renderBatches=compactStudyMeshes(object);
  const extraMeshes=[...retired,...renderBatches.created];for(const parent of added)parent.traverse(o=>{if(o.isMesh)extraMeshes.push(o);});
  const states=[...sections].map(([key,section])=>({key,section,offset:new THREE.Vector3(...catalog.sections.find(s=>s.id===key).offset)}));
  const motion={value:0,velocity:0};let selected=null,isolated=false;
  const instances=new Map();object.traverse(o=>{if(o.isInstancedMesh)instances.set(o.id,{object:o,count:o.count,matrix:o.instanceMatrix.array.slice()});});
  const leafMotion=interior.created.filter(p=>p.userData.openOffset).map(node=>({node,base:node.position.clone(),offset:new THREE.Vector3(...node.userData.openOffset),range:node.userData.openRange||[0,1]}));
  function place(value){for(const {section,offset} of states)section.position.copy(offset).multiplyScalar(value);const smooth=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};if(id==='gps'){const lift=smooth(value*2),out=smooth(value*2-1);sections.get('board').position.set(.52*out,.35*lift,0);const lid=sections.get('housing').children.find(c=>c.userData.leaf==='housing/lid');if(lid)lid.position.y=.45*lift;}if(['fc','pi','power','becpi','becfc','esc'].includes(id)){const stage=smooth(value*3-1);sections.get('board').position.set(0,-.2*stage,0);sections.get('devices').position.set(0,.24*stage,0);sections.get('connector').position.set(0,0,.25*stage);if(id==='becfc')sections.get('cover').position.set(.22*smooth(value*3-1),-.25*smooth(value*3),0);}if(id==='radio'){sections.get('board').position.set(0,0,.30*smooth(value*3-1));sections.get('housing').position.set(.3*smooth(value*3-2),0,0);}if(id==='battery'){sections.get('straps').position.set(0,0,1.5*smooth(value*2));const lift=.3*smooth(value*2-1);sections.get('shell').position.set(0,lift,0);sections.get('connector').position.set(0,lift,0);}for(const {node,base,offset,range}of leafMotion)node.position.copy(base).addScaledVector(offset,smooth((value-range[0])/(range[1]-range[0])));object.updateMatrixWorld(true);}
  place(0);const bounds=new THREE.Box3().setFromObject(object);place(1);bounds.union(new THREE.Box3().setFromObject(object));const sphere=bounds.getBoundingSphere(new THREE.Sphere());place(0);
  // Centre both endpoints together: fitting once prevents camera jumps on reversal.
  const center=sphere.center.clone();object.position.sub(center);sphere.center.set(0,0,0);
  // Geometry and most leaf transforms are immutable. Avoid recomposing hundreds
  // of local matrices during orbiting; keep only the real animation owners live.
  const animated=new Set([object,...states.map(s=>s.section),...leafMotion.map(s=>s.node)]);
  if(id==='gps'){const lid=sections.get('housing').children.find(c=>c.userData.leaf==='housing/lid');if(lid)animated.add(lid);}
  object.traverse(o=>{if(!animated.has(o)){o.updateMatrix();o.matrixAutoUpdate=false;}});
  const nodeFor=o=>{let p=o;while(p&&p!==object){if(p.userData.leaf)return p.userData.leaf;p=p.parent;}return null;};
  const parse=key=>{const [leaf,element]=key?.split('@')||[],[meshId,index]=element?.split(':').map(Number)||[],instance=instances.get(meshId);return {leaf,instance:instance&&Number.isInteger(index)&&index>=0&&index<instance.count?instance:null,index};};
  function select(key,only=false) {
    selected=key;isolated=only;
    const chosen=parse(key);
    for(const entry of instances.values()){entry.object.count=entry.count;entry.object.instanceMatrix.array.set(entry.matrix);entry.object.instanceMatrix.needsUpdate=true;if(entry.object.instanceColor){entry.object.instanceColor.array.fill(1);entry.object.instanceColor.needsUpdate=true;}}
    const inLeaf=o=>{while(o&&o!==object){if(o.userData.leaf===chosen.leaf)return true;o=o.parent;}return false;};
    object.traverse(o=>{if(!o.isMesh)return;const section=o.userData.section||o.parent.userData.section,match=key===section||(inLeaf(o)&&(!chosen.instance||chosen.instance.object===o));const material=o.material;
      material.emissive?.set(match?'#46715a':'#000000');material.emissiveIntensity=match&&!chosen.instance?.22:0;
    });
    for(const {key:sectionId,section}of states){
      const visit=(o,inherited=false)=>{const match=inherited||key===sectionId||chosen.leaf===o.userData.leaf;let childMatch=false;for(const c of o.children)childMatch=visit(c,match)||childMatch;const own=o.isMesh?(chosen.instance?o===chosen.instance.object:match):match;const visible=own||childMatch;o.visible=!only||!key||visible;return visible;};visit(section);
    }
    if(chosen.instance){const o=chosen.instance.object;if(only){o.instanceMatrix.array.copyWithin(0,chosen.index*16,chosen.index*16+16);o.instanceMatrix.needsUpdate=true;o.count=1;}else{const hadColor=!!o.instanceColor;o.setColorAt(chosen.index,new THREE.Color('#88b195'));o.instanceColor.needsUpdate=true;if(!hadColor)o.material.needsUpdate=true;}}
  }
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),hits=[];
  function pick(x,y,camera){pointer.set(x,y);raycaster.setFromCamera(pointer,camera);hits.length=0;raycaster.intersectObject(object,true,hits);const hit=hits.find(h=>{let o=h.object;while(o){if(!o.visible)return false;o=o.parent;}return true;});if(!hit)return null;const base=nodeFor(hit.object);if(hit.instanceId!==undefined){const chosen=parse(selected),index=isolated&&chosen.instance?.object===hit.object?chosen.index:hit.instanceId;return base+'@'+hit.object.id+':'+index;}return base;}
  function selectionBounds(){
    const chosen=parse(selected);if(chosen.instance){const node=chosen.instance.object,matrix=new THREE.Matrix4().fromArray(chosen.instance.matrix,chosen.index*16).premultiply(node.matrixWorld);node.geometry.computeBoundingBox();return {node,sphere:node.geometry.boundingBox.clone().applyMatrix4(matrix).getBoundingSphere(new THREE.Sphere())};}
    let node;object.traverse(o=>{if(!node&&(o.userData.leaf===selected||o.userData.section===selected))node=o;});return node?{node,sphere:new THREE.Box3().setFromObject(node).getBoundingSphere(new THREE.Sphere())}:null;
  }
  return {object,sphere,catalog,nodes,select,pick,selectionBounds,detail52:{batchCount:renderBatches.created.length,savedCalls:renderBatches.savedCalls},detail51:{pieces:interior.pieces,replacements:interior.replacements,changed:interior.changed},get selected(){return selected;},get isolated(){return isolated;},get amount(){return motion.value;},
    update(dt,opened,reduced=false){const changed=springTo(motion,opened?1:0,Math.min(dt,.05),12,reduced);if(changed)place(motion.value);return changed;},
    dispose(){renderBatches.dispose();preview.dispose();disposeSceneResources(new THREE.Group(),extraMeshes);privateGeometries.forEach(g=>g.dispose());leafMaterials.forEach(m=>m.dispose());Object.values(materials).forEach(m=>m.dispose());}
  };
}
