import * as THREE from 'three';

// Render the actual catalog models lazily, one visible card per frame. A single
// small renderer and a bounded image cache avoid a WebGL context per card.
export function createFurnitureThumbnails(build) {
  const cache = new Map(), queue = [];
  let renderer, scheduled = false;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0e9);
  scene.add(new THREE.HemisphereLight(0xe5f0ff, 0xb0a18c, 0.7));
  const sun = new THREE.DirectionalLight(0xffedcf, 0.9); sun.position.set(-4, 8, 6); scene.add(sun);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 200);
  function tick() {
    scheduled = false;
    const image = queue.shift();
    if (image?.isConnected) {
      const type = image.dataset.thumbnail;
      if (!cache.has(type)) {
        renderer ||= new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(224, 168); renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping;
        const object = build(type); scene.add(object); object.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(object), center = bounds.getCenter(new THREE.Vector3());
        const radius = Math.max(bounds.getSize(new THREE.Vector3()).length() * 0.52, 0.5);
        camera.left = -radius * 4 / 3; camera.right = radius * 4 / 3; camera.top = radius; camera.bottom = -radius;
        camera.position.copy(center).add(new THREE.Vector3(1, 0.85, 1).normalize().multiplyScalar(radius * 4));
        camera.lookAt(center); camera.updateProjectionMatrix(); renderer.render(scene, camera);
        cache.set(type, renderer.domElement.toDataURL('image/png'));
        scene.remove(object); object.traverse(o => o.geometry?.dispose());
      }
      image.src = cache.get(type); image.classList.add('ready');
    }
    if (queue.length) { scheduled = true; requestAnimationFrame(tick); }
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      observer.unobserve(entry.target); queue.push(entry.target);
    }
    if (queue.length && !scheduled) { scheduled = true; requestAnimationFrame(tick); }
  }, { rootMargin: '100px' });
  return {
    observe(root) {
      observer.disconnect(); queue.length = 0;
      root.querySelectorAll('[data-thumbnail]').forEach(image => {
        const cached = cache.get(image.dataset.thumbnail);
        if (cached) { image.src = cached; image.classList.add('ready'); }
        else observer.observe(image);
      });
    }
  };
}
