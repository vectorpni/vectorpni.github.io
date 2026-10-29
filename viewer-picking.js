import {Box3,Matrix4} from 'three';

// Parts contain static geometry; assembly moves their parent groups. Reject
// whole parts before triangle/instance tests, retaining Three's exact nearest
// intersection, layers and instanceId. Arrays and bounds are reused per pointer.
export function createPartPicker(groups) {
  const inverse=new Matrix4(),candidates=[],hits=[];
  const entries=Object.values(groups).map(group=>{
    const meshes=[];group.traverse(o=>{if(o.isMesh)meshes.push(o);});
    const world=new Box3().setFromObject(group);
    const local=world.clone().applyMatrix4(inverse.copy(group.matrixWorld).invert());
    return {group,meshes,local,world,matrix:group.matrixWorld.clone()};
  }).filter(entry=>entry.meshes.length);
  return raycaster=>{
    candidates.length=0;hits.length=0;
    for(const entry of entries){
      if(!entry.matrix.equals(entry.group.matrixWorld)){
        entry.matrix.copy(entry.group.matrixWorld);
        entry.world.copy(entry.local).applyMatrix4(entry.matrix);
      }
      if(raycaster.ray.intersectsBox(entry.world))for(const mesh of entry.meshes)candidates.push(mesh);
    }
    raycaster.intersectObjects(candidates,false,hits);
    return hits[0]||null;
  };
}
