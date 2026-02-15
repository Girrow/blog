import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf5f5f0);
scene.fog = new THREE.Fog(0xf5f5f0, 28, 86);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 180);
camera.position.set(0, 11, 13);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.append(renderer.domElement);

const statusEl = document.getElementById('status');
const stageEl = document.getElementById('stage');
const hintEl = document.getElementById('hint');
const stageJumpEl = document.getElementById('stage-jump');

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const shared = {
  floor: new THREE.MeshStandardMaterial({ color: 0xf4f0e6, roughness: 0.95 }),
  wall: new THREE.MeshStandardMaterial({ color: 0xfff9f0, roughness: 0.88 }),
  posterFrame: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42 }),
  posterStand: new THREE.MeshStandardMaterial({ color: 0xc7bba8, roughness: 0.75 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xf2c49a, roughness: 0.52 }),
  hair: new THREE.MeshStandardMaterial({ color: 0x241816, roughness: 0.72 }),
  shirt: new THREE.MeshStandardMaterial({ color: 0x202228, roughness: 0.65 }),
  pants: new THREE.MeshStandardMaterial({ color: 0x2d3b66, roughness: 0.6 }),
  shoe: new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.72 }),
  eye: new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.36 }),
  lip: new THREE.MeshStandardMaterial({ color: 0xd48b80, roughness: 0.5 }),
  bagStrap: new THREE.MeshStandardMaterial({ color: 0x161617, roughness: 0.36 }),
  watch: new THREE.MeshStandardMaterial({ color: 0x354a4d, roughness: 0.35, metalness: 0.25 }),
  portal: new THREE.MeshStandardMaterial({ color: 0x67dbc6, emissive: 0x2db89e, emissiveIntensity: 0.9 }),
  easter: new THREE.MeshStandardMaterial({ color: 0xffb77d, emissive: 0xae4f20, emissiveIntensity: 0.5 }),
};

const world = new THREE.Group();
scene.add(world);

const ambient = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambient);
const mainLight = new THREE.DirectionalLight(0xffffff, 1.05);
mainLight.position.set(6, 14, 5);
mainLight.castShadow = true;
mainLight.shadow.mapSize.set(1024, 1024);
scene.add(mainLight);
const warmLight = new THREE.PointLight(0xffcd99, 22, 30, 2);
warmLight.position.set(0, 5, 0);
scene.add(warmLight);

function makeGridTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f9f9f7';
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = '#e8e6df';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 512; i += 24) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(20, 20);
  return texture;
}

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(170, 110),
  new THREE.MeshStandardMaterial({ map: makeGridTexture(), roughness: 1 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.82;
ground.receiveShadow = true;
world.add(ground);

function stickerTexture(bg, icon) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 160;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 56px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, c.width / 2, c.height / 2 + 8);
  return new THREE.CanvasTexture(c);
}

const posterTextures = [
  stickerTexture('#ffd3da', '🐥'),
  stickerTexture('#c7ecff', '🚌'),
  stickerTexture('#ffe7a7', '⭐'),
  stickerTexture('#d8ffd6', '💚'),
  stickerTexture('#f3d7ff', '🎀'),
  stickerTexture('#ffcfae', '🎉'),
];

const stages = [
  { name: 'Bus Stop', center: new THREE.Vector3(0, 0, 0), color: 0xfff4dc },
  { name: 'Sticker Plaza', center: new THREE.Vector3(26, 0, 0), color: 0xf8ecff },
  { name: 'Picnic Corner', center: new THREE.Vector3(52, 0, -6), color: 0xe8fff8 },
];

const stageRadius = 11;
const portals = [];
const easterEggs = [];

function createBus(stageGroup) {
  const bus = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(5.8, 2.2, 2.8),
    new THREE.MeshStandardMaterial({ color: 0x74e7d4, roughness: 0.65 }),
  );
  body.castShadow = true;
  bus.add(body);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(5.6, 0.8, 2.7),
    new THREE.MeshStandardMaterial({ color: 0xfff3d6, roughness: 0.65 }),
  );
  roof.position.y = 1.35;
  roof.castShadow = true;
  bus.add(roof);

  const windowMat = new THREE.MeshStandardMaterial({ color: 0x2f6f7a, roughness: 0.2, metalness: 0.3 });
  for (let i = -2; i <= 2; i += 1) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.65), windowMat);
    w.position.set(i * 0.95, 0.5, 1.42);
    bus.add(w);
  }

  for (const x of [-2, 2]) {
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 0.34, 20),
      new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.75 }),
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, -1.2, 1.4);
    bus.add(wheel);

    const wheel2 = wheel.clone();
    wheel2.position.z = -1.4;
    bus.add(wheel2);
  }

  bus.position.set(0, 0.75, 0);
  bus.rotation.y = -0.2;
  stageGroup.add(bus);
}

function createStage(stage, i) {
  const group = new THREE.Group();
  group.position.copy(stage.center);
  world.add(group);

  const floor = new THREE.Mesh(new THREE.CylinderGeometry(stageRadius, stageRadius, 1.4, 42), shared.floor);
  floor.receiveShadow = true;
  floor.position.y = -0.8;
  floor.material = floor.material.clone();
  floor.material.color.setHex(stage.color);
  group.add(floor);

  const galleryPositions = [
    [-7.1, 1.05, -4.8],
    [-2.4, 1.05, -4.8],
    [2.4, 1.05, -4.8],
    [7.1, 1.05, -4.8],
    [-4.7, 1.05, -7.8],
    [0, 1.05, -7.8],
    [4.7, 1.05, -7.8],
  ];

  galleryPositions.forEach(([x, y, z], w) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(3.8, 3.2, 0.45), shared.wall);
    wall.position.set(x, y, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);

    const poster = new THREE.Mesh(
      new THREE.PlaneGeometry(3.1, 2),
      new THREE.MeshStandardMaterial({ map: posterTextures[(w + i * 2) % posterTextures.length], roughness: 0.66 }),
    );
    poster.position.set(0, 0.1, 0.24);
    wall.add(poster);

    const frame = new THREE.Mesh(new THREE.PlaneGeometry(3.35, 2.25), shared.posterFrame);
    frame.position.z = -0.012;
    poster.add(frame);

    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.65, 0.26), shared.posterStand);
    stand.position.set(0, -2.35, 0);
    wall.add(stand);
  });

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

  if (i === 0) createBus(group);
}

stages.forEach(createStage);

for (let i = 0; i < stages.length - 1; i += 1) {
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(4, 0.7, 4), shared.floor);
  const a = stages[i].center;
  const b = stages[i + 1].center;
  bridge.position.set((a.x + b.x) / 2, -0.7, (a.z + b.z) / 2);
  bridge.material = bridge.material.clone();
  bridge.material.color.setHex(0xede7d8);
  bridge.receiveShadow = true;
  world.add(bridge);
}

function createMaleCharacter() {
  const character = new THREE.Group();

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.31, 0.74, 10, 14), shared.shirt);
  torso.position.y = 1.36;
  character.add(torso);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 12, 24), shared.shirt);
  collar.position.set(0, 1.7, 0.11);
  collar.rotation.x = Math.PI / 2.1;
  character.add(collar);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.16, 10), shared.skin);
  neck.position.y = 1.92;
  character.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 22, 22), shared.skin);
  head.position.y = 2.2;
  head.scale.set(1, 1.05, 0.94);
  character.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.36, 22, 22, 0, Math.PI * 2, 0, Math.PI * 0.68), shared.hair);
  hair.position.y = 2.32;
  hair.scale.set(1.06, 1.02, 1);
  character.add(hair);

  const fringe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 14), shared.hair);
  fringe.position.set(0.03, 2.29, 0.28);
  fringe.scale.set(1.35, 0.75, 0.72);
  character.add(fringe);

  const earL = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), shared.skin);
  earL.position.set(-0.34, 2.14, 0.02);
  earL.scale.set(0.9, 1.2, 0.8);
  character.add(earL);

  const earR = earL.clone();
  earR.position.x *= -1;
  character.add(earR);

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), shared.eye);
    eye.position.set(side * 0.1, 2.22, 0.3);
    eye.scale.set(1.6, 0.7, 0.8);
    character.add(eye);
  }

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.11, 10), shared.skin);
  nose.position.set(0, 2.12, 0.33);
  nose.rotation.x = Math.PI / 2;
  character.add(nose);

  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.013, 10, 16, Math.PI), shared.lip);
  mouth.position.set(0, 2.03, 0.31);
  mouth.rotation.z = Math.PI;
  character.add(mouth);

  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.58, 8, 12), shared.shirt);
    arm.position.set(side * 0.42, 1.35, 0.02);
    arm.rotation.z = side * 0.23;
    character.add(arm);

    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.56, 8, 12), shared.pants);
    leg.position.set(side * 0.16, 0.66, 0);
    character.add(leg);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.44), shared.shoe);
    shoe.position.set(side * 0.16, 0.2, 0.05);
    character.add(shoe);
  }

  const bagStrap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.45, 0.05), shared.bagStrap);
  bagStrap.position.set(0.09, 1.43, 0.2);
  bagStrap.rotation.z = 0.66;
  bagStrap.rotation.y = -0.24;
  character.add(bagStrap);

  const bagTop = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.16), shared.bagStrap);
  bagTop.position.set(0.46, 1.64, -0.02);
  bagTop.rotation.y = 0.15;
  character.add(bagTop);

  const watchBand = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.018, 10, 18), shared.watch);
  watchBand.position.set(-0.45, 1.06, 0.02);
  watchBand.rotation.y = Math.PI / 2;
  character.add(watchBand);

  character.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  character.position.set(0, 0, 0);
  return character;
}

const player = createMaleCharacter();
player.position.set(0, 0, 0);
scene.add(player);

const state = {
  stage: 0,
  actor: 'Idle',
  moveTarget: null,
};

function setActor(next) {
  if (state.actor === next) return;
  state.actor = next;
  statusEl.textContent = `상태: ${next}`;
}

function setHint(text) {
  hintEl.textContent = `힌트: ${text}`;
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

function jumpToStage(index) {
  player.position.copy(stages[index].center).add(new THREE.Vector3(-2, 0, 0));
  state.moveTarget = null;
  updateStage();
  setActor('Idle');
  setHint(`${stages[index].name}로 이동했어요. 주변 오브젝트를 눌러보세요.`);
}

stages.forEach((stage, index) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = stage.name;
  btn.addEventListener('click', () => jumpToStage(index));
  stageJumpEl.append(btn);
});

const moveDirection = new THREE.Vector3();

function handleMove(dt) {
  if (!state.moveTarget) {
    setActor('Idle');
    return;
  }

  moveDirection.subVectors(state.moveTarget, player.position);
  moveDirection.y = 0;
  const distance = moveDirection.length();

  if (distance < 0.2) {
    state.moveTarget = null;
    setActor('Idle');
    return;
  }

  moveDirection.normalize();
  player.position.addScaledVector(moveDirection, dt * 5.7);
  player.rotation.y = Math.atan2(moveDirection.x, moveDirection.z);
  setActor('Run');
}

function clampToWorld() {
  player.position.y = 0;
  player.position.x = THREE.MathUtils.clamp(player.position.x, -14, 64);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -22, 20);
}

function tryPortal() {
  for (const portal of portals) {
    const p = portal.mesh.getWorldPosition(new THREE.Vector3());
    const d = player.position.distanceTo(p);
    if (d < 2.7 && state.stage === portal.from) {
      jumpToStage(portal.to);
      return true;
    }
  }
  return false;
}

function tryEgg() {
  for (const egg of easterEggs) {
    const p = egg.mesh.getWorldPosition(new THREE.Vector3());
    const d = player.position.distanceTo(p);
    if (d < 2 && !egg.found) {
      egg.found = true;
      egg.mesh.material = egg.mesh.material.clone();
      egg.mesh.material.color.setHex(0x8cffd5);
      egg.mesh.material.emissive.setHex(0x2abf96);
      setHint(`이스터에그 발견! (${stages[egg.stageIndex].name})`);
      return true;
    }
  }
  return false;
}

const cameraOffset = new THREE.Vector3(-8.5, 12, 9.5);
const cameraTarget = new THREE.Vector3();
const desiredCamera = new THREE.Vector3();

function updateCamera(dt) {
  cameraTarget.copy(player.position).add(new THREE.Vector3(0, 1.2, 0));
  desiredCamera.copy(cameraTarget).add(cameraOffset);

  camera.position.lerp(desiredCamera, 1 - Math.exp(-dt * 8));
  camera.lookAt(cameraTarget);
}

renderer.domElement.addEventListener('pointerup', (e) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const interactiveMeshes = [...portals.map((p) => p.mesh), ...easterEggs.map((egg) => egg.mesh), ground];
  const hit = raycaster.intersectObjects(interactiveMeshes, true)[0];
  if (!hit) return;

  const hitObj = hit.object;
  if (portals.some((p) => p.mesh === hitObj || p.mesh.children.includes(hitObj))) {
    if (!tryPortal()) setHint('포털 근처로 이동한 뒤 다시 눌러보세요.');
    return;
  }

  if (easterEggs.some((egg) => egg.mesh === hitObj || egg.mesh.children.includes(hitObj))) {
    if (!tryEgg()) setHint('오브젝트 근처로 이동한 뒤 다시 눌러보세요.');
    return;
  }

  state.moveTarget = new THREE.Vector3(hit.point.x, 0, hit.point.z);
  setHint('이동 중... 포털/오브젝트를 누르면 상호작용할 수 있어요.');
});

const clock = new THREE.Clock();
function animate() {
  const dt = Math.min(clock.getDelta(), 0.03);
  const t = clock.elapsedTime;

  handleMove(dt);
  clampToWorld();
  updateStage();
  updateCamera(dt);

  if (state.actor === 'Idle') {
    player.position.y = Math.sin(t * 3.2) * 0.03;
  }

  portals.forEach((p, i) => {
    p.mesh.rotation.z = t * (0.9 + i * 0.08);
    p.mesh.material.emissiveIntensity = 0.6 + Math.sin(t * 2.2 + i) * 0.25;
  });

  easterEggs.forEach((egg, i) => {
    egg.mesh.position.y = 0.8 + Math.sin(t * 1.7 + i) * 0.18;
    egg.mesh.rotation.y = t * 0.8;
  });

  warmLight.position.set(Math.sin(t * 0.8) * 8 + stages[state.stage].center.x, 4.5, Math.cos(t * 0.7) * 5);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
