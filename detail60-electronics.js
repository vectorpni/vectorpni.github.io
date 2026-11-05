import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createBoardGeometry,removeCollapsedFaces} from './interior-geometry.js';
import {createGullwingLeadGeometry} from './lead-geometry.js';

// Mechanical construction of the existing illustrative boards, not Gerber,
// electrical nets, identification of components, or a manufacturer's BOM.
export function addElectronicsRefinement(ctx){
  const {id,b,m,sections,leaf,meshes,remove,own,panel}=ctx,features=[],reviewed=[];
  const find=key=>{let found;for(const s of sections.values())s.traverse(o=>{if(!found&&o.isGroup&&o.userData.leaf===key)found=o;});return found;};
  const count=()=>{let n=0;for(const s of sections.values())s.traverse(o=>{if(o.isGroup)n+=o.userData.modeledPieces||0;});return n;},before=count();
  const note=(section,text)=>{features.push({section,text});if(!reviewed.includes(section))reviewed.push(section);};
  const rounded=(parent,material,at,size,r=.003)=>{const g=removeCollapsedFaces(new RoundedBoxGeometry(...size,2,Math.min(r,...size.map(v=>v/4))));b.add(parent,material,g,at);g.dispose();};
  const boards={fc:[0,.36,.2,.6,.6],pi:[0,-.33,.05,1.05,1.25],power:[0,.26,-.28,1.15,.85],becpi:[-.62,.39,-.42,.23,.35],becfc:[.62,.349,-.42,.23,.35],esc:[1.45,.509,1.45,.38,.18]};
  if(boards[id]){
    const [cx,top,cz,w,d]=boards[id],small=Math.min(w,d),radius=small*.012;
    const holes=[-1,1].flatMap(sign=>Array.from({length:4},(_,i)=>[sign*w*.34,(i-1.5)*d*.085,radius]));
    const carrier=meshes('board').find(o=>{o.geometry.computeBoundingBox();const s=o.geometry.boundingBox.getSize(new T.Vector3());return s.x>=w*.85&&s.z>=d*.85&&Math.abs(s.y-.018)<1e-5&&o.geometry.parameters?.shapes;});
    // Preserve every existing mounting/GPIO bore. New holes are local teaching
    // vias in a clear margin, with plating through the actual board thickness.
    if(carrier){
      const old=carrier.geometry,shape=old.parameters.shapes.clone(),centre=old.boundingBox.getCenter(new T.Vector3());
      for(const [x,z,r]of holes){const path=new T.Path();path.absarc(cx+x-carrier.position.x-centre.x,-(cz+z-carrier.position.z-centre.z),r,0,Math.PI*2,true);shape.holes.push(path);}
      carrier.geometry=own(removeCollapsedFaces(new T.ExtrudeGeometry(shape,old.parameters.options).translate(0,0,-.009).rotateX(-Math.PI/2).translate(...centre.toArray())));
      if(ctx.privateGeometries.delete(old))old.dispose();
      const vias=leaf('board','vias60','Сквозные переходы — условно','Восемь открытых металлизированных переходов с площадками на обеих сторонах. Они показывают устройство PCB, а не реальные цепи и заводскую топологию этой платы.');
      for(const [x,z,r]of holes){b.sleeve(vias,m.contact,[cx+x,top-.009,cz+z],r,r*.72,.018,undefined,16);for(const y of [top+.0005,top-.0185])b.sleeve(vias,m.contact,[cx+x,y,cz+z],r*1.65,r*.72,.001,undefined,16);}
      note('board','Настоящие сквозные переходы, металлизация стенок и кольцевые площадки обеих сторон; прежние монтажные отверстия и GPIO сохранены.');
    }
    const packages=find('devices/packages51');
    if(packages&&!id.startsWith('bec')){
      remove('devices',o=>o.parent===packages);
      const ww=small*.115,dd=small*.10,z=cz-d*.08;
      const lead=createGullwingLeadGeometry(Math.min(.009,ww*.14),.018);lead.scale(1,1,dd/.06);
      for(let i=0;i<(id==='pi'?2:3);i++){
        const x=id==='pi'?cx-w*.35+i*w*.2:cx+(i-1)*w*.18;
        rounded(packages,m.dark,[x,top+.017,z],[ww,.024,dd],.002);
        for(const side of [-1,1])for(let pin=0;pin<4;pin++){
          const px=x+(pin-1.5)*ww*.21;
          b.add(packages,m.metal,lead,[px,top+.001,z+side*dd*.5],[0,side<0?Math.PI:0,0]);
          b.box(packages,m.contact,[px,top+.0005,z+side*dd*.82],[ww*.15,.001,dd*.33]);
        }
        b.cylinder(packages,m.rubber,[x-ww*.28,top+.0295,z-dd*.25],Math.min(.004,ww*.07),.001,undefined,12);
      }
      lead.dispose();
      note('devices','Условные нижние плоские корпуса заменены фасонными корпусами с гнутыми выводами, согласованными площадками и меткой ориентации; сохранён их боковой вынос до разборки.');
    }else if(packages){
      // Exposed windings already exist; preserve them. Add the mechanical feet
      // at the existing two can packages, with insulating bases and split caps.
      for(const side of [-1,1]){
        const x=cx+side*w*.27,z=cz-d*.12;
        b.sleeve(packages,m.rubber,[x,top+.004,z],.017,.010,.004,undefined,24);
        for(const dz of [-.009,.009]){b.rod(packages,m.metal,[x,top+.003,z+dz],[x,top+.001,z+dz*1.7],.002);b.box(packages,m.contact,[x,top+.0005,z+dz*1.7],[.007,.001,.008]);}
        for(const dx of [-.004,.004])b.box(packages,m.metal,[x+dx,top+.044,z],[.006,.001,.016]);
      }
      note('devices','У существующих условных цилиндрических корпусов появились изолирующие основания, парные выводы с площадками и разделённые торцы. Восемь инстансированных витков преобразователя сохранены.');
    }
    if(id==='fc'){
      const qfp=find('devices/qfp51');if(qfp){remove('devices',o=>o.parent===qfp&&o.material===m.dark);rounded(qfp,m.dark,[0,.3875,.2],[.22,.055,.22],.003);}
    }
    const mounts=find('cover/mounts51');
    if(mounts){for(const sx of [-1,1])for(const sz of [-1,1]){const x=cx+sx*w*.42,z=cz+(id==='pi'&&sz<0?-.64:sz*d*.38),r=id==='pi'?.018:id==='fc'?.022:.010;b.sleeve(mounts,m.metal,[x,top-.0605,z],r*1.45,r*.75,.005,undefined,16);b.sleeve(mounts,m.metal,[x,top-.0685,z],r*1.20,r*.75,.011,undefined,6);}
      note('cover','Нижние опорные шайбы и открытые шестигранные ответные элементы согласованы с существующими стойками и осями платы.');}
    if(id==='pi'){
      const ports=find('connector/interfaces51');if(ports){
        // Shield tangs terminate on the existing RJ45 side walls; do not fill
        // the eight-contact aperture or invent new functional interfaces.
        for(const side of [-1,1])for(const z of [.07,.22])b.box(ports,m.metal,[.46+side*.108,-.165,z],[.006,.018,.045]);
        for(const x of [-.32,.28])for(const z of [-.405,-.195])b.box(ports,m.dark,[x+.004,top+.034,z],[.035,.010,.013]);
        note('connector','Существующие RJ45 и FPC-корпуса получили опорные язычки экрана и торцевые фиксаторы; состав интерфейсов и 40 GPIO не менялись.');
      }
    }else{
      const contacts=find('connector/tails51');if(contacts){
        for(const side of [-1,1]){
          const x=cx+side*w*.31,z=cz-d*.43;
          b.box(contacts,m.dark,[x,top+.047,z-.008],[.018,.009,.035]);
          b.box(contacts,m.dark,[x-side*.006,top+.041,z+.007],[.012,.006,.014]);
        }
        note('connector','К существующим боковым фиксаторам колодки добавлены ответные крючки с открытым проходом контактов, без назначения распиновки.');
      }
    }
  }else if(id==='gps'){
    const substrate=find('board/substrate');if(substrate){
      remove('board',o=>o.parent===substrate);
      const g=createBoardGeometry(.34,.34,.018,[-1,1].flatMap(x=>[-1,1].map(z=>[x*.12,z*.12,.0165])));b.add(substrate,m.pcb,g,[-.62,1.836,-.78]);g.dispose();
      const supports=find('housing/supports51');for(const x of [-.12,.12])for(const z of [-.12,.12]){b.rod(supports,m.metal,[-.62+x,1.809,-.78+z],[-.62+x,1.857,-.78+z],.005);b.socket(substrate,m.metal,[-.62+x,1.86,-.78+z],.024);}
      note('board','Четыре реальные отверстия вокруг существующих опор платы и согласованные верхние прижимы. Патч-компоновка остаётся условной.');note('housing','Под опоры платы добавлены оси со сквозным проходом и ответным прижимом; крышка открывается прежде извлечения платы.');
    }
  }else if(id==='radio'){
    const pcb=leaf('board','terminations60','Окончания компонентов — условно','Пассивные корпуса, парные контакты и посадочные площадки расположены на свободных краях существующей платы. Назначение, номиналы и RF-схема неизвестны.');
    for(const x of [.66,.78])for(const y of [.884,.916]){
      rounded(pcb,m.ceramic,[x,y,-.675],[.014,.010,.008],.001);
      for(const dy of [-.007,.007]){b.box(pcb,m.metal,[x,y+dy,-.676],[.015,.005,.006]);b.box(pcb,m.contact,[x,y+dy,-.6795],[.019,.008,.001]);}
    }
    note('board','Корпуса с двумя различимыми окончаниями и посадочными площадками по краям исходной платы; новая RF-топология не создавалась.');
  }else if(id==='cooling'){
    const duct=find('housing/duct51');if(duct){
      remove('housing',o=>o.parent===duct);
      for(const x of [-.603,.603])b.box(duct,m.metal,[x,-.625,.08],[.014,.55,1.45]);b.box(duct,m.metal,[0,-.893,.08],[1.192,.014,1.45]);
      panel(duct,m.metal,[0,-.65,.798],1.192,.70,.014,[[0,0,.335],...[-.48,.48].flatMap(x=>[-.15,.17].map(y=>[x,y,.0115]))]);panel(duct,m.metal,[0,-.625,-.638],1.192,.55,.014);
      const pins=leaf('housing','front-fasteners60','Сквозные посадки передней панели','Четыре отверстия в панели, стержни и внутренние ответные шайбы согласованы с прежними наружными головками. Монтажный стандарт и реальный кожух неизвестны.');
      for(const x of [-.48,.48])for(const y of [-.8,-.48]){b.rod(pins,m.metal,[x,y,.778],[x,y,.813],.009);b.sleeve(pins,m.metal,[x,y,.787],.024,.0115,.008,[Math.PI/2,0,0]);}
      note('housing','Четыре монтажных отверстия передней панели и сквозной крепёж согласованы с имеющимися головками; центральное отверстие вентилятора не изменено.');
    }
  }
  return {pieces:count()-before,features,sections:reviewed,conditional:true};
}
