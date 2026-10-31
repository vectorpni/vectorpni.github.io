import * as THREE from 'three';
import {createDetailBuilder,createEngineeringMaterials} from './detail-primitives.js';
import {createTwinSocketGeometry} from './socket-geometry.js';
import {createHollowTubeGeometry} from './frame-tube-geometry.js';
import {createGullwingLeadGeometry} from './lead-geometry.js';

// Exterior additions only. Nothing is animated independently of its 16 owners.
// Opened internals live in a separate, on-demand module.
export function addEngineeringDetail({mesh,groups}) {
  const tubes=new Map();for(const source of groups?.frame?.children||[]){const p=source.geometry.parameters;if(source.geometry.type!=='CylinderGeometry'||![.105,.055,.065].includes(p.radiusTop)||p.height<.5)continue;if(!tubes.has(source.geometry))tubes.set(source.geometry,createHollowTubeGeometry(p.radiusTop,p.height,p.radialSegments));source.geometry=tubes.get(source.geometry);source.userData.detailSection=p.radiusTop===.105?'arms':'landing';source.name='Полая карбоновая труба';}
  const hubs=new Map();for(const source of groups?.props?.children||[]){const p=source.geometry.parameters;if(source.geometry.type!=='CylinderGeometry'||p.radiusTop<.043)continue;if(!hubs.has(source.geometry))hubs.set(source.geometry,createHollowTubeGeometry(p.radiusTop,p.height,p.radialSegments,.028));source.geometry=hubs.get(source.geometry);source.userData.detailSection='hub';source.name='Ступица с осевой посадкой';}
  const printedTraces=new Map();let fcLead;
  for(const [id,top]of Object.entries({fc:.36,pi:-.33,power:.21,becpi:.39,becfc:.39}))for(const source of groups?.[id]?.children||[]){
    const g=source.geometry,p=g.parameters;if(!p)continue;
    if(g.type==='TorusGeometry'&&p.tube===.012&&[.022,.033].includes(p.radius)){source.position.y=top+.012;source.userData.detailSection='cover';}
    if(g.type==='CylinderGeometry'&&p.radiusTop===.0035){if(!printedTraces.has(g))printedTraces.set(g,new THREE.BoxGeometry(.007,.001,p.height));source.geometry=printedTraces.get(g);source.quaternion.identity();source.position.y=top+.0005;source.userData.detailSection='board';source.name='Условная печатная дорожка';}
    if(g.type==='CylinderGeometry'&&p.radiusTop===.012&&p.height===.008){source.position.y=top+.004;source.userData.detailSection='board';}
    if(g.type==='RoundedBoxGeometry'&&p.width===.025&&p.height===.025&&p.depth===.05)source.position.y=top+.0125;
    if(g.type==='RoundedBoxGeometry'&&p.width===.03&&p.height===.018&&p.depth===.008)source.position.y=top+.009;
    if(id==='fc'&&g.type==='RoundedBoxGeometry'&&p.width===.015&&p.height===.025&&p.depth===.08){source.position.y=top+.0125;source.userData.detailSection='connector';}
    if(id==='pi'&&g.type==='RoundedBoxGeometry'&&p.width===.035&&p.height===.08&&p.depth===.04&&Math.abs(source.position.z+.48)<.001){source.position.y=-.29;source.userData.detailSection='connector';}
    if(id==='fc'&&g.type==='RoundedBoxGeometry'&&p.height===.014&&[.013,.045].includes(p.width)&&[.013,.045].includes(p.depth)){
      if(!fcLead)fcLead=createGullwingLeadGeometry();source.geometry=fcLead;source.position.y=top;source.rotation.y=p.width===.013?(source.position.z<.2?0:Math.PI):(source.position.x<0?Math.PI/2:-Math.PI/2);source.userData.detailSection='devices';source.name='Вывод корпуса микросхемы';
    }
  }
  const b=createDetailBuilder(),m=createEngineeringMaterials(),temporary=[];
  for(const source of groups?.wiring?.children||[]){const p=source.geometry.parameters;if(source.geometry.type==='CylinderGeometry'&&p.radiusTop===.022&&p.height>.2){source.position.y=.48;source.userData.detailSection='loom';}}
  const batch=(id,anchor=[0,0,0],section)=>{const g=new THREE.Group();g.name=id+' exterior 5.0';g.userData={part:id,detail:'visible-reconstruction',detailSection:section};g.position.set(...anchor);temporary.push({id,g,anchor,section});return g;};
  const frame=batch('frame',[0,0,0],'arms'),landing=batch('frame',[0,0,0],'landing'),mounts=batch('frame',[0,0,0],'mounts');
  for(const x of [-1,1])for(const z of [-1,1]) {
    // Motor saddle joins the existing tube to the existing mounting disc.
    b.sleeve(frame,m.metal,[x*2.08,.315,z*2.08],.14,.108,.045);
    for(const dx of [-.12,.12])b.socket(frame,m.metal,[x*2.08+dx,.388,z*2.08]);
    // Feet terminate at the existing end of the skids; no floating extra legs.
    b.sleeve(landing,m.rubber,[x*1.24,-1.64,z*1.65],.073,.055,.085,[Math.PI/2,0,0]);
    b.ring(mounts,m.metal,[x*.77,.22,z*.83],.047,.005);
  }
  // Board mounting pillars end exactly on the underside of each existing board.
  for(const [id,cx,cy,cz,w,d] of [['fc',0,.32,.2,.65,.65]]) {
    const owner=batch(id,[0,0,0],'cover');
    for(const x of [-1,1])for(const z of [-1,1]) {
      const px=cx+x*w*.38,pz=cz+z*d*.36,top=cy-(id==='pi'?.05:id==='fc'?.04:.03);
      // Rear supports sit on the raised power board; front supports reach the
      // lower carbon plate. Neither support cuts through the power substrate.
      const support=pz<.195?.26:.177;
      b.sleeve(owner,m.rubber,[px,(top+support)/2,pz],.031,.012,top-support);
    }
  }
  const motors=batch('motors',[2.08,0,2.08],'shaft');
  b.sleeve(motors,m.metal,[0,.708,0],.072,.028,.024);
  // Copy the same local batch at the other three anchors before main instancing.
  const battery=batch('battery');
  for(const z of [-.6,.43]) {
    // Recessed buckle tongue and strap keeper are supported by the existing band.
    b.rod(battery,m.metal,[.603,1.1,z-.075],[.603,1.1,z+.075],.008);
    b.box(battery,m.dark,[-.58,.96,z],[.018,.085,.19]);
  }
  // Match the existing lead exits on the two end caps, not an unrelated side.
  for(const z of [.77,-1.01])b.sleeve(battery,m.rubber,[-.2,.94,z+(z>0?.005:-.005)],.047,.031,.04,[Math.PI/2,0,0]);
  for(const id of ['fc','power','becpi','becfc','pi']) {
    const owner=batch(id,[0,0,0],'devices');
    // Body bottom is boardTop; metal terminations overlap that seat by .001.
    const [cx,y,cz,w,d]={fc:[0,.359,.2,.6,.6],power:[0,.209,-.28,1.15,.85],becpi:[-.62,.389,-.42,.23,.35],becfc:[.62,.389,-.42,.23,.35],pi:[0,-.331,.05,1.05,1.25]}[id];
    // Peripheral SMD bodies with separate metal end caps, not circuit claims.
    for(let i=0;i<6;i++) {
      const x=cx+(i-2.5)*w*.12,z=cz-d*.28;
      b.box(owner,m.ceramic,[x,y+.01,z],[w*.045,.018,.025]);
      for(const side of [-1,1])b.box(owner,m.metal,[x+side*w*.023,y+.01,z],[w*.013,.02,.026]);
    }
  }
  const camera=batch('camera',[0,0,0],'optics');
  b.sleeve(camera,m.dark,[0,-1.25,.61],.123,.109,.018,[Math.PI/2,0,0],64);
  for(let i=0;i<20;i++){const a=i*Math.PI/10;b.rod(camera,m.metal,[Math.cos(a)*.193,-1.25+Math.sin(a)*.193,.5],[Math.cos(a)*.193,-1.25+Math.sin(a)*.193,.54],.003);}
  const cooling=batch('cooling',[0,0,0],'housing');
  for(const x of [-.59,.59])for(const z of [-.52,.66])b.sleeve(cooling,m.rubber,[x,-.355,z],.025,.012,.025);
  const gps=batch('gps',[0,0,0],'mounts');b.sleeve(gps,m.dark,[-.62,1.82,-.78],.065,.036,.035);
  const radio=batch('radio',[0,0,0],'housing');for(const x of [.63,.79])b.socket(radio,m.metal,[x,.835,-.63],.009,[Math.PI/2,0,0]);
  const wiring=batch('wiring',[0,0,0],'connector');
  // Local connector collars and cable separators: no cable spans two moving nodes.
  for(const z of [.5,-1.28])b.sleeve(wiring,m.rubber,[-.55,.65,z],.039,.027,.045,[Math.PI/2,0,0]);
  const sockets=batch('pi',[0,0,0],'connector');let socketGeometry;
  for(const source of groups?.pi?.children||[]){
    const p=source.geometry.parameters;
    if(source.geometry.type!=='RoundedBoxGeometry'||p.width!==.27||p.height!==.18||p.depth!==.2||Math.abs(source.position.z-.51)>.001)continue;
    if(!socketGeometry)socketGeometry=createTwinSocketGeometry();source.geometry=socketGeometry;source.position.y=-.24;source.userData.detailSection='connector';source.name='Двухэтажный корпус USB';
    const x=source.position.x;
    b.box(sockets,m.dark,[x,-.24,.414],[.244,.156,.008]);
    for(const dy of [-.042,.042]){b.box(sockets,m.dark,[x,-.24+dy-.012,.516],[.175,.008,.126]);b.box(sockets,m.contact,[x,-.24+dy-.006,.553],[.15,.002,.03]);}
  }
  b.finish();
  for(const {id,g,anchor,section} of temporary)for(const o of [...g.children]) {
    const copy=at=>{const child=mesh(o.geometry,o.material,id,...at);child.name=g.name;child.userData.detailSection=section;};copy(anchor);
    if(['motors','props','esc'].includes(id)&&anchor[0]>1)for(const x of [-1,1])for(const z of [-1,1])if(x!==1||z!==1)copy([x*anchor[0],anchor[1],z*anchor[2]]);
  }
  for(const material of Object.values(m))material.dispose();
  // The original power substrate (.15–.21) cut into the lower carbon plate
  // (.098–.177). Raise this internal node as a unit, retaining every vertex,
  // material and relative mounting position. Units are illustrative, not mm.
  for(const child of groups?.power.children||[])child.position.y+=.05;
  return {addedBatches:temporary.reduce((n,{g})=>n+g.children.length,0)};
}
