import * as THREE from 'three';

// Reference detailing in the same part groups keeps picking and exploded views intact.
export function refineReference({groups,meshes,mesh,box,cyl,rod,mat,carbon,black,grey,red,rubber}) {
  const remove=o=>{o.parent.remove(o);const i=meshes.indexOf(o);if(i>=0)meshes.splice(i,1);o.geometry.dispose();o.material.dispose();};
  const graphite=mat('#25292d',.22,.46),aluminium=mat('#31363b',.72,.32);
  const fabricCanvas=document.createElement('canvas');fabricCanvas.width=fabricCanvas.height=128;
  const c=fabricCanvas.getContext('2d');c.fillStyle='#303034';c.fillRect(0,0,128,128);
  for(let i=0;i<128;i+=3){c.strokeStyle=i%2?'#424247':'#242428';c.beginPath();c.moveTo(i,0);c.lineTo(i,128);c.stroke();c.strokeStyle='#39393e';c.beginPath();c.moveTo(0,i);c.lineTo(128,i);c.stroke();}
  const cloth=new THREE.CanvasTexture(fabricCanvas);cloth.wrapS=cloth.wrapT=THREE.RepeatWrapping;cloth.repeat.set(6,2);
  const strap=mat('#b2b2b2',0,.92);strap.map=cloth;strap.bumpMap=cloth;strap.bumpScale=.002;
  // Curved, tapered and pitched airfoils rather than flat extruded paddles.
  for(const o of [...groups.props.children]) if(o.geometry.type==='ExtrudeGeometry')remove(o);
  for(const x of[-1,1])for(const z of[-1,1]){
    const mx=x*2.08,mz=z*2.08;
    for(const o of [...groups.motors.children])if(Math.abs(o.position.x-mx)<.01&&Math.abs(o.position.z-mz)<.01&&Math.abs(o.position.y-.66)<.01)remove(o);
    const bell=mesh(new THREE.CylinderGeometry(.247,.247,.19,64,1,true),aluminium,'motors',mx,.61,mz);
    for(const y of[.515,.705]){const ring=mesh(new THREE.TorusGeometry(.24,.013,10,64),black,'motors',mx,y,mz);ring.rotation.x=Math.PI/2;}
    cyl('motors',black,mx,.68,mz,.074,.09);
    for(let k=0;k<7;k++){const a=k*Math.PI*2/7;rod('motors',aluminium,[mx+Math.cos(a)*.07,.695,mz+Math.sin(a)*.07],[mx+Math.cos(a+.15)*.234,.695,mz+Math.sin(a+.15)*.234],.017);}
    const angle=x*z>0?(x>0?-.95:-.4):1.13;
    for(const side of[0,Math.PI]){
      const vertices=[],uv=[],indices=[];const n=44,m=10;
      for(let i=0;i<=n;i++){
        const t=i/n,r=.065+t*1.51;
        const width=.025+.14*Math.pow(Math.sin(Math.PI*t),.65)*(1-.36*t);
        const sweep=.11*Math.sin(t*Math.PI)-.055*t;
        for(let j=0;j<=m;j++){
          const v=j/m-.5,across=v*width*2+sweep;
          const yy=.79+v*width*(.62-.48*t)+Math.sin(j/m*Math.PI)*.018*Math.sin(t*Math.PI);
          const a=angle+side;
          vertices.push(mx+r*Math.cos(a)-across*Math.sin(a),yy,mz+r*Math.sin(a)+across*Math.cos(a));uv.push(t,j/m);
          if(i<n&&j<m){const p=i*(m+1)+j;indices.push(p,p+m+1,p+1,p+1,p+m+1,p+m+2);}
        }
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
      const blade=graphite.clone();blade.side=THREE.DoubleSide;blade.map=carbon.map;blade.bumpMap=carbon.map;blade.bumpScale=.001;mesh(g,blade,'props');
    }
    cyl('props',red,mx,.807,mz,.105,.016);cyl('props',grey,mx,.857,mz,.043,.045);
  }
  // Woven bands wrap the pack with rounded corners and red stitched edges.
  for(const o of [...groups.wiring.children])if((Math.abs(o.position.z+.6)<.001||Math.abs(o.position.z-.43)<.001)&&o.position.y>.75)remove(o);
  function rounded(w,h,r){const s=new THREE.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
  for(const z of[-.6,.43]){
    const s=rounded(1.15,.77,.115),hole=rounded(1.105,.72,.095);s.holes.push(hole);
    mesh(new THREE.ExtrudeGeometry(s,{depth:.17,bevelEnabled:false,curveSegments:12}),strap,'wiring',0,.922,z-.085);
    for(const dz of[-.083,.083]){const points=s.getPoints(64).map(p=>new THREE.Vector3(p.x,p.y+.922,z+dz));const curve=new THREE.CatmullRomCurve3(points,true);mesh(new THREE.TubeGeometry(curve,100,.0038,4,true),mat('#9b4853',0,.85),'wiring');}
    box('wiring',red,.584,.84,z,.028,.17,.195);
  }
  // Front cooling enclosure: fan hub, circular grille, corner screws.
  for(let i=0;i<3;i++){const ring=mesh(new THREE.TorusGeometry(.18+i*.067,.013,8,56),black,'cooling',0,-.65,.846);}
  const hub=cyl('cooling',grey,0,-.65,.867,.117,.025);hub.rotation.x=Math.PI/2;
  for(const x of[-.44,.44])for(const y of[-.83,-.47]){const b=cyl('cooling',black,x,y,.817,.025,.018);b.rotation.x=Math.PI/2;}
  // Cable loops and connector sockets visible beside the pack.
  for(const z of[.77,-1.01]){
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.2,.94,z),new THREE.Vector3(-.62,.84,z+.1),new THREE.Vector3(-.69,.63,z-.12),new THREE.Vector3(-.55,.65,z-.25)]);
    mesh(new THREE.TubeGeometry(curve,40,.029,10,false),red,'wiring');
    const connector=box('wiring',mat('#dba53b',.2,.5),-.56,.67,z-.27,.16,.12,.12);
    for(const dx of[-.035,.035])cyl('wiring',black,-.56+dx,.735,z-.27,.019,.008);
  }
  // Neutral, dark polymer end caps and subtle battery sleeve seams.
  groups.battery.children.forEach(o=>{if(o.geometry.type!=='PlaneGeometry')o.material.color.set(o.position.z>.7||o.position.z<-.9?'#24292d':'#51575c');});
  for(const x of[-.49,.49])box('battery',graphite,x,.92,-.12,.012,.58,1.58);
  for(const o of [...groups.wiring.children]){
    const p=o.geometry.parameters?.path?.points?.[0];
    if(p&&((p.x===.25&&p.y===1.03)||(p.x===.1&&p.y===.95)))remove(o);
    else if(Math.abs(o.position.x-.55)<.001&&Math.abs(o.position.y-.8)<.001)remove(o);
    else if(Math.abs(o.position.x-.72)<.001&&Math.abs(o.position.z-1.04)<.001)remove(o);
  }
  box('cooling',graphite,0,-.325,.08,1.24,.035,1.46);
}
