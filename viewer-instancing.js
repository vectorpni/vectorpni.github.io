import * as THREE from 'three';
const sourceMeshes = new WeakMap();
export const getPartSourceMeshes = group => sourceMeshes.get(group) || group.children;

// Compare actual vertex data, not constructor names: custom airfoils stay distinct.
function geometryKey(geometry) {
  let hash = 2166136261;
  const attributes = [...Object.entries(geometry.attributes).sort(([a], [b]) => a.localeCompare(b)), ['index', geometry.index]].filter(([, a]) => a);
  const layout = attributes.map(([name, a]) => {
    const bytes = new Uint8Array(a.array.buffer, a.array.byteOffset, a.array.byteLength);
    for (let i = 0; i < bytes.length; i++) hash = Math.imul(hash ^ bytes[i], 16777619);
    return [name, a.itemSize, a.normalized, a.array.constructor.name, a.count];
  });
  return JSON.stringify([layout, geometry.groups, geometry.drawRange, hash >>> 0]);
}
function sameGeometry(a, b) {
  for (const key of [...Object.keys(a.attributes), 'index']) {
    const x = key === 'index' ? a.index : a.attributes[key], y = key === 'index' ? b.index : b.attributes[key];
    if (!x || !y) { if (x !== y) return false; else continue; }
    const left = new Uint8Array(x.array.buffer, x.array.byteOffset, x.array.byteLength), right = new Uint8Array(y.array.buffer, y.array.byteOffset, y.array.byteLength);
    if (left.length !== right.length) return false;
    for (let i = 0; i < left.length; i++) if (left[i] !== right[i]) return false;
  }
  return true;
}
function materialKey(material) {
  // Include every enumerable material setting, except identity/bookkeeping.
  const fields = {};
  for (const key of Object.keys(material).sort()) {
    if (['uuid', 'id', 'name', 'version'].includes(key)) continue;
    const value = material[key];
    fields[key] = value?.isTexture ? value.uuid : value?.toArray ? value.toArray() : value;
  }
  return JSON.stringify(fields);
}

export function instancePartMeshes(groups, meshes) {
  const canonicalGeometry = new WeakMap(), geometryBuckets = new Map();
  const rendered = [];
  const intern = geometry => {
    if (canonicalGeometry.has(geometry)) return canonicalGeometry.get(geometry);
    if (Object.keys(geometry.morphAttributes).length || Object.values(geometry.attributes).some(a => a.isInterleavedBufferAttribute)) return geometry;
    const key = geometryKey(geometry), bucket = geometryBuckets.get(key) || [];
    const existing = bucket.find(other => sameGeometry(other, geometry));
    if (existing) { canonicalGeometry.set(geometry, existing); geometry.dispose(); return existing; }
    bucket.push(geometry); geometryBuckets.set(key, bucket); canonicalGeometry.set(geometry, geometry); return geometry;
  };
  for (const [id, group] of Object.entries(groups)) {
    const originals = [...group.children], materials = new Map(), batches = new Map();
    sourceMeshes.set(group, originals);
    for (const mesh of originals) {
      if (!mesh.isMesh || Array.isArray(mesh.material) || !mesh.material.isMeshStandardMaterial || mesh.material.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile) { rendered.push(mesh); continue; }
      mesh.geometry = intern(mesh.geometry);
      const signature = materialKey(mesh.material), shared = materials.get(signature);
      if (shared) { if (shared !== mesh.material) mesh.material.dispose(); mesh.material = shared; }
      else materials.set(signature, mesh.material);
      mesh.updateMatrix(); mesh.matrixAutoUpdate = false;
      if (mesh.material.transparent || mesh.matrix.determinant() <= 0 || Object.keys(mesh.geometry.morphAttributes).length) { rendered.push(mesh); continue; }
      const key = [mesh.geometry.uuid, mesh.material.uuid, mesh.renderOrder, mesh.castShadow, mesh.receiveShadow, mesh.layers.mask].join(':');
      const batch = batches.get(key) || []; batch.push(mesh); batches.set(key, batch);
    }
    for (const batch of batches.values()) {
      if (batch.length === 1) { rendered.push(batch[0]); continue; }
      const first = batch[0], instances = new THREE.InstancedMesh(first.geometry, first.material.clone(), batch.length);
      instances.userData.part = id; instances.castShadow = first.castShadow; instances.receiveShadow = first.receiveShadow;
      instances.renderOrder = first.renderOrder; instances.layers.mask = first.layers.mask; instances.matrixAutoUpdate = false;
      batch.forEach((mesh, i) => { instances.setMatrixAt(i, mesh.matrix); group.remove(mesh); });
      instances.instanceMatrix.needsUpdate = true; instances.computeBoundingBox(); instances.computeBoundingSphere();
      group.add(instances); rendered.push(instances);
    }
  }
  meshes.splice(0, meshes.length, ...rendered);
}
