import * as THREE from 'three';
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Furniture is selected and moved as a whole. Batch its opaque parts and ink
// into fewer draw calls, preserving every vertex, material and local transform.
// Transparent meshes stay separate so Three can sort their depth correctly.
export function batchFurniture(root) {
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert();
  for (const lines of [true, false]) {
    const buckets = new Map();
    root.traverse(object => {
      if (lines ? !object.isLineSegments : !object.isMesh) return;
      const material = object.material, geometry = object.geometry;
      if (Array.isArray(material) || (!lines && material.transparent) || object.children.length || !object.visible) return;
      const attributes = Object.entries(geometry.attributes).map(([name, a]) => `${name}:${a.itemSize}:${a.normalized}:${a.array.constructor.name}`).sort().join('|');
      const key = `${material.uuid}:${object.castShadow}:${object.receiveShadow}:${object.renderOrder}:${!!geometry.index}:${attributes}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(object);
    });
    for (const objects of buckets.values()) {
      if (objects.length < 2) continue;
      const copies = objects.map(object => object.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld)));
      const geometry = mergeBufferGeometries(copies, false);
      copies.forEach(copy => copy.dispose());
      if (!geometry) continue;
      const first = objects[0];
      const merged = lines ? new THREE.LineSegments(geometry, first.material) : new THREE.Mesh(geometry, first.material);
      merged.castShadow = first.castShadow; merged.receiveShadow = first.receiveShadow; merged.renderOrder = first.renderOrder;
      if (lines) merged.raycast = () => {};
      for (const object of objects) { object.removeFromParent(); object.geometry.dispose(); }
      root.add(merged);
    }
  }
}
