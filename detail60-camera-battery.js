import * as T from 'three';
import {createGullwingLeadGeometry} from './lead-geometry.js';
import {createOpenSocketGeometry,removeCollapsedFaces} from './interior-geometry.js';

// These shapes refine the existing teaching reconstruction. Dimensions are the
// scene's display units, not measurements, connector standards or a battery BOM.
export function createSlottedBuckleGeometry(){
  const rounded=(path,x,y,w,h,r)=>{
    path.moveTo(x+r,y);path.lineTo(x+w-r,y);path.quadraticCurveTo(x+w,y,x+w,y+r);
    path.lineTo(x+w,y+h-r);path.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    path.lineTo(x+r,y+h);path.quadraticCurveTo(x,y+h,x,y+h-r);
    path.lineTo(x,y+r);path.quadraticCurveTo(x,y,x+r,y);path.closePath();
  };
  const shape=new T.Shape();rounded(shape,-.11,-.075,.22,.15,.012);
  for(const y of [-.036,.036]){const hole=new T.Path();rounded(hole,-.087,y-.023,.174,.046,.004);shape.holes.push(hole);}
  return removeCollapsedFaces(new T.ExtrudeGeometry(shape,{depth:.015,bevelEnabled:true,bevelSize:.001,bevelThickness:.001,bevelSegments:1,curveSegments:5}).translate(0,0,-.0075).rotateY(Math.PI/2));
}

// A real open retaining annulus, with two radial tool recesses. No extra lens
// element, motorised focus mechanism or claimed optical prescription is added.
export function createNotchedRetainerGeometry(){
  const outer=.133,inner=.101,shape=new T.Shape(),segments=96;
  for(let i=0;i<segments;i++){
    const a=i*Math.PI*2/segments,d=Math.min(a,Math.abs(a-Math.PI),Math.PI*2-a),radius=d<.10?outer-.009:outer;
    const x=Math.cos(a)*radius,y=Math.sin(a)*radius;i?shape.lineTo(x,y):shape.moveTo(x,y);
  }
  shape.closePath();const hole=new T.Path();hole.absarc(0,0,inner,0,Math.PI*2,true);shape.holes.push(hole);
  const g=removeCollapsedFaces(new T.ExtrudeGeometry(shape,{depth:.006,bevelEnabled:false,curveSegments:24}).translate(0,0,-.003));
  const p=g.attributes.position,n=g.attributes.normal;
  for(let i=0;i<p.count;i++){
    if(Math.abs(n.getZ(i))>1e-6)continue;
    const x=p.getX(i),y=p.getY(i),r=Math.hypot(x,y),a=Math.atan2(y,x),away=Math.min(Math.abs(a),Math.abs(Math.abs(a)-Math.PI))>.11;
    if(Math.abs(r-inner)<1e-6)n.setXYZ(i,-x/r,-y/r,0);
    else if(away&&Math.abs(r-outer)<1e-6)n.setXYZ(i,x/r,y/r,0);
  }
  return g;
}

export function addCameraBatteryRefinement(ctx){
  const {id,b,m,sections,leaf}=ctx;
  const relevant=id==='camera'||id==='battery';
  if(!relevant)return {pieces:0,features:[],sections:[],conditional:[]};
  const find=key=>{let found;for(const section of sections.values())section.traverse(o=>{if(!found&&o.isGroup&&o.userData.leaf===key)found=o;});return found;};
  const count=()=>{let n=0;for(const section of sections.values())section.traverse(o=>{if(o.isGroup)n+=o.userData.modeledPieces||0;});return n;};
  const before=count(),features=[],reviewed=[];
  const child=(parent,section,key,label,description)=>{const node=leaf(section,key,label,description);parent.add(node);return node;};
  if(id==='camera'){
    const back=find('housing/back51'),sensor=find('housing/sensor51'),barrel=find('optics/barrel51'),pivot=find('mounts/bushings51');
    if(!back||!sensor||!barrel||!pivot)throw Error('6.0 camera refinement requires the existing 5.2 owned leaves');
    // The tongue fits inside the side walls (inside X=.264, inside Y=.184),
    // while the thin gasket meets the rear cover. It follows that cover.
    for(const side of [-1,1]){
      b.box(back,m.dark,[side*.246,-1.25,-.0025],[.012,.344,.031]);
      b.box(back,m.dark,[0,-1.25+side*.166,-.0025],[.480,.012,.031]);
      b.box(back,m.rubber,[side*.258,-1.25,-.016],[.012,.368,.004]);
      b.box(back,m.rubber,[0,-1.25+side*.178,-.016],[.504,.012,.004]);
    }
    features.push('Rear cover: inward locating tongue and seated perimeter gasket, attached to the existing moving cover.');

    const electronics=child(sensor,'housing','sensor-electronics60','Обратная сторона сенсорной платы — условно','Объёмный корпус, гнутые выводы, посадочные площадки и открытая колодка существующего шлейфа. Количество контактов, назначение микросхемы и реальная разводка камеры неизвестны; показана только механическая компоновка.');
    b.box(electronics,m.dark,[0,-1.25,.265],[.12,.08,.018]);
    const lead=createGullwingLeadGeometry(.009,.019);
    for(const side of [-1,1])for(let i=0;i<4;i++){
      const x=(i-1.5)*.024,y=-1.25+side*.06;
      b.add(electronics,m.metal,lead,[x,y,.281],[-Math.PI/2,side<0?Math.PI:0,0]);
      b.box(electronics,m.contact,[x,-1.25+side*.082,.2795],[.016,.025,.003]);
    }
    lead.dispose();
    // Two terminalled passive packages fit in the remaining side margins. Their
    // footprints are coherent, but no nominal values or circuit nets are claimed.
    for(const x of [-.135,.135]){
      b.box(electronics,m.ceramic,[x,-1.30,.273],[.026,.030,.014]);
      for(const dy of [-.019,.019]){
        b.box(electronics,m.metal,[x,-1.30+dy,.275],[.027,.010,.012]);
        b.box(electronics,m.contact,[x,-1.30+dy,.2795],[.032,.014,.003]);
      }
    }
    const socket=createOpenSocketGeometry(.15,.026,.020,.004);b.add(electronics,m.dark,socket,[0,-1.16,.157]);socket.dispose();
    for(let i=0;i<10;i++)b.box(electronics,m.contact,[(i-4.5)*.012,-1.166,.157],[.006,.003,.016]);
    for(const x of [-.078,.078])b.box(electronics,m.metal,[x,-1.16,.169],[.012,.025,.010]);
    features.push('Sensor PCB: seated underside package, eight folded leads with pads, two terminalled passives, open flex connector and ten illustrative contact fingers.');

    const retainer=createNotchedRetainerGeometry();b.add(barrel,m.metal,retainer,[0,-1.25,.438]);retainer.dispose();
    // The new gasket lies between two existing barrel seats and surrounds the
    // same single teaching element; it never fills the open optical channel.
    b.sleeve(barrel,m.rubber,[0,-1.25,.448],.131,.097,.004,[Math.PI/2,0,0],64);
    for(const sign of [-1,1])b.sleeve(pivot,m.metal,[sign*.349,-1.25,.2],.074,.030,.008,[0,0,Math.PI/2],48);
    features.push('Optics/pivots: open two-notch retaining annulus, distinct sealing seat and seated thrust washers; no invented lens train.');
    reviewed.push('housing','optics','mounts');
  }else{
    const tray=find('shell/tray51'),straps=find('straps/pins51');
    if(!tray||!straps)throw Error('6.0 battery refinement requires the existing 5.2 tray and strap owners');
    // Four short guides stop beside the lowest illustrated packet; their bottom
    // touches the tray top (.601); the inner face at .493 meets the folded
    // seam edge, leaving .008 clearance to the original packet body.
    for(const x of [-.499,.499])for(const z of [-.72,.48])b.box(tray,m.rubber,[x,.646,z],[.012,.090,.14]);
    const collars=createOpenSocketGeometry(.091,.036,.012,.007);
    for(let i=0;i<6;i++){
      const packet=find('shell/packet51-'+(i+1));if(!packet)throw Error('Missing existing illustrative packet '+i);
      const y=.655+i*.09;
      // Each seal remains below the packet's original vertical envelope. No
      // decorative stacked foil layers or fictional inter-cell bus is added.
      for(const z of [-.883,.643])b.box(packet,m.metal,[0,y,z],[.97,.014,.016]);
      for(const x of [-.489,.489])b.box(packet,m.metal,[x,y,-.12],[.008,.014,1.51]);
      for(const x of [-.15,.15])b.add(packet,m.rubber,collars,[x,y,.657]);
    }
    collars.dispose();
    features.push('Six existing illustrative packets: folded perimeter seal flanges and twelve genuinely open tab-root insulators, each owned by its independently moving packet.');
    features.push('Battery tray: four seated lower-packet guides, retaining original stack spacing and staged panel motions.');

    const buckle=child(straps,'straps','frames60','Открытые рамки пряжек — условно','Два открытых окна каждой рамки, перемычка и опорные щёчки согласованы с существующими лентами и осями. Форма и стандарт настоящих пряжек AF-18 неизвестны.');
    const frame=createSlottedBuckleGeometry();
    for(const z of [-.6,.43]){
      b.add(buckle,m.metal,frame,[.595,1.06,z]);
      for(const dz of [-.101,.101])b.box(buckle,m.dark,[.585,1.06,z+dz],[.020,.10,.014]);
    }
    frame.dispose();
    features.push('Straps: two real two-slot buckle frames with supported cheeks; they leave the pack with the existing strap section.');
    // Existing two independently moving end entries already have real bores.
    // Reinforce their flange seating without a fictional internal power harness.
    for(const suffix of ['front51','rear51']){
      const entry=find('connector/entry-'+suffix);if(!entry)throw Error('Missing battery end entry '+suffix);
      const sign=suffix==='front51'?1:-1,z=sign>0?.77:-1.01;
      b.sleeve(entry,m.dark,[-.2,.94,z-sign*.020],.044,.034,.008,[Math.PI/2,0,0],48);
    }
    features.push('Cable entries: separate inboard clamping seats on their matching moving end panels; no stretched cross-node wire or invented wiring diagram.');
    reviewed.push('shell','straps','connector');
  }
  return {pieces:count()-before,features,sections:reviewed,conditional:['All added internal construction is illustrative. Camera model/optical prescription and actual battery packet count, chemistry, packaging and wiring remain unconfirmed.']};
}
