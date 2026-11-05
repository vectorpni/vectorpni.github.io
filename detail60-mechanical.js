import * as T from 'three';
import {getPartSourceMeshes} from './viewer-instancing.js';
import {createPanelGeometry,removeCollapsedFaces} from './interior-geometry.js';

// All dimensions are the existing reconstruction's display units. These
// refinements explain joints visible in that model; they are not AF-18 CAD,
// a motor specification, or an electrical connection drawing.
export function createCableSaddleGeometry(){
  // A real opening around the existing .105 carbon arm and .022 cable, rather
  // than the solid rectangular proxy that previously occupied both volumes.
  // The two-circle convex hull has exact common tangents and no self crossings.
  const outline=(lower,upper)=>{
    const y0=-.04,y1=.09,angle=Math.asin((lower-upper)/(y1-y0));
    const p=new T.Path();p.moveTo(Math.cos(angle)*lower,y0+Math.sin(angle)*lower);
    p.lineTo(Math.cos(angle)*upper,y1+Math.sin(angle)*upper);
    p.absarc(0,y1,upper,angle,Math.PI-angle,false);
    p.lineTo(-Math.cos(angle)*lower,y0+Math.sin(angle)*lower);
    p.absarc(0,y0,lower,Math.PI-angle,Math.PI*2+angle,false);p.closePath();return p;
  };
  const shape=new T.Shape(outline(.114,.032).getPoints(48));
  shape.holes.push(new T.Path(outline(.106,.024).getPoints(48).reverse()));
  return removeCollapsedFaces(new T.ExtrudeGeometry(shape,{depth:.04,bevelEnabled:false,steps:1,curveSegments:24}).translate(0,0,-.02));
}

export function addMechanicalRefinement(ctx){
  const {id,group,sections,b,m,leaf,remove,meshes,panel}=ctx,features=[],reviewed=[],parents=new Map();
  const track=p=>{if(!parents.has(p))parents.set(p,p.userData.modeledPieces||0);return p;};
  const node=(section,key,label,description)=>track(leaf(section,key,label,description));
  const existing=(section,key)=>{let result;sections.get(section)?.traverse(o=>{if(o.isGroup&&o.userData.leaf===section+'/'+key)result=o;});return result&&track(result);};
  const note=(section,text)=>{features.push({section,text});if(!reviewed.includes(section))reviewed.push(section);};
  const sourceMeshes=getPartSourceMeshes(group);
  const replaceCylinder=(section,test,target,inner)=>{
    let replaced=0;
    for(const src of sourceMeshes){
      if(!test(src))continue;
      const clones=meshes(section).filter(o=>o.geometry.attributes.position===src.geometry.attributes.position);
      for(const clone of clones){
        // The representative study holds one motor/propeller. A borrowed source
        // material is never attached: use its renderer-private preview clone.
        const p=src.geometry.parameters;
        b.sleeve(target,clone.material,src.position.toArray(),p.radiusTop,inner,p.height,src.rotation.toArray().slice(0,3),64);
        remove(section,o=>o===clone);replaced++;
      }
    }
    return replaced;
  };

  if(id==='frame'){
    const seats=node('plates','load-seats60','Опорные шайбы сквозных соединений','Шайбы перекрывают отверстия существующей пластины; головки подняты на толщину шайбы и опираются на неё. Это согласование условной геометрии, не стандарт крепежа.');
    for(const x of [-.87,.87])for(const z of [-.9,-.45,0,.45,.9])b.sleeve(seats,m.metal,[x,.620,z],.043,.019,.006);
    // Original screw heads were narrower than their new through bores. The
    // ten washers bridge those bores, and the old heads now actually seat.
    const lifted=new Set();
    for(const src of sourceMeshes){const p=src.geometry.parameters;
      if(!p||!(Math.abs(src.position.x)===.87)||src.position.y<.62||src.position.y>.65)continue;
      const head=src.geometry.type==='CylinderGeometry'&&Math.abs(p.radiusTop-.027)<1e-7&&Math.abs(p.height-.023)<1e-7;
      const slot=src.geometry.type==='RoundedBoxGeometry'&&Math.abs(p.width-.0324)<1e-7&&Math.abs(p.height-.004)<1e-7;
      if(!head&&!slot)continue;
      for(const o of meshes('mounts'))if(o.geometry.attributes.position===src.geometry.attributes.position&&!lifted.has(o)){o.position.y+=.0095;lifted.add(o);}
    }
    note('plates','Ten load-spreading open washers bridge the existing bores; existing heads and slots are seated, not left within the opening.');
    const ends=node('mounts','lower-ends60','Нижние ответные соединения стоек','Открытые опорные шайбы и шестигранные ответные элементы опираются на низ существующей пластины вокруг имеющихся стоек. Резьба, тип и преднатяг не заявляются.');
    for(const x of [-.77,.77])for(const z of [-.83,.83]){b.sleeve(ends,m.metal,[x,.094,z],.064,.046,.008);b.sleeve(ends,m.metal,[x,.081,z],.060,.046,.018,undefined,6);}
    note('mounts','Four lower standoff seats have a washer and hexagonal open counterpart meeting at the same plane.');
    const liners=node('arms','clamp-liners60','Вкладыши разъёмных обойм','Тонкий полый вкладыш отделяет существующий карбоновый луч от обоймы. Внешние бортики опираются на её торцы; толщина и материал условны.');
    for(const sx of [-1,1])for(const sz of [-1,1]){
      const at=[sx*1.05,.35,sz*1.05],rot=[Math.PI/2,0,-sx*sz*Math.PI/4],axis=new T.Vector3(0,1,0).applyEuler(new T.Euler(...rot));
      b.sleeve(liners,m.rubber,at,.1068,.1055,.10,rot,48);
      for(const sign of [-1,1])b.sleeve(liners,m.rubber,new T.Vector3(...at).addScaledVector(axis,sign*.053).toArray(),.137,.1055,.006,rot,48);
    }
    note('arms','Four genuinely hollow arm liners clear the carbon skin and end at seated retaining flanges.');
    const pins=existing('landing','pins51')||node('landing','pin-ends60','Ответные элементы осей опор','Противоположный конец имеющейся поперечной оси удерживается открытой шайбой и шестигранным ответным элементом. Стандарт условный.');
    for(const x of [-.65,.65])for(const z of [-.61,.61]){b.sleeve(pins,m.metal,[x-.128,.045,z],.025,.014,.007,[0,0,Math.PI/2]);b.sleeve(pins,m.metal,[x-.141,.045,z],.022,.014,.019,[0,0,Math.PI/2],6);}
    note('landing','Four existing transverse landing pins now have their missing opposite washer/nut pair, with matched axes and mating planes.');
  }else if(id==='motors'){
    const rotor=node('shell','rotor-seats60','Полая опора колокола и удержание магнитов','Существующая сплошная опора раскрыта под верхний подшипник. Кольцевой носитель и два бортика опирают имеющиеся магниты на колокол; число и свойства магнитов не утверждаются.');
    replaceCylinder('shell',src=>src.position.x>1&&src.position.z>1&&src.geometry.type==='CylinderGeometry'&&src.geometry.parameters.radiusTop===.074&&src.geometry.parameters.height===.09,rotor,.056);
    b.sleeve(rotor,m.dark,[2.08,.565,2.08],.234,.2245,.09);
    for(const y of [.5165,.6135])b.sleeve(rotor,m.dark,[2.08,y,2.08],.234,.207,.007);
    note('shell','A real bearing bore replaces the solid rotor hub; a fitted magnet backing and axial retaining lips connect the existing magnets to the bell.');
    const axis=node('shaft','continuous-axis60','Непрерывная опорная ось','Нижняя часть оси соединяет прежний верхний стержень с обеими имеющимися подшипниковыми опорами. Размеры унаследованы из условного двигателя, стандарт неизвестен.');
    b.cylinder(axis,m.metal,[2.08,.54375,2.08],.025,.2875,undefined,32);
    note('shaft','A shaft segment reaches both bearing bores and meets the existing upper shaft at y=.6875 without a gap.');
    const support=node('base','bearing-carrier60','Центральная опора подшипника','Полая опора и плечо наружного кольца соединены четырьмя радиальными перемычками с существующим основанием. Это учебная реконструкция неподвижной опоры.');
    b.sleeve(support,m.metal,[2.08,.455,2.08],.070,.0555,.080);
    b.sleeve(support,m.metal,[2.08,.485,2.08],.070,.048,.005);
    for(let i=0;i<4;i++){const a=i*Math.PI/2;b.box(support,m.metal,[2.08+Math.cos(a)*.115,.415,2.08+Math.sin(a)*.115],[.10,.014,.027],[0,-a,0]);}
    // The existing phase tails cross a seated, bored base-wall insert. They
    // separate with the stator in the study instead of stretching to the ESC.
    const exit=node('base','lead-seat60','Панель выхода фазных концов','Три отверстия и эластичные втулки согласованы с локальными концами существующих проводов. При разборке провода отделяются со статором; коммутация и тип разъёма неизвестны.');
    const curve=new T.CatmullRomCurve3([[2.20,.52,2.04],[2.24,.49,2.04],[2.35,.46,2.04]].map(p=>new T.Vector3(...p)));let low=0,high=1;for(let i=0;i<32;i++){const mid=(low+high)/2;if(curve.getPoint(mid).x<2.295)low=mid;else high=mid;}const t=(low+high)/2,y=curve.getPoint(t).y,tangent=curve.getTangent(t).normalize();
    const across=new T.Vector3(0,0,-1),up=new T.Vector3().crossVectors(tangent,across).normalize();
    const panelRotation=new T.Euler().setFromRotationMatrix(new T.Matrix4().makeBasis(across,up,tangent)).toArray().slice(0,3),sleeveRotation=new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),tangent)).toArray().slice(0,3);
    const centre=new T.Vector3(2.295,y,2.065).addScaledVector(up,-.022);
    panel(exit,m.dark,centre.toArray(),.108,.082,.012,[[.025,.022,.0115],[0,.022,.0115],[-.025,.022,.0115]],panelRotation);
    for(let i=0;i<3;i++){const at=new T.Vector3(2.295,y,2.04+i*.025);b.sleeve(exit,m.rubber,at.toArray(),.0112,.0088,.027,sleeveRotation);for(const sign of [-1,1])b.sleeve(exit,m.rubber,at.clone().addScaledVector(tangent,sign*.008).toArray(),.0123,.0088,.004,sleeveRotation);}
    note('base','A central bearing carrier now meets the base, and three actual cable exit bores are aligned to the existing curved phase tails.');
    const stator=node('stator','inner-spacer60','Внутренняя втулка пакета','Полая внутренняя опора связывает существующий пакет статора с нижним носителем, оставляя зазор вокруг оси. Материал и посадка условны.');
    b.sleeve(stator,m.dark,[2.08,.552,2.08],.039,.027,.088);
    note('stator','The laminated packet has a hollow internal support around the shaft, preserving all sixty winding loops.');
  }else if(id==='props'){
    const hub=node('hub','open-hub60','Согласованные посадки ступицы','Скрытые взаимные пересечения четырёх прежних колец устранены общими посадочными плоскостями. Наружные радиусы, общий низ и верх сохранены; канал остаётся сквозным. Посадочный стандарт неизвестен.');
    // The old short bore ring was buried in a solid cylinder. Retire it with
    // that cylinder so the replacement does not contain overlapping sleeves.
    remove('hub',o=>o.userData.leaf==='hub/bore');
    const seats=[[.78,.09,.09,.767,.064],[.807,.105,.016,.807,.016],[.83,.045,.035,.83125,.0325],[.857,.043,.045,.8635,.032]];
    for(const src of sourceMeshes){if(!(src.position.x>1&&src.position.z>1))continue;src.geometry.computeBoundingBox();const size=src.geometry.boundingBox.getSize(new T.Vector3()),seat=seats.find(([y,r,h])=>Math.abs(src.position.y-y)<1e-6&&Math.abs(size.x-r*2)<1e-5&&Math.abs(size.y-h)<1e-5);if(!seat)continue;
      for(const clone of meshes('hub').filter(o=>o.geometry.attributes.position===src.geometry.attributes.position)){b.sleeve(hub,clone.material,[src.position.x,seat[3],src.position.z],seat[1],.028,seat[4],src.rotation.toArray().slice(0,3),64);remove('hub',o=>o===clone);}
    }
    const clamp=existing('hub','clamp51');if(clamp){remove('hub',o=>o.parent===clamp);b.sleeve(clamp,m.metal,[2.08,.88275,2.08],.052,.028,.0065);b.cylinder(clamp,m.metal,[2.08,.843,2.08],.024,.09,undefined,16);}
    note('hub','Four existing hollow hub surfaces now mate at shared axial planes instead of intersecting; the clamp washer meets the upper sleeve and the existing bolt head. Overall radii and endpoints retained.');
    note('blades','Closed airfoil skin, original pitch/handedness, thickness and root envelope retained; no unsupported aerodynamic reprofile.');
  }else if(id==='wiring'){
    const plugs=node('connector','open-plugs60','Открытые корпуса силовых разъёмов','В обоих существующих корпусах выполнены два настоящих отверстия, изоляторы и контактные окончания. Геометрия повторяет видимые спаренные посадки; стандарт XT90-S и устройство anti-spark не реконструируются.');
    const bodyGeometry=createPanelGeometry(.16,.12,.12,[[-.035,0,.024],[.035,0,.024]],.018).rotateX(-Math.PI/2);
    for(const src of sourceMeshes){const p=src.geometry.parameters;if(src.geometry.type!=='RoundedBoxGeometry'||!p||Math.abs(p.width-.16)>1e-8||Math.abs(p.height-.12)>1e-8||Math.abs(p.depth-.12)>1e-8)continue;
      for(const o of meshes('connector').filter(o=>o.geometry.attributes.position===src.geometry.attributes.position)){b.add(plugs,o.material,bodyGeometry,src.position.toArray(),src.rotation.toArray().slice(0,3));remove('connector',test=>test===o);}
    }
    bodyGeometry.dispose();
    // Retire the original dark discs that closed the female contact cavities.
    for(const src of sourceMeshes){const p=src.geometry.parameters;if(src.geometry.type==='CylinderGeometry'&&p.radiusTop===.019&&p.height===.008)remove('connector',o=>o.geometry.attributes.position===src.geometry.attributes.position);}
    for(const x of [-.595,-.525]){
      // Existing front sleeves/insulators stay. Only their missing floor and
      // rear counterparts are added; no second overlapping front barrel.
      for(const z of [.5,-1.28])b.sleeve(plugs,m.contact,[x,.721,z],.017,.009,.002);
      b.sleeve(plugs,m.dark,[x,.735,-1.28],.023,.0175,.031);
      b.sleeve(plugs,m.contact,[x,.735,-1.28],.017,.010,.026);
      b.cylinder(plugs,m.contact,[x,.708,-1.28],.009,.024,undefined,12);
    }
    note('connector','Both existing plug bodies are bored through; false dark closing discs are removed and rear contacts match the visible front layout.');
    const saddles=node('mounts','open-saddles60','Открытые кабельные седловины','Двенадцать сплошных прокси заменены открытыми седловинами вокруг существующего луча и кабеля. Условный охват и толщина согласованы с текущими поверхностями, а не с заводским хомутом.');
    const saddle=createCableSaddleGeometry();
    for(const src of sourceMeshes){const p=src.geometry.parameters;if(src.geometry.type!=='RoundedBoxGeometry'||!p||p.width!==.18||p.height!==.25||p.depth!==.06)continue;
      const clones=meshes('mounts').filter(o=>o.geometry.attributes.position===src.geometry.attributes.position);
      if(!clones.length)continue;
      // A single InstancedMesh can represent all twelve proxies after preview
      // compaction: remove it once, but rebuild each real source placement.
      remove('mounts',o=>clones.includes(o));
    }
    for(const sx of [-1,1])for(const sz of [-1,1])for(const t of [.9,1.2,1.7])b.add(saddles,m.rubber,saddle,[sx*t,.39,sz*t],[0,sx*sz*Math.PI/4,0]);
    saddle.dispose();
    note('mounts','Twelve shared-geometry hollow saddles replace solid intersecting blocks and retain instancing.');
    note('loom','Existing local cable curves and strain-relief boots retained; the new saddle openings fit their current arm/cable coordinates without stretching moving connections.');
  }
  return {pieces:[...parents].reduce((sum,[parent,before])=>sum+(parent.userData.modeledPieces||0)-before,0),features,sections:reviewed,conditional:true};
}
