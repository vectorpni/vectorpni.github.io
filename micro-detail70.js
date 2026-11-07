import * as T from 'three';
import {createBevelledAnnulusGeometry,createFoldedTabGeometry,createSolderFilletGeometry,createSplitContactGeometry,createMicroPackageGeometry,createContactPostGeometry} from './micro-geometry.js';
import {createSplitCollarHalfGeometry} from './interior-geometry.js';
import {createHollowTubeGeometry} from './frame-tube-geometry.js';

// Refine existing owned geometry only. No additional electrical nets, devices,
// battery interconnects, lens prescription or manufacturer dimensions.
export function addMicroDetail70(ctx){
  const {id,b,m,sections,remove}=ctx,features=[],owners=new Map();let additions=0,replacedMeshes=0;
  const find=key=>{let result;for(const section of sections.values())section.traverse(o=>{if(!result&&o.isGroup&&o.userData.leaf===key)result=o;});return result;};
  const owner=key=>{const p=find(key);if(p&&!owners.has(p))owners.set(p,p.userData.modeledPieces||0);return p;};
  const add=(p,material,g,at,rotation)=>{if(!p)return;b.add(p,material,g,at,rotation);additions++;};
  const box=(p,material,at,size,rotation)=>{if(!p)return;b.box(p,material,at,size,rotation);additions++;};
  const replace=(section,parent,predicate)=>{if(!parent)return;remove(section,o=>{const match=o.parent===parent&&predicate(o);if(match)replacedMeshes++;return match;});};
  const note=(section,text)=>features.push({section,text,conditional:true});
  const ring=(p,material,at,outer,inner,height,rotation)=>{const g=createBevelledAnnulusGeometry(outer,inner,height,32);add(p,material,g,at,rotation);g.dispose();};
  if(id==='frame'){
    const seats=owner('plates/load-seats60');replace('plates',seats,()=>true);
    const g=createBevelledAnnulusGeometry(.043,.019,.006,32);for(const x of [-.87,.87])for(const z of [-.9,-.45,0,.45,.9])add(seats,m.metal,g,[x,.620,z]);g.dispose();
    note('plates','Десять прежних опорных шайб заменены открытыми фасонными шайбами с фасками четырёх кромок; оси и опорные плоскости сохранены.');
  }else if(id==='props'){
    note('hub','Четыре прежние полые посадки ступицы получили фаски наружных и внутренних кромок в прежнем габарите. Посадочные плоскости, ось и профиль лопастей сохранены.');
  }else if(id==='motors'){
    note('stator','На двенадцати прежних зубцах сформированы утопленные границы слоёв внутри исходного габарита; все шестьдесят витков и электрическая неопределённость сохранены.');
    note('shaft','Шестнадцать прежних шариков подшипников имеют более плавную геометрию; InstancedMesh, центры и радиусы сохранены. Число шариков остаётся учебным.');
  }else if(id==='cooling'){
    const base=owner('heatsink/base51');replace('heatsink',base,o=>o.material===m.metal);const g=createMicroPackageGeometry(1.04,.012,.87);add(base,m.metal,g,[0,-.416,.05]);g.dispose();
    note('heatsink','Общая подошва радиатора получила кромки; опорная плоскость и существующая термопрокладка сохранены.');
    note('fan','Шесть прежних цилиндрических спиц заменены тонкими криволинейными лопастями с корнями, посаженными в существующую ступицу. Количество, ограждение и материал сохранены, аэродинамические характеристики не заявляются.');
  }else if(id==='battery'){
    const tab=createFoldedTabGeometry();
    for(let i=0;i<6;i++){const p=owner('shell/packet51-'+(i+1));replace('shell',p,o=>o.material===m.contact);for(const x of [-.15,.15])add(p,m.contact,tab,[x,.655+i*.09,.658]);}
    tab.dispose();note('shell','Двенадцать прежних толстых токовыводов заменены тонкими гнутыми язычками внутри прежнего габарита. Они выходят из собственных изоляторов и остаются с пакетом. Стопка и её электрические связи по-прежнему условны.');
    for(const suffix of ['front51','rear51']){
      const p=owner('connector/entry-'+suffix),z=suffix==='front51'?.77:-1.01,sign=Math.sign(z);
      // A seated split compression ring at the existing gland's inboard face.
      const g=createSplitContactGeometry(.043,.034,.006);add(p,m.dark,g,[-.2,.94,z-sign*.027],[Math.PI/2,0,0]);g.dispose();
    }
    note('connector','На внутренних посадках существующих вводов показаны разрезные прижимные кольца; канал не перекрыт, проводка и электрическая схема не добавлены.');
  }else if(id==='camera'){
    const sensor=owner('housing/sensor51');
    // The original two long gold bars falsely joined five unrelated parts.
    // Replace them with separate footprints at the existing package locations.
    replace('housing',sensor,o=>o.material===m.contact);
    replace('housing',sensor,o=>o.material===m.ceramic);
    // Ceramic ends meet the inner edges of the metal caps at ±.005. Extending
    // the body underneath those caps left two coplanar exposed Z faces.
    const fillet=createSolderFilletGeometry(.026,.008,.0035),packageGeometry=createMicroPackageGeometry(.026,.010,.015);
    for(const x of [-.13,.13])for(let i=0;i<5;i++){
      const y=-1.33+i*.04;
      add(sensor,m.ceramic,packageGeometry,[x,y,.311]);
      for(const sign of [-1,1]){
        box(sensor,m.contact,[x,y+sign*.0105,.300],[.032,.008,.002]);
        box(sensor,m.metal,[x,y+sign*.007,.311],[.027,.004,.015]);
        add(sensor,m.metal,fillet,[x,y+sign*.0105,.301],[Math.PI/2,sign<0?Math.PI:0,0]);
      }
    }
    fillet.dispose();packageGeometry.dispose();
    note('housing','Вместо двух сплошных полос под десятью прежними корпусами — двадцать отдельных площадок, контактные окончания и вогнутые галтели пайки. Реальная схема камеры неизвестна; новые цепи не заявляются.');
    const retainer=owner('optics/barrel51');
    // Rear shoulder is within the existing barrel, clear of the moving lens.
    ring(retainer,m.dark,[0,-1.25,.4165],.131,.097,.004,[Math.PI/2,0,0]);
    note('optics','Задняя открытая опорная ступень с фасками примыкает к прежнему кольцу оправы; оптический канал и один учебный элемент сохранены.');
  }else if(id==='gps'){
    const clamp=owner('mounts/clamp51');replace('mounts',clamp,o=>o.material===m.dark);
    for(const upper of [true,false]){const g=createSplitCollarHalfGeometry(.061,.036,.07,upper,.002);add(clamp,m.dark,g,[-.62,1.77,-.78]);g.dispose();}
    note('mounts','Прежняя цельная муфта заменена двумя половинами с реальным разрезом и прежним осевым проходом; поперечный фиксатор сохранён.');
    const packages=owner('board/packages');replace('board',packages,o=>o.material===m.dark);
    const g=createMicroPackageGeometry(.136,.03,.136);add(packages,m.dark,g,[-.62,1.860,-.78]);g.dispose();
    note('board','Прежний условный корпус на GNSS-плате получил скруглённые кромки в исходном габарите; тип чипа и антенны не назначается.');
  }else if(id==='radio'){
    const packages=owner('board/packages');replace('board',packages,o=>o.material===m.dark);
    const g=createMicroPackageGeometry(.064,.035,.02);add(packages,m.dark,g,[.72,.9,-.59]);g.dispose();
    const shield=owner('board/shield51');
    for(const x of [.667,.773])for(const y of [.87,.93]){
      box(shield,m.contact,[x,y,-.5995],[.014,.014,.001]);
      box(shield,m.metal,[x,y,-.5945],[.010,.010,.009]);
    }
    note('board','Прежний корпус радиомодуля получил кромки; под существующими стойками открытой рамки добавлены отдельные опорные контактные площадки. RF-тракт не реконструирован.');
  }else if(id==='wiring'){
    // Only the contact barrels authored in 5.0 and 6.0 are replaced. Retain
    // original exterior, all insulators, floors and local wire endings.
    const front=owner('connector/contact-sleeves'),rear=owner('connector/open-plugs60');
    if(front){replace('connector',front,o=>o.material===m.contact);const g=createSplitContactGeometry();for(const x of [-.595,-.525])add(front,m.contact,g,[x,.735,.5]);g.dispose();}
    // Other rear contact/floor geometry shares a batch: don't delete that batch
    // merely to put slots in a hidden tube. Its existing construction stays.
    if(front||rear)note('connector','У двух передних контактных гильз появился реальный продольный разрез в прежнем габарите; изоляторы, задние посадки и назначения контактов сохранены. Форма пружинного контакта условна.');
  }
  const boards={fc:[0,.36,.2,.6,.6],pi:[0,-.33,.05,1.05,1.25],power:[0,.26,-.28,1.15,.85],becpi:[-.62,.39,-.42,.23,.35],becfc:[.62,.349,-.42,.23,.35],esc:[1.45,.509,1.45,.38,.18]};
  if(boards[id]){
    const [cx,top,cz,w,d]=boards[id],passives=owner('devices/passives'),footprint=owner('board/laminate51');
    replace('devices',passives,()=>true);
    // ESC is shallower than the other carriers. Keep each toe/pad inside the
    // real board edge instead of applying a larger board's footprint blindly.
    const padDepth=Math.min(.024,2*(d*.2-.028)),toeLength=Math.min(.012,2*(d*.2-.033));
    const body=createMicroPackageGeometry(w*.045,.028,.038),solder=createSolderFilletGeometry(w*.047,toeLength,.006);
    for(let i=0;i<8;i++){
      const x=cx+(i-3.5)*w*.095,z=cz+d*.3;
      add(passives,m.dark,body,[x,top+.015,z]);
      for(const sign of [-1,1]){
        box(passives,m.metal,[x,top+.010,z+sign*.025],[w*.047,.018,.012]);
        box(footprint,m.contact,[x,top+.0005,z+sign*.028],[w*.052,.001,padDepth]);
        add(footprint,m.metal,solder,[x,top+.001,z+sign*.033],[0,sign>0?Math.PI:0,0]);
      }
    }
    body.dispose();solder.dispose();
    note('devices','Восемь прежних SMD-корпусов получили кромки и контактные окончания. Площадки и галтели пайки принадлежат плате и остаются на ней при учебном отделении корпусов; новых номиналов и цепей нет.');
    // Existing drilled mount axes, not a new random via or invented routing.
    const mountRadius=id==='pi'?.018:id==='fc'?.022:.010;
    const padGeometry=createHollowTubeGeometry(mountRadius*1.26,.001,32,mountRadius);
    for(const sign of [-1,1])for(const end of [-1,1]){
      const x=cx+sign*w*.42,z=cz+(id==='pi'&&end<0?-.64:end*d*.38);
      // PCB plating is a thin flat annulus, not a machined four-bevel washer.
      // Keep the same 32-sided outline without invisible bevel subdivisions.
      add(footprint,m.contact,padGeometry,[x,top-.0185,z]);
    }
    padGeometry.dispose();
    note('board','К прежним восьми SMD-корпусам добавлены шестнадцать отдельных площадок и галтели пайки, остающиеся на PCB. Четыре прежних монтажных отверстия получили нижние кольцевые площадки с кромками; новые сигнальные переходы не добавлены.');
    const contacts=owner('connector/contacts');
    if(contacts&&id!=='pi'){replace('connector',contacts,o=>o.material===m.contact);const g=createContactPostGeometry(.006,.06);for(let i=0;i<6;i++)add(contacts,m.contact,g,[cx+(i-2.5)*w*.09,top+.03,cz-d*.43]);g.dispose();note('connector','Шесть прежних контактных стоек получили фасонные вершины в прежних габаритах, без изменения количества и назначения контактов.');}
    if(id==='pi'){
      const gpio=owner('connector/gpio51'),g=createContactPostGeometry(.018,.16,true);let count=0;
      gpio?.traverse(o=>{if(!o.isMesh)return;o.geometry.computeBoundingBox();const s=o.geometry.boundingBox.getSize(new T.Vector3());if(Math.abs(s.x-.018)>1e-5||Math.abs(s.z-.018)>1e-5||Math.abs(s.y-.16)>1e-5)return;o.geometry=g.clone();ctx.privateGeometries.add(o.geometry);if(o.isInstancedMesh){o.computeBoundingBox();o.computeBoundingSphere();}count+=o.isInstancedMesh?o.count:1;});g.dispose();
      if(count)note('connector',count+' прежних квадратных GPIO-контактов получили фаски вершины без изменения шага, высоты и исходных буферов общей модели.');
    }
  }
  for(const [p,before]of owners)p.userData.micro70Added=(p.userData.modeledPieces||0)-before;
  return {additions,replacedMeshes,features,sections:[...new Set(features.map(f=>f.section))],conditional:true};
}
