import * as THREE from 'three';

// Small deterministic textures: no downloads, runtime noise or per-frame work.
export function createCarbonTextures(anisotropy=1) {
  const size=256,color=new Uint8Array(size*size*4),surface=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const cx=Math.floor(x/16),cy=Math.floor(y/16),horizontal=((cx-cy+16)%4)<2;
    const strand=(horizontal?y:x)%16,along=(horizontal?x:y)%16;
    const crown=Math.sin(Math.PI*(strand+.5)/16),filament=Math.cos(strand*Math.PI*.75);
    const tone=48+17*crown+2*filament+2*Math.sin(along*Math.PI/16),i=(y*size+x)*4;
    color[i]=tone*.94;color[i+1]=tone*.98;color[i+2]=tone;color[i+3]=255;
    // R: height, G: roughness. Both remain linear non-color data.
    surface[i]=112+28*crown+3*filament;surface[i+1]=208+15*(1-crown);surface[i+2]=255;surface[i+3]=255;
  }
  const make=(data,colorSpace)=>{const t=new THREE.DataTexture(data,size,size);t.colorSpace=colorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(5,5);t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=anisotropy;t.needsUpdate=true;return t;};
  return {color:make(color,THREE.SRGBColorSpace),surface:make(surface,THREE.NoColorSpace)};
}

export function applyStudioMaterials(groups,carbonTexture,anisotropy=1) {
  const carbon=createCarbonTextures(anisotropy),clothData=new Map();
  for(const [id,group]of Object.entries(groups))for(const o of group.children){
    if(!o.isMesh)continue;const m=o.material,hex=m.color.getHexString();
    if(m.map===carbonTexture){
      if(id==='props'){
        // Project data describes reinforced polymer, not bare carbon fabric.
        m.map=null;m.bumpMap=null;m.metalness=0;m.roughness=.52;m.color.set('#22272a');m.envMapIntensity=.75;
      }else{
        m.map=carbon.color;m.bumpMap=carbon.surface;m.roughnessMap=carbon.surface;m.bumpScale=.0009;m.metalness=0;m.roughness=.55;m.color.set('#7d858a');m.envMapIntensity=.75;
        if(hex==='353a3c'){m.roughness=.86;m.bumpScale=.0004;m.color.set('#62686b');}
        if(id==='frame'&&o.geometry.type==='ExtrudeGeometry'){
          // Optical laminate edge treatment only: vertex positions/normals and
          // triangles are untouched, and the plate remains one draw call.
          const g=o.geometry,p=g.attributes.position,n=g.attributes.normal,c=new Float32Array(p.count*3);
          for(let i=0;i<p.count;i++){
            const face=Math.abs(n.getZ(i)),layers=.5+.065*Math.cos(p.getZ(i)*Math.PI*240),shade=THREE.MathUtils.lerp(layers,1,Math.pow(face,4));
            c[i*3]=shade;c[i*3+1]=shade;c[i*3+2]=shade;
          }
          g.setAttribute('color',new THREE.BufferAttribute(c,3));m.vertexColors=true;
        }
      }
    }else if(m.map&&m.roughness>=.9){
      // Textile color and height have distinct encodings, shared by both bands.
      const source=m.map;source.colorSpace=THREE.SRGBColorSpace;source.needsUpdate=true;
      if(!clothData.has(source)){const data=source.clone();data.colorSpace=THREE.NoColorSpace;data.needsUpdate=true;clothData.set(source,data);}
      m.bumpMap=clothData.get(source);m.bumpScale=.00065;m.color.set('#c7c9c9');m.metalness=0;m.roughness=.94;
    }else if(m.map){m.map.colorSpace=THREE.SRGBColorSpace;m.map.needsUpdate=true;m.metalness=0;m.roughness=.68;}
    else if(['183c59','254b56'].includes(hex)){
      m.color.set(hex==='183c59'?'#172c35':'#253e47');m.metalness=0;m.roughness=.075;m.envMapIntensity=1.65;
    }else if(['ad6b3c','a96e38'].includes(hex)){m.metalness=.96;m.roughness=.34;}
    else if(hex==='adb5b8'){m.metalness=.96;m.roughness=.3;m.color.set('#9ea5a8');}
    else if(hex==='d4aa46'){m.metalness=id==='wiring'?0:.95;m.roughness=id==='wiring'?.6:.32;}
    else if(hex==='dba53b'||o.geometry.type==='TubeGeometry'){m.metalness=0;m.roughness=id==='battery'?.9:.67;}
    else if(['264b38','234a37'].includes(hex)){m.metalness=0;m.roughness=.64;}
    else if(hex==='51575c'){m.metalness=0;m.roughness=.43;m.color.set('#3c4349');}
    else if(hex==='24292d'){m.metalness=0;m.roughness=.64;}
    else if(hex==='202321'){m.metalness=0;m.roughness=.88;}
    else if(hex==='121817'){m.metalness=0;m.roughness=.6;}
    else if(hex==='31363b'){m.metalness=.88;m.roughness=.37;}
    else if(hex==='454c53'){
      if(m.metalness>.7){m.metalness=.92;m.roughness=.32;m.color.set('#7a838a');}
      else{m.metalness=.8;m.roughness=.43;}
    }else if(hex==='b83239'){m.metalness=['frame','props'].includes(id)?.75:0;m.roughness=['frame','props'].includes(id)?.38:.63;}
    else if(hex==='25292d'){m.metalness=0;m.roughness=.57;}
    m.needsUpdate=true;
  }
  // Removed color/height texture was never uploaded. The new textures are owned
  // by the scene materials and follow the existing shared-resource cleanup.
  carbonTexture.dispose();
  return carbon;
}

export function configureStudioLighting(scene,renderer,{preview=false}={}) {
  renderer.toneMappingExposure=.98;scene.environmentIntensity=.75;
  const hemi=scene.children.find(o=>o.isHemisphereLight),directional=scene.children.filter(o=>o.isDirectionalLight);
  if(hemi){hemi.color.set('#f4f6f8');hemi.groundColor.set('#838b8c');hemi.intensity=.95;}
  if(directional[0]){directional[0].color.set('#fff8ef');directional[0].intensity=2.6;directional[0].position.set(-3.8,6.5,4.5);}
  if(directional[1]){directional[1].color.set('#edf3ff');directional[1].intensity=1.35;directional[1].position.set(-4,3,-4);}
  // Environment supplies broad fill. No extra realtime light or shadow pass.
  if(preview)scene.environmentIntensity=1;
}

export function createStudioEnvironment(renderer,size=256) {
  const room=new THREE.Scene(),geometry=new THREE.PlaneGeometry(1,1),materials=[];
  const addCard=(position,dimensions,intensity,color='#ffffff')=>{
    const material=new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(intensity),toneMapped:false,side:THREE.DoubleSide});materials.push(material);
    const card=new THREE.Mesh(geometry,material);card.position.set(...position);card.scale.set(...dimensions,1);card.lookAt(0,0,0);room.add(card);
  };
  const enclosureGeometry=new THREE.BoxGeometry(30,30,30),enclosureMaterial=new THREE.MeshBasicMaterial({color:'#5f666c',side:THREE.BackSide,toneMapped:false});room.add(new THREE.Mesh(enclosureGeometry,enclosureMaterial));
  addCard([-4,6,4],[6,9],3.3,'#fff8f0');addCard([5,2,1],[5,8],1.4,'#f2f6ff');addCard([-2,4,-6],[3,9],2.8,'#f2f6ff');addCard([0,8,0],[7,5],1.8);
  const pmrem=new THREE.PMREMGenerator(renderer);
  try{return pmrem.fromScene(room,.025,.1,100,{size});}
  finally{pmrem.dispose();geometry.dispose();enclosureGeometry.dispose();enclosureMaterial.dispose();materials.forEach(m=>m.dispose());}
}
