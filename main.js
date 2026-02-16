import * as THREE from './static/vendor/three.module.js';
import { GLTFLoader } from './static/vendor/GLTFLoader.js';

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
const stagePosterTexturePaths = {
  past: [
    'static/stickers/past-1.png',
    'static/stickers/past-2.png',
    'static/stickers/past-3.png',
    'static/stickers/past-4.png',
  ],
  present: [
    'static/stickers/present-1.png',
    'static/stickers/present-2.png',
    'static/stickers/present-3.png',
    'static/stickers/present-4.png',
  ],
  future: [
    'static/stickers/future-1.png',
    'static/stickers/future-2.png',
    'static/stickers/future-3.png',
    'static/stickers/future-4.png',
  ],
};

const stagePosterTitles = {
  past: ['어린 시절의 첫 기억', '가족과 함께한 여행', '학교에서의 첫 도전', '꿈을 키우던 순간'],
  present: ['지금의 일상 루틴', '함께하는 팀 프로젝트', '성장 중인 나의 기록', '요즘 가장 몰입한 취미'],
  future: ['가고 싶은 도시', '만들고 싶은 작품', '이루고 싶은 목표', '미래의 나에게 보내는 메시지'],
};

const stagePosterTextures = Object.fromEntries(
  Object.entries(stagePosterTexturePaths).map(([stageName, paths]) => [
    stageName,
    paths.map((path) => {
      const texture = textureLoader.load(path);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }),
  ]),
);

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

function createPosterTitleTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, 'rgba(33, 28, 53, 0.82)');
  gradient.addColorStop(1, 'rgba(52, 42, 77, 0.82)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 252, 246, 0.98)';
  let fontSize = 70;
  while (fontSize > 40) {
    ctx.font = `700 ${fontSize}px Pretendard, Noto Sans KR, sans-serif`;
    if (ctx.measureText(text).width < canvas.width - 90) break;
    fontSize -= 4;
  }
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
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

      const posterIndex = (w + (side === 1 ? 2 : 0)) % stagePosterTextures[stage.name].length;

      const poster = new THREE.Mesh(
        new THREE.PlaneGeometry(12.4 * galleryScale, 8 * galleryScale),
        new THREE.MeshStandardMaterial({
          map: stagePosterTextures[stage.name][posterIndex],
          roughness: 0.66,
          side: THREE.DoubleSide,
        }),
      );
      poster.position.set(0, 0.24, 0.26);
      wall.add(poster);
      poster.userData.isPoster = true;
      posterMeshes.push(poster);

      const caption = new THREE.Mesh(
        new THREE.PlaneGeometry(12.2 * galleryScale, 1.6 * galleryScale),
        new THREE.MeshBasicMaterial({
          map: createPosterTitleTexture(stagePosterTitles[stage.name][posterIndex]),
          transparent: true,
        }),
      );
      caption.position.set(0, -3.2, 0.28);
      wall.add(caption);

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

function createFallbackCharacter() {
  const character = new THREE.Group();

  const yellowMat = shared.skin.clone();
  yellowMat.color.setHex(0xffe23a);
  yellowMat.roughness = 0.45;

  const darkBrownMat = shared.hair.clone();
  darkBrownMat.color.setHex(0x4b2308);

  const stripeMat = shared.pants.clone();
  stripeMat.color.setHex(0x3a1d07);

  const wingMat = new THREE.MeshStandardMaterial({
    color: 0xbfeaff,
    roughness: 0.35,
    transparent: true,
    opacity: 0.85,
  });

  const goggleFrameMat = new THREE.MeshStandardMaterial({ color: 0x8f8f97, roughness: 0.35, metalness: 0.45 });
  const goggleGlassMat = new THREE.MeshStandardMaterial({
    color: 0xd5ecc2,
    roughness: 0.08,
    metalness: 0.15,
    transparent: true,
    opacity: 0.92,
  });
  const bagMat = new THREE.MeshStandardMaterial({ color: 0x1950cc, roughness: 0.46, metalness: 0.1 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0xffdf2d, roughness: 0.48 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.58, 34, 28), yellowMat);
  body.position.y = 1.37;
  body.scale.set(1, 1.05, 0.92);
  character.add(body);

  const stripeTop = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.12, 22, 40), stripeMat);
  stripeTop.position.set(0, 1.26, 0);
  stripeTop.rotation.x = Math.PI / 2;
  stripeTop.scale.set(1, 0.76, 1);
  character.add(stripeTop);

  const stripeBottom = stripeTop.clone();
  stripeBottom.position.y = 0.95;
  stripeBottom.scale.set(1.04, 0.74, 1);
  character.add(stripeBottom);

  const cheekMat = new THREE.MeshStandardMaterial({ color: 0xffa415, roughness: 0.6 });
  for (const side of [-1, 1]) {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 14), cheekMat);
    cheek.position.set(side * 0.31, 1.42, 0.42);
    cheek.scale.set(1.35, 0.8, 0.5);
    character.add(cheek);
  }

  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const irisMat = new THREE.MeshStandardMaterial({ color: 0x4f2507, roughness: 0.2 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x060606, roughness: 0.2 });

  for (const side of [-1, 1]) {
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 18), eyeWhiteMat);
    eyeWhite.position.set(side * 0.19, 1.49, 0.48);
    eyeWhite.scale.set(1, 1.05, 0.62);
    character.add(eyeWhite);

    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.072, 20, 18), irisMat);
    iris.position.set(side * 0.19, 1.48, 0.56);
    iris.scale.set(1, 1.1, 0.45);
    character.add(iris);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 14), pupilMat);
    pupil.position.set(side * 0.2, 1.47, 0.6);
    pupil.scale.set(1, 1, 0.45);
    character.add(pupil);

    const highlight = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 10), eyeWhiteMat);
    highlight.position.set(side * 0.17, 1.53, 0.62);
    highlight.scale.set(1, 1, 0.5);
    character.add(highlight);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.05, 0.04), darkBrownMat);
    brow.position.set(side * 0.19, 1.66, 0.46);
    brow.rotation.z = side * 0.17;
    character.add(brow);
  }

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 14), darkBrownMat);
  nose.position.set(0, 1.36, 0.56);
  nose.scale.set(1.1, 0.82, 0.75);
  character.add(nose);

  const noseHighlight = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 10), new THREE.MeshStandardMaterial({ color: 0x8f5225 }));
  noseHighlight.position.set(-0.02, 1.38, 0.61);
  character.add(noseHighlight);

  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.016, 14, 24, Math.PI * 0.82), darkBrownMat);
  smile.position.set(0, 1.27, 0.55);
  smile.rotation.z = Math.PI;
  character.add(smile);

  const mouthTipL = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 10), darkBrownMat);
  mouthTipL.position.set(-0.165, 1.24, 0.53);
  character.add(mouthTipL);
  const mouthTipR = mouthTipL.clone();
  mouthTipR.position.x *= -1;
  character.add(mouthTipR);

  const hairTuft = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 16), yellowMat);
  hairTuft.position.set(0, 1.93, 0.05);
  hairTuft.scale.set(1.1, 0.8, 0.55);
  character.add(hairTuft);

  for (const side of [-1, 1]) {
    const antennaStem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.4, 10), darkBrownMat);
    antennaStem.position.set(side * 0.19, 2.04, -0.02);
    antennaStem.rotation.z = side * 0.45;
    character.add(antennaStem);

    const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 12), darkBrownMat);
    antennaTip.position.set(side * 0.33, 2.2, 0.04);
    antennaTip.scale.set(1.65, 0.75, 0.6);
    antennaTip.rotation.z = side * 0.22;
    character.add(antennaTip);
  }

  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 16), wingMat);
    wing.position.set(side * 0.44, 1.08, -0.25);
    wing.scale.set(1.15, 1.28, 0.38);
    wing.rotation.y = side * 0.45;
    character.add(wing);
  }

  const goggleBridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.12, 8, 10), goggleFrameMat);
  goggleBridge.position.set(0, 1.85, 0.4);
  goggleBridge.rotation.z = Math.PI / 2;
  character.add(goggleBridge);

  for (const side of [-1, 1]) {
    const goggleFrame = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 16, 26), goggleFrameMat);
    goggleFrame.position.set(side * 0.2, 1.83, 0.39);
    goggleFrame.rotation.y = side * 0.26;
    goggleFrame.rotation.x = -0.15;
    character.add(goggleFrame);

    const goggleGlass = new THREE.Mesh(new THREE.CircleGeometry(0.125, 26), goggleGlassMat);
    goggleGlass.position.set(side * 0.2, 1.81, 0.5);
    goggleGlass.rotation.y = side * 0.26;
    goggleGlass.rotation.x = -0.15;
    character.add(goggleGlass);
  }

  const bagStrap = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.04, 0.06), bagMat);
  bagStrap.position.set(0.17, 0.94, 0.35);
  bagStrap.rotation.z = 0.72;
  bagStrap.rotation.y = -0.2;
  character.add(bagStrap);

  const bag = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.2, 8, 14), bagMat);
  bag.position.set(-0.15, 0.71, 0.42);
  bag.rotation.z = -0.1;
  bag.scale.set(1.16, 1.08, 0.68);
  character.add(bag);

  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.28, 8, 10), yellowMat);
    arm.position.set(side * 0.42, 0.88, 0.24);
    arm.rotation.z = side === -1 ? 0.55 : -0.48;
    arm.rotation.x = side === -1 ? 0.2 : -0.16;
    character.add(arm);

    const fist = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 14), yellowMat);
    fist.position.set(side * 0.5, 0.68, 0.3);
    fist.scale.set(1, 0.95, 0.9);
    character.add(fist);

    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.3, 8, 10), stripeMat);
    leg.position.set(side * 0.17, 0.26, 0.02);
    leg.rotation.x = side === -1 ? -0.12 : 0.15;
    character.add(leg);

    const sock = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 10, 18), new THREE.MeshStandardMaterial({ color: 0xff9f12 }));
    sock.position.set(side * 0.17, 0.05, 0.08);
    sock.rotation.x = Math.PI / 2;
    character.add(sock);

    const shoe = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.16, 8, 10), shoeMat);
    shoe.position.set(side * 0.17, -0.06, 0.08);
    shoe.rotation.x = side === -1 ? 0.08 : -0.08;
    shoe.scale.set(1.16, 0.82, 1.05);
    character.add(shoe);

    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.16), shared.shoe);
    sole.position.set(side * 0.17, -0.15, 0.11);
    character.add(sole);
  }

  character.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  character.position.set(0, 0.15, 0);
  return character;
}

const player = new THREE.Group();
player.position.set(0, 0, 0);
scene.add(player);

const gltfLoader = new GLTFLoader();

function loadMainCharacter() {
  const modelUrl = 'https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb';
  gltfLoader.load(
    modelUrl,
    (gltf) => {
      player.clear();
      const character = gltf.scene;
      character.rotation.y = Math.PI;

      const box = new THREE.Box3().setFromObject(character);
      const size = box.getSize(new THREE.Vector3());
      const targetHeight = 2.15;
      const safeHeight = Math.max(size.y, 0.001);
      const scale = targetHeight / safeHeight;
      character.scale.setScalar(scale);

      const fittedBox = new THREE.Box3().setFromObject(character);
      const center = fittedBox.getCenter(new THREE.Vector3());
      const minY = fittedBox.min.y;
      character.position.set(-center.x, -minY, -center.z);

      character.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });

      player.add(character);
      setHint('메인 캐릭터를 GLB 모델로 불러왔어요. 바닥을 클릭해 이동해 보세요.');
    },
    undefined,
    () => {
      player.clear();
      player.add(createFallbackCharacter());
      setHint('GLB 캐릭터 로드에 실패해 기본 캐릭터로 표시 중이에요.');
    },
  );
}

loadMainCharacter();

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
