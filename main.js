import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb8c8ff);
scene.fog = new THREE.Fog(0xb8c8ff, 32, 220);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 260);
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
  floor: new THREE.MeshStandardMaterial({ color: 0xe9ddff, roughness: 0.88, metalness: 0.05 }),
  wall: new THREE.MeshStandardMaterial({ color: 0xfff6ff, roughness: 0.72 }),
  posterFrame: new THREE.MeshStandardMaterial({ color: 0xf5d09d, roughness: 0.32, metalness: 0.45 }),
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
  easter: new THREE.MeshStandardMaterial({ color: 0xffb77d, emissive: 0xae4f20, emissiveIntensity: 0.5 }),
};

const world = new THREE.Group();
scene.add(world);

const ambient = new THREE.AmbientLight(0xfff4ff, 0.92);
scene.add(ambient);
const mainLight = new THREE.DirectionalLight(0xffffff, 1.05);
mainLight.position.set(6, 14, 5);
mainLight.castShadow = true;
mainLight.shadow.mapSize.set(1024, 1024);
scene.add(mainLight);
const skyFill = new THREE.HemisphereLight(0xd6dcff, 0xffdcb4, 0.6);
scene.add(skyFill);

const warmLight = new THREE.PointLight(0xffb8f7, 28, 42, 1.8);
warmLight.position.set(0, 5, 0);
scene.add(warmLight);

function makeGridTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#fde9ff');
  grad.addColorStop(0.5, '#efe2ff');
  grad.addColorStop(1, '#dff1ff');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
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
  new THREE.PlaneGeometry(260, 160),
  new THREE.MeshStandardMaterial({ map: makeGridTexture(), roughness: 0.94, metalness: 0.04 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.82;
ground.receiveShadow = true;
world.add(ground);

const textureLoader = new THREE.TextureLoader();
const posterTextures = [
  'static/stickers/chick.svg',
  'static/stickers/bus.svg',
  'static/stickers/star.svg',
  'static/stickers/heart.svg',
  'static/stickers/ribbon.svg',
  'static/stickers/confetti.svg',
].map((path) => {
  const texture = textureLoader.load(path);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
});

const stages = [
  { name: 'past', center: new THREE.Vector3(0, 0, 0), color: 0xfff4dc },
  { name: 'present', center: new THREE.Vector3(126, 0, 0), color: 0xf8ecff },
  { name: 'future', center: new THREE.Vector3(252, 0, 0), color: 0xe8fff8 },
];

const stageLength = 72;
const stageWidth = 24;
const posterMeshes = [];
const walkableMeshes = [];
const bridgeZones = [];

const sparkleCount = 480;
const sparkleGeo = new THREE.BufferGeometry();
const sparklePos = new Float32Array(sparkleCount * 3);
for (let i = 0; i < sparkleCount; i += 1) {
  sparklePos[i * 3] = THREE.MathUtils.randFloatSpread(350);
  sparklePos[i * 3 + 1] = THREE.MathUtils.randFloat(3, 24);
  sparklePos[i * 3 + 2] = THREE.MathUtils.randFloatSpread(180);
}
sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePos, 3));
const sparkles = new THREE.Points(
  sparkleGeo,
  new THREE.PointsMaterial({ size: 0.25, color: 0xfff6ff, transparent: true, opacity: 0.75 }),
);
scene.add(sparkles);

function createStageTextTexture(text) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d');

  let fontSize = 116;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  while (fontSize > 56) {
    ctx.font = `700 ${fontSize}px sans-serif`;
    if (ctx.measureText(text).width <= c.width - 56) break;
    fontSize -= 4;
  }

  ctx.lineWidth = 14;
  ctx.strokeStyle = 'rgba(32, 28, 52, 0.32)';
  ctx.strokeText(text, c.width / 2, c.height / 2 + 6);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.fillText(text, c.width / 2, c.height / 2 + 6);

  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createStage(stage, i) {
  const group = new THREE.Group();
  group.position.copy(stage.center);
  world.add(group);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(stageLength, 1.4, stageWidth), shared.floor);
  floor.receiveShadow = true;
  floor.position.y = -0.8;
  floor.material = floor.material.clone();
  floor.material.color.setHex(stage.color);
  group.add(floor);
  walkableMeshes.push(floor);

  const framesPerSide = 5;
  const galleryScale = 0.8;
  const spacing = stageLength / (framesPerSide + 1);
  const wallInset = stageWidth * 0.5 - 2.1;

  const ceilingLight = new THREE.PointLight(0xcfc5ff, 8, 50, 2);
  ceilingLight.position.set(0, 7.2, 0);
  group.add(ceilingLight);

  for (let side of [-1, 1]) {
    for (let w = 0; w < framesPerSide; w += 1) {
      const x = -stageLength / 2 + spacing * (w + 1);
      const z = side * wallInset;

      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(14.8 * galleryScale, 9 * galleryScale, 0.5 * galleryScale),
        shared.wall,
      );
      wall.position.set(x, 3.6, z);
      wall.rotation.y = side === 1 ? Math.PI : 0;
      wall.castShadow = true;
      wall.receiveShadow = true;
      group.add(wall);

      const poster = new THREE.Mesh(
        new THREE.PlaneGeometry(12.4 * galleryScale, 8 * galleryScale),
        new THREE.MeshStandardMaterial({
          map: posterTextures[(w + i * 2 + (side === 1 ? 1 : 0)) % posterTextures.length],
          roughness: 0.66,
          side: THREE.DoubleSide,
        }),
      );
      poster.position.set(0, 0.24, 0.26);
      wall.add(poster);
      poster.userData.isPoster = true;
      posterMeshes.push(poster);

      const frameBack = new THREE.Mesh(
        new THREE.PlaneGeometry(13.8 * galleryScale, 9.4 * galleryScale),
        new THREE.MeshStandardMaterial({ color: 0x6f4f3a, roughness: 0.62 }),
      );
      frameBack.position.set(0, 0.2, -0.01);
      wall.add(frameBack);

      const h = 9 * galleryScale;
      const w2 = 13.4 * galleryScale;
      const trimThickness = 0.36;
      const trimDepth = 0.18;
      for (const [tx, ty, sx, sy] of [
        [0, h / 2, w2, trimThickness],
        [0, -h / 2, w2, trimThickness],
        [-w2 / 2, 0, trimThickness, h],
        [w2 / 2, 0, trimThickness, h],
      ]) {
        const trim = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, trimDepth), shared.posterFrame);
        trim.position.set(tx, ty + 0.24, 0.18);
        poster.add(trim);
      }

      const stand = new THREE.Mesh(
        new THREE.BoxGeometry(0.42 * galleryScale, 3.8 * galleryScale, 0.42 * galleryScale),
        shared.posterStand,
      );
      stand.position.set(0, -4.92, 0);
      wall.add(stand);
    }
  }

  const floorLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(17, 8),
    new THREE.MeshBasicMaterial({
      map: createStageTextTexture(stage.name),
      transparent: true,
      depthWrite: false,
    }),
  );
  floorLabel.rotation.x = -Math.PI / 2;
  floorLabel.position.set(0, -0.09, stageWidth * 0.5 - 7);
  group.add(floorLabel);
}

stages.forEach(createStage);

for (let i = 0; i < stages.length - 1; i += 1) {
  const a = stages[i].center;
  const b = stages[i + 1].center;
  const delta = new THREE.Vector3().subVectors(b, a);
  const centerDistance = Math.hypot(delta.x, delta.z);
  const direction = delta.clone().setY(0).normalize();

  const aSupport = Math.abs(direction.x) * (stageLength * 0.5) + Math.abs(direction.z) * (stageWidth * 0.5);
  const bSupport = Math.abs(direction.x) * (stageLength * 0.5) + Math.abs(direction.z) * (stageWidth * 0.5);
  const visibleGap = Math.max(centerDistance - aSupport - bSupport, 0);
  const seamOverlap = 1.2;
  const length = Math.max(visibleGap + seamOverlap * 2, 8);

  const aEdge = a.clone().addScaledVector(direction, aSupport);
  const bEdge = b.clone().addScaledVector(direction, -bSupport);
  const bridgeCenter = aEdge.clone().lerp(bEdge, 0.5);

  const bridgeWidth = 12;
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(length, 0.7, bridgeWidth), shared.floor);
  bridge.position.set(bridgeCenter.x, -0.7, bridgeCenter.z);
  bridge.rotation.y = Math.atan2(direction.z, direction.x);
  bridge.material = bridge.material.clone();
  bridge.material.color.setHex(0xede7d8);
  bridge.receiveShadow = true;
  world.add(bridge);
  walkableMeshes.push(bridge);
  bridgeZones.push({
    center: bridgeCenter.clone(),
    direction: direction.clone(),
    length,
    width: bridgeWidth,
  });
}

function createNatureDecor() {
  const grassAreaGeo = new THREE.PlaneGeometry(340, 220);
  const grassAreaMat = new THREE.MeshStandardMaterial({ color: 0x80c56f, roughness: 0.96, metalness: 0.02 });
  const grassArea = new THREE.Mesh(grassAreaGeo, grassAreaMat);
  grassArea.rotation.x = -Math.PI / 2;
  grassArea.position.y = -0.86;
  grassArea.receiveShadow = true;
  world.add(grassArea);

  const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x7f5638, roughness: 0.92 });
  const treeLeafMat = new THREE.MeshStandardMaterial({ color: 0x5d9f4d, roughness: 0.84 });

  const treeBands = [
    { x: -60, zList: [-56, -46, -36, 36, 46, 56] },
    { x: -42, zList: [-50, -40, -30, 30, 40, 50] },
    { x: -24, zList: [-54, -44, 44, 54] },
    { x: 42, zList: [-54, -44, -34, 34, 44, 54] },
    { x: 84, zList: [-56, -46, -36, 36, 46, 56] },
    { x: 126, zList: [-54, -44, 44, 54] },
    { x: 168, zList: [-56, -46, -36, 36, 46, 56] },
    { x: 210, zList: [-54, -44, 44, 54] },
    { x: 252, zList: [-56, -46, -36, 36, 46, 56] },
    { x: 294, zList: [-54, -44, -34, 34, 44, 54] },
    { x: 316, zList: [-50, -40, 40, 50] },
  ];

  treeBands.forEach((band, bandIndex) => {
    band.zList.forEach((z, treeIndex) => {
      const tree = new THREE.Group();
      const jitter = (bandIndex + treeIndex * 0.5) % 1;

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.54, 3.4, 8), treeTrunkMat);
      trunk.position.y = 0.85;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      tree.add(trunk);

      const leafLower = new THREE.Mesh(new THREE.SphereGeometry(1.82, 14, 12), treeLeafMat);
      leafLower.position.y = 2.95;
      leafLower.scale.set(1.14, 0.92, 1.04);
      leafLower.castShadow = true;
      tree.add(leafLower);

      const leafUpper = new THREE.Mesh(new THREE.SphereGeometry(1.44, 14, 12), treeLeafMat);
      leafUpper.position.y = 4.05;
      leafUpper.castShadow = true;
      tree.add(leafUpper);

      tree.position.set(band.x + jitter * 2.8, 0, z + jitter * 2.5);
      world.add(tree);
    });
  });

  const bushMat = new THREE.MeshStandardMaterial({ color: 0x6daf5f, roughness: 0.9 });
  for (let x = -64; x <= 320; x += 20) {
    for (const z of [-62, -58, 58, 62]) {
      const bush = new THREE.Mesh(new THREE.SphereGeometry(1.9, 14, 12), bushMat);
      bush.position.set(x + ((x + z) % 3), 0.48, z + ((x * 0.17) % 1.8));
      bush.scale.set(1.25, 0.72, 1.05);
      bush.castShadow = true;
      bush.receiveShadow = true;
      world.add(bush);
    }
  }

  const flowerPalette = [0xff7fb2, 0xffd166, 0xa0ddff, 0xc7b8ff, 0xfff3a0];
  for (let i = 0; i < 220; i += 1) {
    const flower = new THREE.Mesh(
      new THREE.CircleGeometry(0.18 + (i % 3) * 0.03, 8),
      new THREE.MeshStandardMaterial({
        color: flowerPalette[i % flowerPalette.length],
        emissive: flowerPalette[(i + 2) % flowerPalette.length],
        emissiveIntensity: 0.08,
        roughness: 0.6,
      }),
    );
    flower.rotation.x = -Math.PI / 2;
    const side = i % 2 === 0 ? 1 : -1;
    const spreadX = -58 + (i * 9.4) % 374;
    const spreadZ = side * (35 + (i * 7.8) % 34);
    flower.position.set(spreadX, -0.8, spreadZ);
    world.add(flower);
  }

  const pebbleMat = new THREE.MeshStandardMaterial({ color: 0xb9b6ac, roughness: 0.95 });
  for (let i = 0; i < 160; i += 1) {
    const pebble = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), pebbleMat);
    pebble.position.set(-54 + (i * 8.6) % 362, -0.76, (i % 2 === 0 ? -1 : 1) * (25 + (i * 4.7) % 44));
    pebble.scale.set(1.4, 0.48, 1.1);
    pebble.rotation.y = i * 0.37;
    pebble.castShadow = true;
    pebble.receiveShadow = true;
    world.add(pebble);
  }
}

createNatureDecor();

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

    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.34, 8, 12), shared.pants);
    leg.position.set(side * 0.16, 0.76, 0);
    character.add(leg);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.44), shared.shoe);
    shoe.position.set(side * 0.16, 0.29, 0.05);
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
  focusedPoster: null,
  canRestoreFocus: false,
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
  restorePosterFocus();
  player.position.copy(stages[index].center).add(new THREE.Vector3(-stageLength * 0.35, 0, 0));
  state.moveTarget = null;
  updateStage();
  setActor('Idle');
  setHint(`${stages[index].name}로 이동했어요. 그림 가까이에서 클릭하면 확대돼요.`);
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
  player.position.addScaledVector(moveDirection, dt * 6.84);
  player.rotation.y = Math.atan2(moveDirection.x, moveDirection.z);
  setActor('Run');
}

function clampToWorld() {
  player.position.y = 0;
  player.position.x = THREE.MathUtils.clamp(player.position.x, -52, 306);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -46, 46);
}


function keepPlayerOnStageOrBridge() {
  const px = player.position.x;
  const pz = player.position.z;

  const onStage = stages.some((stage) => {
    const dx = px - stage.center.x;
    const dz = pz - stage.center.z;
    return Math.abs(dx) <= stageLength * 0.5 && Math.abs(dz) <= stageWidth * 0.5;
  });

  const onBridge = (() => {
    for (const zone of bridgeZones) {
      const relX = px - zone.center.x;
      const relZ = pz - zone.center.z;
      const along = relX * zone.direction.x + relZ * zone.direction.z;
      const side = relX * -zone.direction.z + relZ * zone.direction.x;
      const withinLength = Math.abs(along) <= zone.length * 0.5 + 0.75;
      const withinWidth = Math.abs(side) <= zone.width * 0.5 + 0.75;
      if (withinLength && withinWidth) return true;
    }
    return false;
  })();

  if (!onStage && !onBridge) {
    state.moveTarget = null;
    setActor('Idle');
    setHint('스테이지 또는 다리 위에서만 이동할 수 있어요.');
  }
}

const cameraOffset = new THREE.Vector3(-10, 14, 11);
const cameraTarget = new THREE.Vector3();
const desiredCamera = new THREE.Vector3();
const posterFocusPosition = new THREE.Vector3();
const posterLookTarget = new THREE.Vector3();

function focusPoster(poster) {
  state.focusedPoster = poster;
  state.canRestoreFocus = false;
  state.moveTarget = null;
  setActor('Idle');
  setHint('그림 확대 보기 중: 화면을 다시 클릭하면 원래 시점으로 돌아가요.');
  setTimeout(() => {
    state.canRestoreFocus = true;
  }, 150);
}

function restorePosterFocus() {
  if (!state.focusedPoster) return;
  state.focusedPoster = null;
  state.canRestoreFocus = false;
  setHint('이동 중... 스테이지와 다리 안에서만 이동할 수 있어요.');
}

function updateCamera(dt) {
  if (state.focusedPoster) {
    const focused = state.focusedPoster;
    focused.getWorldPosition(posterLookTarget);
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(focused.getWorldQuaternion(new THREE.Quaternion()));
    posterFocusPosition.copy(posterLookTarget).addScaledVector(normal, 4.8).add(new THREE.Vector3(0, 0.6, 0));
    camera.position.lerp(posterFocusPosition, 1 - Math.exp(-dt * 10));
    camera.lookAt(posterLookTarget);
    return;
  }

  cameraTarget.copy(player.position).add(new THREE.Vector3(0, 1.2, 0));
  desiredCamera.copy(cameraTarget).add(cameraOffset);

  camera.position.lerp(desiredCamera, 1 - Math.exp(-dt * 8));
  camera.lookAt(cameraTarget);
}

renderer.domElement.addEventListener('pointerup', (e) => {
  if (state.focusedPoster && state.canRestoreFocus) {
    restorePosterFocus();
    return;
  }

  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const interactiveMeshes = [...posterMeshes, ...walkableMeshes];
  const hit = raycaster.intersectObjects(interactiveMeshes, true)[0];
  if (!hit) return;

  const hitObj = hit.object;
  if (hitObj.userData.isPoster) {
    if (player.position.distanceTo(hitObj.getWorldPosition(new THREE.Vector3())) < 10) {
      focusPoster(hitObj);
    } else {
      setHint('그림을 확대하려면 조금 더 가까이 이동해 주세요.');
    }
    return;
  }

  state.moveTarget = new THREE.Vector3(hit.point.x, 0, hit.point.z);
  setHint('이동 중... 스테이지와 다리 안에서만 이동할 수 있어요.');
});

const clock = new THREE.Clock();
function animate() {
  const dt = Math.min(clock.getDelta(), 0.03);
  const t = clock.elapsedTime;

  handleMove(dt);
  clampToWorld();
  keepPlayerOnStageOrBridge();
  updateStage();
  updateCamera(dt);

  if (state.actor === 'Idle') {
    player.position.y = Math.sin(t * 3.2) * 0.03;
  }


  sparkles.rotation.y = Math.sin(t * 0.04) * 0.4;
  sparkles.position.y = Math.sin(t * 0.3) * 0.5;

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
