import * as T from 'three';
import {createDetailBuilder} from './detail-primitives.js';
import {createPanelGeometry,createBoardGeometry,createLensElementGeometry,createOpenSocketGeometry,createCoreWindingGeometry,removeCollapsedFaces,createSplitCollarHalfGeometry,createBearingRaceGeometry} from './interior-geometry.js';
import {getPartSourceMeshes} from './viewer-instancing.js';
import {indexStudyGeometry} from './engineering-indexing.js';

// 5.1 construction studies. Every new leaf explicitly says that its layout is
// illustrative. These objects never enter the main AF-18 or its source buffers.
export function addInteriorGeometry({id,group,object,sections,detail,materials:m,privateGeometries,retired}){
  const b=createDetailBuilder({smoothSleeves:true}),created=[],replacements=[],changed=new Map(),spheres=new Map();
  const leaf=(section,key,label,description,offset)=>{
    const p=detail(section,key,label,description);created.push(p);
    if(offset)p.userData.openOffset=offset;
    if(!changed.has(section))changed.set(section,[]);changed.get(section).push(label);return p;
  };
  const own=g=>{privateGeometries.add(g);return g;};
  const meshes=section=>{const list=[];sections.get(section)?.traverse(o=>{if(o.isMesh)list.push(o);});return list;};
  const remove=(section,test)=>{for(const o of meshes(section))if(test(o)){o.removeFromParent();retired.push(o);replacements.push({section,name:o.name||'source surface'});}};
  const panel=(p,mat,at,w,h,t,holes=[],rot)=>{const g=createPanelGeometry(w,h,t,holes);b.add(p,mat,g,at,rot);g.dispose();};
  const board=(p,at,w,d,h,holes=[])=>{const g=createBoardGeometry(w,d,h,holes);b.add(p,m.pcb,g,at);g.dispose();};
  const sphere=(p,mat,at,r)=>{if(!spheres.has(r))spheres.set(r,new T.SphereGeometry(r,12,8));b.add(p,mat,spheres.get(r),at);};
  const motion=(p,offset,start=.4,end=1)=>{p.userData.openOffset=offset;p.userData.openRange=[start,end];return p;};
  function tray(p,mat,c,w,h,d,t=.014){
    b.box(p,mat,[c[0],c[1]-h/2+t/2,c[2]],[w,t,d]);
    for(const sign of [-1,1]){b.box(p,mat,[c[0]+sign*(w-t)/2,c[1]+t/2,c[2]],[t,h-t,d]);b.box(p,mat,[c[0],c[1]+t/2,c[2]+sign*(d-t)/2],[w-2*t,h-t,t]);}
  }
  const shellSize=o=>{o.geometry.computeBoundingBox();return o.geometry.boundingBox.getSize(new T.Vector3());};
  if(id==='frame'){
    let holes=0;for(const src of getPartSourceMeshes(group))if(src.geometry.type==='ExtrudeGeometry'&&src.geometry.parameters?.options?.depth===.055&&src.position.y>.3){
      const shape=src.geometry.parameters.shapes.clone();for(const x of [-.87,.87])for(const z of [-.9,-.45,0,.45,.9]){const h=new T.Path();h.absarc(x,z,.029,0,Math.PI*2,true);shape.holes.push(h);holes++;}
      const replacement=own(removeCollapsedFaces(new T.ExtrudeGeometry(shape,src.geometry.parameters.options)));
      for(const o of meshes('plates'))if(o.geometry.attributes.position===src.geometry.attributes.position){o.geometry=replacement;replacements.push({section:'plates',name:'Plate with matched fastener holes'});}
    }
    const fix=leaf('mounts','through-bolts51','Сквозные соединения пластин','Стержни и нижние шайбы совмещены с десятью имеющимися верхними головками. Посадки, резьба и стандарт условны.');
    for(const x of [-.87,.87])for(const z of [-.9,-.45,0,.45,.9]){b.cylinder(fix,m.metal,[x,.582,z],.018,.085,undefined,12);b.sleeve(fix,m.metal,[x,.531,z],.045,.019,.008);b.sleeve(fix,m.dark,[x,.519,z],.031,.019,.016,undefined,6);}
    changed.set('plates',[holes+' matched through bores']);
    const arms=leaf('arms','saddles51','Разъёмные обоймы лучей','Две половины обоймы, оси стяжки и головки вокруг существующего луча. Размеры взяты из условной геометрии, не из чертежа AF-18.');
    const halves=[true,false].map(upper=>createSplitCollarHalfGeometry(.133,.107,.10,upper));
    for(const sx of [-1,1])for(const sz of [-1,1]){const at=[sx*1.05,.35,sz*1.05],rot=[Math.PI/2,0,-sx*sz*Math.PI/4];for(const g of halves)b.add(arms,m.dark,g,at,rot);for(const k of [-1,1]){const dx=k*.143/Math.SQRT2,dz=-k*sx*sz*.143/Math.SQRT2,x=at[0]+dx,z=at[2]+dz;b.sleeve(arms,m.dark,[x,.39,z],.030,.013,.024);b.sleeve(arms,m.dark,[x,.309,z],.030,.013,.024);b.cylinder(arms,m.metal,[x,.35,z],.012,.14,undefined,8);b.socket(arms,m.metal,[x,.417,z],.023);b.sleeve(arms,m.metal,[x,.294,z],.03,.013,.006);b.sleeve(arms,m.dark,[x,.283,z],.023,.013,.016,undefined,6);}}for(const g of halves)g.dispose();
    const landing=leaf('landing','pins51','Поперечные фиксаторы опор','Сквозные оси привязаны к существующим верхним зажимам, с отдельной головкой и шайбой.');
    for(const x of [-.65,.65])for(const z of [-.61,.61]){b.rod(landing,m.metal,[x-.13,.045,z],[x+.13,.045,z],.013);b.socket(landing,m.metal,[x+.14,.045,z],.025,[0,0,-Math.PI/2]);}
  }else if(id==='motors'){
    // Replace the old overlapping solid ring proxy, not add balls inside it.
    remove('shaft',o=>o.userData.leaf==='shaft/bearings');
    const bearing=leaf('shaft','rolling51','Открытые подшипники — условно','Две опоры: кольца с условными дорожками качения, открытые шарики и разделители с задним удерживающим ободом. Восемь шариков на опору — учебная раскладка, не установленный типоразмер.');
    // Equal material parameters, separate construction batch: all 16 balls can
    // share one indexed sphere and instance buffer instead of a merged copy.
    m.rollingMetal=m.metal.clone();
    const races=[false,true].map(inner=>createBearingRaceGeometry(inner));
    for(const y of [.5,.69]){for(const g of races)b.add(bearing,m.metal,g,[2.08,y,2.08]);b.sleeve(bearing,m.contact,[2.08,y-.009,2.08],.0433,.0386,.003,undefined,64);for(let i=0;i<8;i++){const a=i*Math.PI/4,next=a+Math.PI/8;sphere(bearing,m.rollingMetal,[2.08+Math.cos(a)*.041,y,2.08+Math.sin(a)*.041],.006);b.box(bearing,m.contact,[2.08+Math.cos(next)*.041,y,2.08+Math.sin(next)*.041],[.0035,.016,.004],[0,-next,0]);}}for(const g of races)g.dispose();
    const insulation=leaf('stator','insulation51','Изолирующие торцы зубцов','Тонкие торцевые накладки отделены от пакета и не пересекают существующие витки. Материал и толщина условны.');
    for(let i=0;i<12;i++){const a=i*Math.PI/6;for(const y of [.5285,.6215])b.box(insulation,m.rubber,[2.08+Math.cos(a)*.137,y,2.08+Math.sin(a)*.137],[.086,.003,.037],[0,-a,0]);}
    const phases=leaf('stator','tails51','Локальные окончания обмоток','Три изолированных конца показаны без схемы коммутации. При разборке уходят со статором и не растягиваются к ESC.');
    for(let i=0;i<3;i++)b.cable(phases,i===0?m.red:m.rubber,[[2.20,.52,2.04+i*.025],[2.24,.49,2.04+i*.025],[2.35,.46,2.04+i*.025]],.008);
    const feet=leaf('base','mounting51','Нижние монтажные проушины','Открытые втулки и стяжки на нижнем фланце. Раскладка условная; крепление не считается чертежом производителя.');
    for(let i=0;i<4;i++){const a=i*Math.PI/2,x=2.08+Math.cos(a)*.18,z=2.08+Math.sin(a)*.18;b.sleeve(feet,m.metal,[x,.355,z],.034,.014,.025);b.cylinder(feet,m.metal,[x,.327,z],.011,.06,undefined,8);}
    const rotor=leaf('shell','retention51','Посадка ротора и стопор','Осевая прижимная втулка и опорная шайба следуют за колоколом; тип стопора условный.');b.sleeve(rotor,m.metal,[2.08,.73,2.08],.065,.027,.012,undefined,96);b.ring(rotor,m.dark,[2.08,.741,2.08],.035,.004);
  }else if(id==='battery'){
    // An explicit teaching stack. 6S is in the project table; pouch shape and
    // stacking order are NOT known and are never described as the actual pack.
    const wrap=meshes('shell').find(o=>o.material.color.getHexString()==='25292d')?.material||m.dark;
    remove('shell',o=>!(o.material.map&&o.position.y>1.20));
    const caseNode=leaf('shell','tray51','Условный раскрываемый кожух','Наружный блок заменён разнесёнными учебными панелями только в этом просмотре. Это не реальная конструкция упаковки и не способ вскрытия батареи.');
    b.box(caseNode,wrap,[0,.593,-.12],[1.05,.016,1.78]);
    for(const side of [-1,1])for(const axis of ['x','z']){const wall=motion(new T.Group(),axis==='x'?[side*.62,0,0]:[0,0,side*.62],.55,1);wall.name='Условная панель оболочки';wall.userData={...wall.userData,part:id,section:'shell',leaf:caseNode.userData.leaf};caseNode.add(wall);created.push(wall);if(axis==='x')b.box(wall,wrap,[side*.517,.918,-.12],[.016,.634,1.78]);else panel(wall,wrap,[0,.918,-.12+side*.882],1.018,.634,.016,[[-.2,.022,.035]]);}
    const cover=motion(leaf('shell','lid51','Съёмная панель упаковки — условно','Панель показывает доступ к иллюстративной стопке; производственная упаковка и способ вскрытия неизвестны.'),[0,.55,0],.55,1);b.box(cover,m.dark,[0,1.228,-.12],[1.018,.014,1.748]);
    // The original label, seam and cap batches stay with the lifted shell. Top
    // label alone goes with the top panel, not left floating above the cells.
    for(const o of meshes('shell'))if(o.material.map&&o.position.y>1.20){cover.add(o);o.userData={...cover.userData};}
    const cells=leaf('shell','cells51','6S: условная стопка пакетов','Шесть пакетов иллюстрируют запись 6S из таблицы. Форм-фактор, ориентация и электрическая коммутация неизвестны; это не внутренность установленной батареи.');
    b.box(cells,m.rubber,[0,.6085,-.12],[.97,.015,1.51]);
    for(let i=0;i<6;i++){const cell=motion(leaf('shell','packet51-'+(i+1),'Условный пакет '+(i+1),'Иллюстративная оболочка, кромки и два токовывода. Размер, химия, соединения и положение настоящей ячейки неизвестны.'),[0,i*.065,0],.65,1);cells.add(cell);const y=.655+i*.09;b.box(cell,m.metal,[0,y,-.12],[.97,.078,1.51]);for(const x of [-.482,.482])b.box(cell,m.rubber,[x,y,-.12],[.006,.077,1.48]);for(const x of [-.15,.15])b.box(cell,m.contact,[x,y,.658],[.075,.012,.046]);if(i<5)b.box(cell,m.rubber,[0,y+.045,-.12],[.965,.003,1.50]);}
    const keeper=leaf('straps','pins51','Оси пряжек','Оси и отверстия опираются на существующие пряжки. Замки условны; ремни снимаются до раскрытия кожуха.');for(const z of [-.6,.43]){b.rod(keeper,m.metal,[.55,1.06,z-.09],[.55,1.06,z+.09],.009);b.sleeve(keeper,m.dark,[.55,1.06,z-.1],.019,.01,.016,[Math.PI/2,0,0]);}
    remove('connector',o=>o.userData.leaf==='connector/exterior');
    const entries=leaf('connector','strain51','Разгрузка кабельных вводов','Каждый ввод совмещён с отверстием своего торца и движется вместе с торцевой панелью. Внутренние токопроводящие соединения не заявляются.');
    for(const z of [.77,-1.01]){const sign=Math.sign(z),entry=motion(leaf('connector',sign>0?'entry-front51':'entry-rear51',sign>0?'Ввод переднего торца':'Ввод заднего торца','Полая втулка, наружный фланец и рифлёная разгрузка согласованы с отверстием своей панели; форма условна.'),[0,0,sign*.62],.55,1);entries.add(entry);b.sleeve(entry,m.rubber,[-.2,.94,z-sign*.008],.034,.031,.024,[Math.PI/2,0,0],64);b.sleeve(entry,m.rubber,[-.2,.94,z+sign*.005],.047,.031,.006,[Math.PI/2,0,0],64);for(let i=0;i<4;i++)b.sleeve(entry,m.rubber,[-.2,.94,z+sign*(.015+i*.014)],.040-i*.002,.031,.006,[Math.PI/2,0,0],64);}
  }else if(id==='camera'){
    remove('housing',o=>{const s=shellSize(o);return s.x>.5&&s.x<.59&&s.y>.35&&s.y<.43&&s.z>.4&&s.z<.48;});
    const body=leaf('housing','open-case51','Полый корпус камеры — условно','Четыре стенки, передняя плита с отверстием и задняя крышка. Толщина и расположение крепежа иллюстративны.');
    const sensorMounts=[-.175,.175].flatMap(x=>[-.105,.105].map(y=>[x,y,.006]));
    for(const sign of [-1,1]){b.box(body,m.dark,[sign*.272,-1.25,.2],[.016,.4,.45]);b.box(body,m.dark,[0,-1.25+sign*.192,.1895],[.528,.016,.429]);}panel(body,m.dark,[0,-1.25,.411],.528,.4,.016,[[0,0,.191],...sensorMounts]);
    const back=motion(leaf('housing','back51','Задняя крышка','Крышка с четырьмя согласованными винтами отделяется назад, освобождая условный электронный модуль.'),[0,0,-.30],.2,1);panel(back,m.dark,[0,-1.25,-.025],.56,.4,.014,[[-.21,-.14,.012],[.21,-.14,.012],[-.21,.14,.012],[.21,.14,.012]]);
    for(const x of [-.21,.21])for(const y of [-1.39,-1.11]){b.sleeve(body,m.dark,[x,y,.012],.024,.011,.06,[Math.PI/2,0,0]);b.rod(back,m.metal,[x,y,-.043],[x,y,.021],.009);b.socket(back,m.metal,[x,y,-.052],.019,[-Math.PI/2,0,0]);}
    const sensor=motion(leaf('housing','sensor51','Условный сенсорный модуль','Плата, корпус сенсора, защитное окно и шлейф показывают общий принцип цифровой камеры. Марка, размер сенсора и реальная компоновка AF-18 неизвестны.'),[0,0,-.14],.45,1);
    const sensorBoard=createPanelGeometry(.42,.29,.018,[[-.175,-.105,.012],[.175,-.105,.012],[-.175,.105,.012],[.175,.105,.012]]);b.add(sensor,m.pcb,sensorBoard,[0,-1.25,.29]);sensorBoard.dispose();
    b.box(sensor,m.dark,[0,-1.25,.311],[.17,.15,.024]);panel(sensor,m.metal,[0,-1.25,.327],.19,.17,.008,[[0,0,.064]]);b.box(sensor,m.glass,[0,-1.25,.325],[.11,.085,.004]);
    for(const sign of [-1,1]){b.box(sensor,m.contact,[sign*.13,-1.25,.302],[.035,.20,.003]);for(let k=0;k<5;k++)b.box(sensor,m.ceramic,[sign*.13,-1.33+k*.04,.311],[.026,.017,.015]);}
    b.box(sensor,m.copper,[0,-1.16,.232],[.12,.006,.10]);b.box(sensor,m.rubber,[0,-1.156,.232],[.12,.002,.10]);b.box(sensor,m.dark,[0,-1.16,.177],[.15,.026,.02]);
    // Short front-mounted carriers, not long unsupported rods to the back lid.
    // Their axes match both the sensor PCB bores and the front plate bores.
    for(const x of [-.175,.175])for(const y of [-1.355,-1.145]){b.sleeve(sensor,m.dark,[x,y,.352],.012,.006,.106,[Math.PI/2,0,0]);b.rod(sensor,m.metal,[x,y,.271],[x,y,.409],.005);b.socket(sensor,m.metal,[x,y,.266],.012,[-Math.PI/2,0,0]);}
    // Existing solid barrel hides everything: replace only its cylindrical wall.
    remove('optics',o=>{const s=shellSize(o);return s.x>.37&&s.x<.39&&s.z>.14&&s.z<.16;});
    const barrel=leaf('optics','barrel51','Открытый оптический канал','Полая оправка и разнесённые посадочные кольца. Это не восстановленная многолинзовая схема.');b.sleeve(barrel,m.dark,[0,-1.25,.48],.19,.133,.15,[Math.PI/2,0,0],128);for(const z of [.423,.465,.515])b.sleeve(barrel,m.dark,[0,-1.25,z],.132,.091,.009,[Math.PI/2,0,0],96);
    const lens=motion(leaf('optics','element51','Учебный оптический элемент','Один выпуклый элемент иллюстрирует форму оптической поверхности. Число линз, фокусное расстояние и схема настоящей камеры не известны.'),[0,0,.16],.55,1);const g=createLensElementGeometry();b.add(lens,m.glass,g,[0,-1.25,.49]);g.dispose();
    const pivot=leaf('mounts','bushings51','Посадки осей подвеса','Соосные втулки, упорные кольца и винты на существующих боковых осях; приводы стабилизации не выдуманы.');for(const sign of [-1,1]){b.sleeve(pivot,m.rubber,[sign*.32,-1.25,.2],.076,.037,.014,[0,0,Math.PI/2]);b.socket(pivot,m.metal,[sign*.36,-1.25,.2],.029,[0,0,-sign*Math.PI/2]);}
  }else if(['fc','pi','power','becpi','becfc','esc'].includes(id)){
    const [cx,top,cz,w,d]=({fc:[0,.36,.2,.6,.6],pi:[0,-.33,.05,1.05,1.25],power:[0,.26,-.28,1.15,.85],becpi:[-.62,.39,-.42,.23,.35],becfc:[.62,.349,-.42,.23,.35],esc:[1.45,.509,1.45,.38,.18]})[id];
    const holes=[-1,1].flatMap(x=>[-1,1].map(z=>[x*w*.42,id==='pi'&&z<0?-.64:z*d*.38,id==='pi'?.018:id==='fc'?.022:.010]));
    const gpioHoles=id==='pi'?Array.from({length:20},(_,i)=>[-.48+i*.05,-.55,.0115]).concat(Array.from({length:20},(_,i)=>[-.48+i*.05,-.48,.0115])):[];
    if(id==='pi')for(const o of meshes('cover')){const s=shellSize(o);if(Math.abs(s.x-.068)>.002||Math.abs(s.y-.068)>.002)continue;if(o.isInstancedMesh){for(let i=0;i<o.count;i++)if(o.instanceMatrix.array[i*16+14]<cz)o.instanceMatrix.array[i*16+14]-=.165;o.instanceMatrix.needsUpdate=true;o.computeBoundingBox();o.computeBoundingSphere();}else if(o.position.z<cz)o.position.z-=.165;}
    let carrier;for(const o of meshes('board')){const s=shellSize(o);if(s.x>=w*.85&&s.z>=d*.85&&s.y>.009&&(!carrier||s.y>shellSize(carrier).y))carrier=o;}
    if(carrier){const bounds=carrier.geometry.boundingBox,sz=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3()),g=own(createBoardGeometry(id==='pi'?Math.max(sz.x,1.12):sz.x,id==='pi'?Math.max(sz.z,1.37):sz.z,.018,[...holes,...gpioHoles]));center.y+=sz.y/2-.009;g.translate(center.x,center.y,center.z);carrier.geometry=g;replacements.push({section:'board',name:'Drilled thin carrier, original top retained'});}
    const plated=leaf('board','laminate51','Слои и металлизация отверстий','Сквозные отверстия согласованы с крепежом модели; стенки металлизированы, торцы показывают разделение слоёв. Это не Gerber и не заводской стек плат.');
    // Separate edge strips below the solder mask; not raised parallel fake tracks.
    for(const side of [-1,1])b.box(plated,m.copper,[cx+side*(w*.48),top-.012,cz],[w*.008,.001,d*.84]);
    for(const [x,z,r]of holes){b.sleeve(plated,m.contact,[cx+x,top-.009,cz+z],r+.002,r,.018,undefined,16);}
    for(const [x,z,r]of gpioHoles)b.sleeve(plated,m.contact,[cx+x,top-.009,cz+z],r,r-.001,.018,undefined,8);
    const mechanical=leaf('cover','mounts51','Ответные посадки платы','Открытые дистанционные втулки, оси крепежа и прижимы совмещены с отверстиями; стандарт и размер не заявляются.');
    for(const [x,z,r]of holes){b.sleeve(mechanical,m.dark,[cx+x,top-.038,cz+z],r*1.5,r*.75,.040,undefined,16);b.cylinder(mechanical,m.metal,[cx+x,top-.022,cz+z],r*.65,.085,undefined,8);b.socket(mechanical,m.metal,[cx+x,top+.015,cz+z],r*1.4);}
    const packages=leaf('devices','packages51','Объёмные корпуса и пайка — условно','Корпуса с посадочными площадками, окончаниями и фасонными выводами. Размещение и назначение неизвестных элементов не являются электрической схемой.');
    // Place the new teaching packages on the underside, rather than intersect
    // the existing MCU and upper SMD rows. A rotation preserves handedness.
    packages.rotation.x=Math.PI;packages.position.set(0,2*top-.018,2*cz);
    motion(packages,[w*1.25,0,0],0,.33);
    const size=Math.min(w,d),z=cz-d*.08;
    if(id==='becpi'||id==='becfc'){
      // Teaching a converter's mechanical parts, not asserting its topology.
      const ox=cx,oz=cz+.015,r=size*.19;b.sleeve(packages,m.dark,[ox,top+.026,oz],r,r*.55,.032,undefined,64);b.sleeve(packages,m.metal,[ox,top+.009,oz],r*1.08,r*.55,.008,undefined,64);
      const winding=createCoreWindingGeometry(r*.55,r,.032),mid=r*.775;for(let i=0;i<8;i++){const a=i*Math.PI/4;b.add(packages,m.copper,winding,[ox+Math.cos(a)*mid,top+.026,oz+Math.sin(a)*mid],[0,-a,0]);}winding.dispose();
      for(const side of [-1,1]){b.cylinder(packages,m.metal,[cx+side*w*.27,top+.023,cz-d*.12],.015,.040,undefined,12);b.ring(packages,m.dark,[cx+side*w*.27,top+.044,cz-d*.12],.011,.002);}
    }else{
      for(let i=0;i<(id==='pi'?2:3);i++){
        const x=cx+(i-1)*w*.18,px=id==='pi'?cx-w*.35+i*w*.2:x,ww=size*.115,dd=size*.10;
        b.box(packages,m.dark,[px,top+.016,z],[ww,.028,dd]);b.box(packages,m.metal,[px,top+.031,z],[ww*.8,.003,dd*.8]);
        for(const side of [-1,1])for(let j=0;j<4;j++){const xx=px+(j-1.5)*ww*.21;b.box(packages,m.contact,[xx,top+.001,z+side*dd*.58],[ww*.15,.002,dd*.22]);b.rod(packages,m.metal,[xx,top+.002,z+side*dd*.58],[xx,top+.018,z+side*dd*.45],ww*.045);}
      }
    }
    if(id!=='pi'){
      const contacts=leaf('connector','tails51','Корни контактов и фиксаторы','Отдельные посадочные площадки под имеющейся колодкой, боковые зацепы и локальные окончания. Порядок и функции контактов неизвестны.');
      for(let i=0;i<6;i++)b.box(contacts,m.contact,[cx+(i-2.5)*w*.09,top+.001,cz-d*.43],[.012,.002,.033]);for(const side of [-1,1])b.box(contacts,m.dark,[cx+side*w*.31,top+.025,cz-d*.43],[.018,.035,.025]);
    }else remove('connector',o=>o.userData.leaf==='connector/contacts');
    if(id==='becfc'){
      const source=meshes('cover').find(o=>{const s=shellSize(o);return s.x>.24&&s.x<.26&&s.y>.11&&s.y<.13&&s.z>.39;});
      const metal=source?.material||m.metal;if(source)remove('cover',o=>o===source);
      const caseNode=leaf('cover','case51','Открытый защитный кожух BEC','Тонкостенная учебная оболочка вместо сплошного блока. Реальная конструкция преобразователя неизвестна.');tray(caseNode,metal,[cx,.33,cz],.25,.12,.4,.008);
    }
    if(id==='pi'){
      remove('connector',o=>{const s=shellSize(o);return Math.abs(s.x-.035)<.001&&Math.abs(s.y-.08)<.001&&Math.abs(s.z-.04)<.001;});
      const gpio=leaf('connector','gpio51','Носитель, хвостовики и пайка GPIO','Сохранены 40 исходных контактов. Под ними добавлены единый носитель, сквозные металлизированные отверстия и хвостовики. Условная угловая опора отнесена от ряда контактов.');
      for(const o of meshes('connector')){const s=shellSize(o);if(o!==gpio&&Math.abs(s.x-.018)<.001&&Math.abs(s.y-.16)<.001&&Math.abs(s.z-.018)<.001){gpio.add(o);o.userData={...gpio.userData};}}
      b.box(gpio,m.dark,[0,-.29,-.465],[1.02,.08,.125]);m.gpioTail=m.contact.clone();
      for(const [x,z]of gpioHoles){b.cylinder(gpio,m.gpioTail,[x,-.315,cz+z],.009,.07,undefined,8);b.sleeve(gpio,m.contact,[x,-.349,cz+z],.016,.0095,.002,undefined,12);}
      const jack=meshes('connector').find(o=>{const s=shellSize(o);return Math.abs(s.x-.24)<.001&&Math.abs(s.y-.20)<.001&&Math.abs(s.z-.34)<.001;});
      if(jack){jack.geometry=own(createOpenSocketGeometry(.24,.20,.34));replacements.push({section:'connector',name:'Hollow RJ45 reference housing'});}
      const ports=leaf('connector','interfaces51','Дополнительные интерфейсные корпуса Pi 4','Две micro-HDMI, USB-C, AV, CSI/DSI и нижний держатель microSD показаны по составу интерфейсов Pi 4. Положение в модели нормализовано, это не точный чертёж установки AF-18.');
      if(jack){ports.add(jack);jack.userData={...ports.userData};remove('connector',o=>{const s=shellSize(o);return Math.abs(s.x-.15)<.001&&Math.abs(s.y-.1)<.001&&Math.abs(s.z-.025)<.001;});}
      if(jack){b.box(ports,m.dark,[.46,-.23,-.023],[.214,.172,.014]);b.box(ports,m.dark,[.46,-.30,.14],[.20,.018,.27]);for(let i=0;i<8;i++)b.rod(ports,m.contact,[.386+i*.021,-.285,.17],[.386+i*.021,-.255,.28],.003);}
      for(const z of [-.29,-.08,.15]){const at=[-.54,top+.028,z],ww=z===.15?.13:.105;for(const side of [-1,1])b.box(ports,m.metal,[-.54,top+.028+side*.024,z],[.13,.008,ww]);for(const side of [-1,1])b.box(ports,m.metal,[-.54,top+.028,z+side*(ww-.008)/2],[.13,.04,.008]);b.box(ports,m.dark,[-.54,top+.026,z],[.11,.008,ww*.65]);}
      // The documented AV socket is a bore through a housing, not a black disc.
      const av=createPanelGeometry(.14,.115,.17,[[0,0,.035]]);b.add(ports,m.dark,av,[-.53,top+.0575,.365],[0,Math.PI/2,0]);av.dispose();b.sleeve(ports,m.metal,[-.62,top+.0575,.365],.048,.035,.012,[0,0,Math.PI/2],96);b.cylinder(ports,m.dark,[-.447,top+.0575,.365],.035,.004,[0,0,Math.PI/2],32);for(let i=0;i<4;i++)b.box(ports,m.contact,[-.59+i*.025,top+.0245,.365],[.008,.006,.025]);
      for(const x of [-.32,.28]){b.box(ports,m.dark,[x,top+.023,-.30],[.027,.046,.23]);b.box(ports,m.metal,[x,top+.027,-.30],[.006,.015,.21]);for(let i=0;i<10;i++)b.box(ports,m.contact,[x+.017,top+.003,-.39+i*.02],[.025,.004,.008]);}
      b.box(ports,m.metal,[0,top-.052,-.65],[.24,.010,.20]);for(const side of [-1,1])b.box(ports,m.metal,[side*.12,top-.037,-.65],[.012,.025,.20]);b.box(ports,m.dark,[0,top-.023,-.65],[.22,.006,.11]);
    }
    if(id==='fc'){
      remove('devices',o=>{const s=shellSize(o);return Math.abs(s.x-.22)<.001&&Math.abs(s.z-.22)<.001&&Math.abs(s.y-.04)<.001||Math.abs(s.x-.20)<.001&&Math.abs(s.z-.20)<.001&&Math.abs(s.y-.035)<.001;});
      const qfp=leaf('devices','qfp51','Единый корпус контроллера','Два взаимно пересекавшихся сплошных объёма заменены одним корпусом с посадкой на существующие выводы. Маркировка и точный корпус неизвестной ревизии не заявляются.');b.box(qfp,m.dark,[0,.3875,.2],[.22,.055,.22]);b.cylinder(qfp,m.rubber,[-.078,.4155,.122],.009,.001,undefined,12);
      const ports=leaf('connector','interfaces51','Интерфейсы семейства H743-SLIM','USB-C и держатель microSD показаны по официальному примеру H743-SLIM-V4. Ревизия платы AF-18 неизвестна; позиции и крепёж условны.');
      const socket=createOpenSocketGeometry(.13,.055,.14,.008);b.add(ports,m.metal,socket,[0,.312,.49]);socket.dispose();b.box(ports,m.dark,[0,.309,.52],[.095,.008,.10]);
      b.box(ports,m.metal,[-.10,.319,-.045],[.18,.008,.17]);for(const side of [-1,1])b.box(ports,m.metal,[-.10+side*.09,.328,-.045],[.009,.018,.17]);b.box(ports,m.dark,[-.10,.336,-.045],[.16,.006,.10]);
    }
  }else if(id==='gps'){
    const support=leaf('housing','supports51','Угловые опоры платы','Опорные столбики и винты согласованы с условной платой, не с заводским модулем.');for(const x of [-.12,.12])for(const z of [-.12,.12]){b.sleeve(support,m.dark,[-.62+x,1.817,-.78+z],.016,.007,.025,undefined,16);}
    const antenna=leaf('board','antenna51','Учебная компоновка GNSS','Керамическая площадка над металлизированным основанием иллюстрирует распространённую патч-антенну. Тип антенны установленного модуля неизвестен.');b.box(antenna,m.contact,[-.62,1.850,-.78],[.20,.003,.20]);b.box(antenna,m.ceramic,[-.62,1.864,-.78],[.185,.024,.185]);b.box(antenna,m.contact,[-.62,1.877,-.78],[.11,.002,.11]);
    // Reuse the previous generic central package on the underside, clear of the patch.
    const old=sections.get('board').children.find(o=>o.userData.leaf==='board/packages');if(old)for(const o of old.children)o.position.y=o.material.color.getHexString()==='24292d'?-.048:-.022;
    const collar=leaf('mounts','clamp51','Разрезная муфта стойки','Открытая осевая посадка и поперечный фиксатор на существующей стойке.');b.sleeve(collar,m.dark,[-.62,1.77,-.78],.061,.036,.07,undefined,96);b.rod(collar,m.metal,[-.69,1.77,-.78],[-.55,1.77,-.78],.009);
  }else if(id==='radio'){
    remove('housing',o=>{const s=shellSize(o);return s.x>.25&&s.x<.29&&s.y>.32&&s.y<.36&&s.z>.23&&s.z<.27;});
    const caseNode=leaf('housing','case51','Полость и задняя панель приёмника','Оболочка раскрыта вокруг условной платы; толщина и конструкция защёлок не подтверждены.');for(const side of [-1,1]){b.box(caseNode,m.dark,[.71+side*.129,.79,-.76],[.012,.34,.25]);b.box(caseNode,m.dark,[.71,.79+side*.164,-.76],[.246,.012,.25]);}panel(caseNode,m.dark,[.71,.79,-.879],.246,.316,.012);
    // Conditional card guides meet the side walls and support the source PCB
    // edges; the carrier slides out along Z after the front panel opens.
    for(const [x,width]of [[.614,.056],[.816,.036]])for(const y of [.855,.945])b.box(caseNode,m.dark,[x,y,-.69],[width,.010,.10]);
    const front=motion(leaf('housing','front51','Передняя панель приёмника','Панель сначала отходит в сторону, затем выходит плата. Это учебная последовательность, не сервисная инструкция.'),[.36,0,0],0,.33);panel(front,m.dark,[.71,.79,-.641],.246,.316,.012);
    const shield=leaf('board','shield51','Экран и пайка — условно','Открытая рамка вокруг существующего корпуса микросхемы, контактные площадки и крепления. RF-схема и чипсет не реконструированы.');for(const x of [.667,.773])b.box(shield,m.metal,[x,.90,-.582],[.006,.06,.016]);for(const y of [.87,.93])b.box(shield,m.metal,[.72,y,-.582],[.11,.006,.016]);
    const plugs=leaf('connector','bases51','Посадки антенн','Вводы с изолятором и локальной контактной осью; тип коаксиального соединения условный.');for(const [x,y,z]of [[.71,1.01,-.76],[.86,.86,-.45]]){b.sleeve(plugs,m.metal,[x,y,z],.04,.026,.035);b.sleeve(plugs,m.rubber,[x,y,z],.025,.013,.033);}
    // Seat the source carrier in the case; its staged extraction is handled by
    // the owning section so all packages and shield move together.
    for(const child of sections.get('board').children)child.position.z-=.08;
  }else if(id==='cooling'){
    remove('housing',o=>{const s=shellSize(o);return s.x>1.2&&s.x<1.24&&s.y>.5&&s.y<.54&&s.z>1.4;});
    const duct=leaf('housing','duct51','Полый кожух и воздуховод','Пустой внешний блок заменён стенками и отверстием вентилятора. Это условная механическая компоновка, без теплового расчёта.');
    for(const x of [-.603,.603])b.box(duct,m.metal,[x,-.625,.08],[.014,.55,1.45]);b.box(duct,m.metal,[0,-.893,.08],[1.192,.014,1.45]);panel(duct,m.metal,[0,-.65,.798],1.192,.70,.014,[[0,0,.335]]);panel(duct,m.metal,[0,-.625,-.638],1.192,.55,.014);
    const base=leaf('heatsink','base51','Основание радиатора и термопрокладка','Рёбра соединены общей подошвой, под ней показан условный термоинтерфейс. Точная зона контакта неизвестна.');b.box(base,m.metal,[0,-.416,.05],[1.04,.012,.87]);b.box(base,m.rubber,[0,-.427,.05],[.35,.010,.35]);
    const hub=leaf('fan','hub51','Ступица и задние опоры','Локальная осевая втулка и три радиальные опоры существующего вентилятора. Мотор и схема питания не утверждаются.');for(let i=0;i<3;i++){const a=i*Math.PI*2/3;b.rod(hub,m.dark,[Math.cos(a)*.075,-.65+Math.sin(a)*.075,.772],[Math.cos(a)*.31,-.65+Math.sin(a)*.31,.772],.009);}b.sleeve(hub,m.dark,[0,-.65,.77],.075,.033,.022,[Math.PI/2,0,0]);
    remove('fan',o=>{const s=shellSize(o);return s.x>.67&&s.x<.69&&s.z>.67&&s.z<.69&&s.y<.04;});b.sleeve(hub,m.dark,[0,-.65,.814],.34,.31,.035,[Math.PI/2,0,0]);b.cylinder(hub,m.dark,[0,-.65,.814],.075,.035,[Math.PI/2,0,0]);
  }else if(id==='props'){
    const clamp=leaf('hub','clamp51','Согласованный прижим ступицы','Осевая шайба, полая посадка и штифт сохраняют исходный профиль винта. Диаметр и стандарт крепления условны.');b.sleeve(clamp,m.metal,[2.08,.873,2.08],.052,.028,.008);b.cylinder(clamp,m.metal,[2.08,.843,2.08],.024,.09,undefined,16);changed.set('blades',['Existing closed airfoil retained; no invented profile change']);
  }else if(id==='wiring'){
    const pins=leaf('connector','insert51','Вставки и изоляционные перегородки','Гильзы получили отдельные изоляторы и локальные хвостовики; реальное устройство XT90-S и anti-spark неизвестно.');for(const x of [-.595,-.525]){b.sleeve(pins,m.dark,[x,.735,.5],.023,.017,.031);b.cylinder(pins,m.contact,[x,.708,.5],.009,.024,undefined,12);}
    const strain=leaf('loom','boots51','Рёбра локальной разгрузки','Рифлёные наконечники повторяют существующие концы. Они не соединяют расходящиеся подузлы.');for(const z of [.5,-1.28])for(let k=0;k<4;k++)b.sleeve(strain,m.rubber,[-.55,.65,z+k*.014],.035-k*.002,.026,.006,[Math.PI/2,0,0]);
    const mounts=leaf('mounts','locks51','Замки кабельных фиксаторов','Существующие фиксаторы дополнены замками и короткими язычками без вымышленных трасс кабелей.');for(const x of [-1,1])for(const z of [-1,1])for(const t of [.9,1.2,1.7]){b.box(mounts,m.dark,[x*t,.51,z*t],[.04,.018,.07]);b.box(mounts,m.rubber,[x*t,.525,z*t+.035],[.022,.01,.05]);}
  }
  b.finish({instanceRepeated:true,indexed:true,normalizeGeometry:indexStudyGeometry});
  for(const g of spheres.values())g.dispose();
  // Nested children use the owning leaf's metadata. Avoid accidental selection
  // of an invisible object from a different section during isolation.
  for(const p of created)p.traverse(o=>{if(o.isMesh){let parent=o.parent;while(parent&&!parent.userData.leaf)parent=parent.parent;o.userData={...o.userData,part:id,section:p.userData.section,leaf:parent?.userData.leaf||p.userData.leaf};}});
  return {created,replacements,changed:Object.fromEntries(changed),pieces:created.reduce((n,p)=>n+(p.userData.modeledPieces||0),0)};
}
