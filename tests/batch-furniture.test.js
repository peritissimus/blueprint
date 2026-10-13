import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { batchFurniture } from '../src/batch-furniture.js';

const near = (a, b) => assert.ok(a.distanceTo(b) < 1e-5, `${a.toArray()} != ${b.toArray()}`);

test('batching preserves nested transforms, bounds, material and picking', () => {
  const root = new THREE.Group(), nested = new THREE.Group();
  root.position.set(3, 2, -4); root.rotation.y = 0.7;
  nested.position.set(2, 1, 3); nested.rotation.y = 0.4; root.add(nested);
  const material = new THREE.MeshStandardMaterial();
  for (const x of [-2, 2]) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), material);
    mesh.position.x = x; mesh.castShadow = mesh.receiveShadow = true; nested.add(mesh);
  }
  const before = new THREE.Box3().setFromObject(root, true);
  batchFurniture(root);
  const after = new THREE.Box3().setFromObject(root, true), meshes = [];
  root.traverse(o => { if (o.isMesh) meshes.push(o); });
  assert.equal(meshes.length, 1); assert.equal(meshes[0].material, material);
  assert.equal(meshes[0].castShadow, true); assert.equal(meshes[0].receiveShadow, true);
  near(before.min, after.min); near(before.max, after.max);
  const center = new THREE.Vector3(-2, 0, 0).applyMatrix4(nested.matrixWorld);
  const ray = new THREE.Raycaster(center.clone().add(new THREE.Vector3(0, 10, 0)), new THREE.Vector3(0, -1, 0));
  assert.ok(ray.intersectObject(root, true).some(hit => hit.object === meshes[0]));
});

test('transparent parts retain separate transforms and draw objects', () => {
  const root = new THREE.Group(), material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.5 });
  const parts = [0, 3].map(x => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material); mesh.position.x = x; root.add(mesh); return mesh; });
  batchFurniture(root);
  assert.deepEqual(root.children, parts);
  assert.equal(parts[1].position.x, 3);
});

test('ink batches independently of meshes and does not intercept selection', () => {
  const root = new THREE.Group(), material = new THREE.MeshBasicMaterial(), ink = new THREE.LineBasicMaterial({ transparent: true });
  for (const x of [0, 2]) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material); mesh.position.x = x;
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), ink)); root.add(mesh);
  }
  batchFurniture(root);
  assert.equal(root.children.length, 2);
  const lines = root.children.find(o => o.isLineSegments);
  assert.equal(lines.geometry.attributes.position.count, 48);
  const hits = []; lines.raycast(new THREE.Raycaster(), hits); assert.equal(hits.length, 0);
  assert.equal(root.children.filter(o => o.isMesh).length, 1);
});
