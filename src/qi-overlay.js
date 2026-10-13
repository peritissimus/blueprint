import * as THREE from 'three';
import { computeQiFlow } from './qi-flow.js';

const TRAIL_SAMPLES = 26;

export function createQiOverlay(scene, getModel, onEnable) {
  const root = new THREE.Group(); root.visible = false; scene.add(root);
  const toggle = document.getElementById('qiToggle'), panel = document.getElementById('qiPanel');
  const entrance = document.getElementById('qiEntrance'), summary = document.getElementById('qiSummary');
  const pause = document.getElementById('qiPause'), speed = document.getElementById('qiSpeed');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let lastRevision = -1;
  let enabled = false, paused = reduced.matches, lastKey = '', lastCheck = -Infinity, time = 0, lastNow = 0, paths = [], particles = null, ribbonMaterial = null, entranceHalo = null;
  function clear() {
    root.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); }); root.clear(); paths = []; particles = null; ribbonMaterial = null; entranceHalo = null;
  }
  function dots(points, color, size) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(p[0],0.19,p[1])));
    const material = new THREE.PointsMaterial({ color, size: size * 24, sizeAttenuation: false, transparent: true, opacity: 0.85, depthWrite: false });
    material.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (length(gl_PointCoord - vec2(0.5)) > 0.5) discard;');
    };
    const object = new THREE.Points(geometry, material); object.raycast = () => {}; root.add(object); return object;
  }
  function rebuild(model) {
    clear();
    const selected = entrance.value;
    const doors = model.doors;
    entrance.replaceChildren();
    doors.forEach(door => { const option = document.createElement('option'); option.value = door.key; option.textContent = door.name; entrance.append(option); });
    if (doors.some(d => d.key === selected)) entrance.value = selected;
    else entrance.value = (doors.find(d => d.main) || doors[0])?.key || '';
    entrance.disabled = !doors.length;
    const source = doors.find(d => d.key === entrance.value);
    const result = computeQiFlow({ ...model, entrance: source?.point });
    if (result.reason) summary.textContent = result.reason;
    else summary.textContent = `${Math.round(result.reached / result.total * 100)}% of open floor connects to this door in the simplified circulation model.`;
    const vertices = [], distances = [], sides = [], seen = new Set();
    result.paths.forEach(path => {
      const cumulative = [0];
      for (let i=1; i<path.length; i++) {
        cumulative.push(cumulative[i-1]+Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]));
        const a=path[i-1], b=path[i], dx=b[0]-a[0], dz=b[1]-a[1], len=Math.hypot(dx,dz);
        const key = [a[0],a[1],b[0],b[1]].join(',');
        if (len < 0.001 || seen.has(key)) continue;
        seen.add(key);
        const nx=-dz/len*0.16, nz=dx/len*0.16;
        vertices.push(a[0]+nx,0.17,a[1]+nz,a[0]-nx,0.17,a[1]-nz,b[0]+nx,0.17,b[1]+nz,
          b[0]+nx,0.17,b[1]+nz,a[0]-nx,0.17,a[1]-nz,b[0]-nx,0.17,b[1]-nz);
        const from=cumulative[i-1], to=cumulative[i];
        distances.push(from,from,to,to,from,to); sides.push(1,-1,1,1,-1,-1);
      }
      paths.push({ points: path, cumulative, length: cumulative.at(-1) });
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    geometry.setAttribute('aDistance',new THREE.Float32BufferAttribute(distances,1));
    geometry.setAttribute('aSide',new THREE.Float32BufferAttribute(sides,1));
    // Animate light along the existing obstacle-safe routes on the GPU.
    ribbonMaterial = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: time } }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: `attribute float aDistance; attribute float aSide; varying float vDistance; varying float vSide;
        void main() { vDistance=aDistance; vSide=aSide; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform float uTime; varying float vDistance; varying float vSide;
        void main() {
          float tail=mod(uTime*3.3-vDistance+1600.0,16.0);
          float wave=exp(-tail*0.48)*(1.0-smoothstep(6.0,9.0,tail));
          float edge=1.0-smoothstep(0.12,1.0,abs(vSide));
          float core=1.0-smoothstep(0.05,0.30,abs(vSide));
          vec3 color=mix(vec3(0.05,0.40,0.43),vec3(0.12,0.85,0.72),wave);
          color=mix(color,vec3(0.85,1.0,0.88),core*wave*0.7);
          gl_FragColor=vec4(color,edge*(0.15+wave*0.65)+core*0.14);
        }`
    });
    const ribbons = new THREE.Mesh(geometry,ribbonMaterial); ribbons.raycast=()=>{}; root.add(ribbons);
    dots(result.tight,0xd69b3b,0.13); dots(result.unreachable,0xc1778b,0.12);
    if (result.entrance) {
      dots([result.entrance],0xe5ac36,0.5);
      entranceHalo = new THREE.Mesh(new THREE.PlaneGeometry(2.8,2.8),new THREE.ShaderMaterial({
        uniforms:{uTime:{value:time}},transparent:true,depthWrite:false,side:THREE.DoubleSide,
        vertexShader:`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader:`uniform float uTime; varying vec2 vUv;
          void main(){
            float r=length(vUv-0.5)*2.0;
            float phase=fract(uTime*0.42);
            float ring=exp(-pow((r-(0.20+phase*0.72))*30.0,2.0))*(1.0-phase);
            float phase2=fract(uTime*0.42+0.5);
            ring+=exp(-pow((r-(0.20+phase2*0.72))*30.0,2.0))*(1.0-phase2);
            float glow=exp(-r*r*12.0);
            gl_FragColor=vec4(mix(vec3(0.10,0.67,0.58),vec3(1.0,0.73,0.24),glow),ring*0.65+glow*0.25);
          }`
      }));
      entranceHalo.rotation.x=-Math.PI/2;
      entranceHalo.position.set(result.entrance[0],0.25,result.entrance[1]); entranceHalo.raycast=()=>{}; root.add(entranceHalo);
    }
    // Each route carries two comets, with tapering tails and a luminous head.
    const count=paths.length*2*TRAIL_SAMPLES, positions=new Float32Array(count*3), ages=new Float32Array(count);
    for(let i=0;i<count;i++) ages[i]=(i%TRAIL_SAMPLES)/(TRAIL_SAMPLES-1);
    const cometGeo=new THREE.BufferGeometry(); cometGeo.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
    cometGeo.setAttribute('aAge',new THREE.BufferAttribute(ages,1));
    particles=new THREE.Points(cometGeo,new THREE.ShaderMaterial({
      uniforms:{uRatio:{value:Math.min(window.devicePixelRatio||1,2)}},transparent:true,depthWrite:false,
      vertexShader:`attribute float aAge; uniform float uRatio; varying float vAge;
        void main(){vAge=aAge;gl_PointSize=(13.0-8.0*aAge)*uRatio;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader:`varying float vAge;
        void main(){
          float r=length(gl_PointCoord-0.5)*2.0;
          float halo=exp(-r*r*4.0)*(1.0-smoothstep(0.65,1.0,r));
          float core=1.0-smoothstep(0.10,0.40,r);
          vec3 color=mix(vec3(0.02,0.60,0.56),vec3(0.92,1.0,0.76),core*(1.0-vAge));
          gl_FragColor=vec4(color,halo*pow(1.0-vAge,1.5)*0.92);
        }`
    }));
    particles.frustumCulled=false; particles.raycast=()=>{}; root.add(particles);
    positionParticles();
  }
  function positionParticles() {
    if (!particles) return;
    ribbonMaterial.uniforms.uTime.value=time;
    if (entranceHalo) entranceHalo.material.uniforms.uTime.value=time;
    const attr = particles.geometry.attributes.position;
    paths.forEach((path,i) => {
      for (let j=0;j<2;j++) {
        const head=(time*3.3+path.length*j/2+i*1.7)%path.length;
        // Find the head once. Each tail sample only moves backwards along the route.
        let k=1;
        while(k<path.cumulative.length-1 && path.cumulative[k]<head) k++;
        for(let tail=0;tail<TRAIL_SAMPLES;tail++) {
          // Clamp tails at the entrance: wrapping them would light the destination before arrival.
          const at=Math.max(0,head-tail*0.12);
          while(k>1 && path.cumulative[k-1]>at) k--;
          const t=(at-path.cumulative[k-1])/(path.cumulative[k]-path.cumulative[k-1]||1),a=path.points[k-1],b=path.points[k];
          attr.setXYZ((i*2+j)*TRAIL_SAMPLES+tail,a[0]+(b[0]-a[0])*t,0.23,a[1]+(b[1]-a[1])*t);
        }
      }
    });
    attr.needsUpdate=true;
  }

  function updatePause() { pause.textContent = paused ? 'Play flow' : 'Pause flow'; pause.setAttribute('aria-pressed',String(!paused)); }
  function setEnabled(on) {
    enabled=on; root.visible=on; panel.hidden=!on; toggle.setAttribute('aria-pressed',String(on));
    document.body.classList.toggle('qi-active',on);
    if (on) { lastKey=''; lastCheck=-Infinity; } else clear();
    onEnable(on);
  }
  const details = document.getElementById('qiDetails');
  let compact = matchMedia('(max-width: 860px)').matches;
  function updateDetails() { panel.classList.toggle('qi-collapsed',compact); details.textContent=compact?'Details':'Less'; details.setAttribute('aria-expanded',String(!compact)); }
  details.addEventListener('click',()=>{ compact=!compact; updateDetails(); });
  updateDetails();
  toggle.addEventListener('click',()=>setEnabled(!enabled));
  document.getElementById('qiClose').addEventListener('click',()=>{ setEnabled(false); toggle.focus(); });
  pause.addEventListener('click',()=>{ paused=!paused; updatePause(); });
  reduced.addEventListener('change',()=>{ if(reduced.matches) { paused=true; updatePause(); } });
  entrance.addEventListener('change',()=>{ lastKey=''; lastCheck=-Infinity; });
  speed.addEventListener('input',()=>{ document.getElementById('qiSpeedOut').textContent=speed.value+'×'; });
  updatePause();
  return {
    update(now, walking, revision) {
      let changed = false;
      const dt=Math.min(0.05,Math.max(0,(now-lastNow)/1000)); lastNow=now;
      if (!enabled) return false;
      changed = root.visible !== !walking;
      root.visible=!walking;
      if (walking) {
        if (lastKey) summary.textContent='Return to Plan or 2.5D to see the flow overlay.';
        lastKey=''; return changed;
      }
      if(now-lastCheck>350 && (revision!==lastRevision || !lastKey)) {
        lastCheck=now; lastRevision=revision; const model=getModel(); const key=JSON.stringify([model.bounds,model.walls,model.furniture,model.doors,model.footprint,entrance.value]);
        if(key!==lastKey) { changed=true; rebuild(model); lastKey=JSON.stringify([model.bounds,model.walls,model.furniture,model.doors,model.footprint,entrance.value]); }
      }
      if(!paused && !document.hidden && !document.querySelector('dialog[open]')) { time+=dt*Number(speed.value); positionParticles(); changed=true; }
      return changed;
    }
  };
}
