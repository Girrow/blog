import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080a11);
scene.fog = new THREE.Fog(0x080a11, 14, 56);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 120);
camera.position.set(0, 6, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.append(renderer.domElement);

const statusEl = document.getElementById('status');
const stageEl = document.getElementById('stage');
const hintEl = document.getElementById('hint');

const shared = {
  floor: new THREE.MeshStandardMaterial({ color: 0x121827, roughness: 0.95 }),
  wall: new THREE.MeshStandardMaterial({ color: 0x232a3a, roughness: 0.9 }),
  posterFrame: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42 }),
  player: new THREE.MeshStandardMaterial({ color: 0x66ffc7, roughness: 0.3, metalness: 0.5 }),
  portal: new THREE.MeshStandardMaterial({ color: 0x77a8ff, emissive: 0x3367ff, emissiveIntensity: 1.1 }),
  easter: new THREE.MeshStandardMaterial({ color: 0xffbf6c, emissive: 0x995500, emissiveIntensity: 0.5 }),
};

const world = new THREE.Group();
scene.add(world);

const ambient = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambient);
const mainLight = new THREE.DirectionalLight(0x9fb6ff, 1.2);
mainLight.position.set(6, 10, 6);
mainLight.castShadow = true;
mainLight.shadow.mapSize.set(1024, 1024);
scene.add(mainLight);
const moodLight = new THREE.PointLight(0xff72da, 18, 20, 2);
moodLight.position.set(0, 3, 0);
scene.add(moodLight);

const textureLoader = new THREE.TextureLoader();
const posterTextures = [
  'https://picsum.photos/id/1005/1024/768',
  'https://picsum.photos/id/1011/1024/768',
  'https://picsum.photos/id/1021/1024/768',
  'https://picsum.photos/id/1033/1024/768',
  'https://picsum.photos/id/1043/1024/768',
  'https://picsum.photos/id/1052/1024/768',
].map((u) => {
  const t = textureLoader.load(u);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
});

const stages = [
  { name: 'Gallery Gate', center: new THREE.Vector3(0, 0, 0), color: 0x121827 },
  { name: 'Memory Plaza', center: new THREE.Vector3(26, 0, 0), color: 0x1f1628 },
  { name: 'Sky Archive', center: new THREE.Vector3(52, 0, -6), color: 0x10252a },
];

const stageRadius = 11;
const portals = [];
const easterEggs = [];

function createStage(stage, i) {
  const group = new THREE.Group();
  group.position.copy(stage.center);
  world.add(group);

  const floor = new THREE.Mesh(new THREE.CylinderGeometry(stageRadius, stageRadius, 1.4, 32), shared.floor);
  floor.receiveShadow = true;
  floor.position.y = -0.8;
  floor.material = floor.material.clone();
  floor.material.color.setHex(stage.color);
  group.add(floor);

  for (let w = 0; w < 8; w += 1) {
    const ang = (w / 8) * Math.PI * 2;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 0.4), shared.wall);
    wall.position.set(Math.cos(ang) * (stageRadius - 1), 0.9, Math.sin(ang) * (stageRadius - 1));
    wall.lookAt(0, 0.9, 0);
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);

    const poster = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 1.2),
      new THREE.MeshStandardMaterial({ map: posterTextures[(w + i * 2) % posterTextures.length], roughness: 0.66 }),
    );
    poster.position.set(0, 0, 0.22);
    wall.add(poster);

    const frame = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 1.35), shared.posterFrame);
    frame.position.z = -0.01;
    poster.add(frame);
  }

  if (i < stages.length - 1) {
    const portal = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.22, 18, 40), shared.portal);
    portal.position.set(stageRadius - 2, 1.2, 0);
    portal.rotation.y = Math.PI / 2;
    portal.castShadow = true;
    group.add(portal);
    portals.push({ mesh: portal, from: i, to: i + 1 });
  }

  const egg = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), shared.easter);
  egg.position.set(-stageRadius + 2.5, 0.8, 1.6);
  egg.castShadow = true;
  group.add(egg);
  easterEggs.push({ mesh: egg, stageIndex: i, found: false });
}

stages.forEach(createStage);

for (let i = 0; i < stages.length - 1; i += 1) {
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(4, 0.7, 4), shared.floor);
  const a = stages[i].center;
  const b = stages[i + 1].center;
  bridge.position.set((a.x + b.x) / 2, -0.7, (a.z + b.z) / 2);
  bridge.material = bridge.material.clone();
  bridge.material.color.setHex(0x1b2133);
  bridge.receiveShadow = true;
  world.add(bridge);
}

const player = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 1.0, 6, 12), shared.player);
player.position.set(0, 0.7, 0);
player.castShadow = true;
scene.add(player);

const keys = new Set();
window.addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()));
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

let camYaw = 0.3;
let camPitch = 0.35;
let dragging = false;
let prevX = 0;
let prevY = 0;
window.addEventListener('mousedown', (e) => {
  dragging = true;
  prevX = e.clientX;
  prevY = e.clientY;
});
window.addEventListener('mouseup', () => (dragging = false));
window.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  camYaw -= (e.clientX - prevX) * 0.004;
  camPitch += (e.clientY - prevY) * 0.003;
  camPitch = THREE.MathUtils.clamp(camPitch, 0.12, 0.9);
  prevX = e.clientX;
  prevY = e.clientY;
});

const state = {
  stage: 0,
  actor: 'Idle',
  interacting: false,
};

function setActor(next) {
  if (state.actor === next) return;
  state.actor = next;
  statusEl.textContent = `상태: ${next}`;
}

function updateStage() {
  let nearest = 0;
  let best = Infinity;
  stages.forEach((s, i) => {
    const d = player.position.distanceTo(s.center);
    if (d < best) {
      best = d;
      nearest = i;
    }
  });
  if (state.stage !== nearest) {
    state.stage = nearest;
    stageEl.textContent = `스테이지: ${stages[nearest].name}`;
  }
}

const v = new THREE.Vector3();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const clock = new THREE.Clock();

function handleMove(dt) {
  const up = new THREE.Vector3(0, 1, 0);
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  camDir.y = 0;
  camDir.normalize();

  forward.copy(camDir);
  right.crossVectors(forward, up).normalize();

  v.set(0, 0, 0);
  if (keys.has('w') || keys.has('arrowup')) v.add(forward);
  if (keys.has('s') || keys.has('arrowdown')) v.sub(forward);
  if (keys.has('a') || keys.has('arrowleft')) v.add(right);
  if (keys.has('d') || keys.has('arrowright')) v.sub(right);

  if (v.lengthSq() > 0) {
    v.normalize();
    player.position.addScaledVector(v, dt * 5.7);
    player.rotation.y = Math.atan2(v.x, v.z);
    setActor(state.interacting ? 'Interact' : 'Run');
  } else {
    setActor(state.interacting ? 'Interact' : 'Idle');
  }
}

function clampToWorld() {
  player.position.y = 0.7;
  player.position.x = THREE.MathUtils.clamp(player.position.x, -10, 62);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -18, 18);
}

function handleInteract() {
  if (!keys.has('e')) {
    state.interacting = false;
    return;
  }

  state.interacting = true;

  for (const portal of portals) {
    const p = portal.mesh.getWorldPosition(new THREE.Vector3());
    const d = player.position.distanceTo(p);
    if (d < 2.1 && state.stage === portal.from) {
      player.position.copy(stages[portal.to].center).add(new THREE.Vector3(-2, 0.7, 0));
      hintEl.textContent = `힌트: ${stages[portal.to].name} 도착! 주변 오브젝트를 탐색해보세요.`;
      return;
    }
  }

  for (const egg of easterEggs) {
    const p = egg.mesh.getWorldPosition(new THREE.Vector3());
    const d = player.position.distanceTo(p);
    if (d < 1.8 && !egg.found) {
      egg.found = true;
      egg.mesh.material = egg.mesh.material.clone();
      egg.mesh.material.color.setHex(0x87ffd9);
      egg.mesh.material.emissive.setHex(0x2dbb95);
      hintEl.textContent = `이스터에그 발견! (${stages[egg.stageIndex].name})`;
      return;
    }
  }
}

function updateCamera(dt) {
  const radius = 7;
  const target = player.position.clone().add(new THREE.Vector3(0, 1.2, 0));
  const desired = new THREE.Vector3(
    target.x + Math.sin(camYaw) * Math.cos(camPitch) * radius,
    target.y + Math.sin(camPitch) * 4,
    target.z + Math.cos(camYaw) * Math.cos(camPitch) * radius,
  );

  camera.position.lerp(desired, 1 - Math.exp(-dt * 8));
  camera.lookAt(target);
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.03);
  const t = clock.elapsedTime;

  handleMove(dt);
  handleInteract();
  clampToWorld();
  updateStage();
  updateCamera(dt);

  portals.forEach((p, i) => {
    p.mesh.rotation.z = t * (0.9 + i * 0.08);
    p.mesh.material.emissiveIntensity = 0.7 + Math.sin(t * 2.2 + i) * 0.35;
  });

  easterEggs.forEach((egg, i) => {
    egg.mesh.position.y = 0.8 + Math.sin(t * 1.7 + i) * 0.18;
    egg.mesh.rotation.y = t * 0.8;
  });

  moodLight.position.set(Math.sin(t * 0.8) * 8 + stages[state.stage].center.x, 3.5, Math.cos(t * 0.7) * 5);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});