import * as THREE from './static/vendor/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.165.0/examples/jsm/loaders/GLTFLoader.js';

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

function makeGrassTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#73b969');
  grad.addColorStop(0.55, '#5fa452');
  grad.addColorStop(1, '#4a8a3f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 3000; i += 1) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const len = 4 + Math.random() * 8;
    const tilt = (Math.random() - 0.5) * 1.2;
    ctx.strokeStyle = `rgba(${70 + Math.random() * 45}, ${130 + Math.random() * 80}, ${50 + Math.random() * 35}, ${0.2 + Math.random() * 0.22})`;
    ctx.lineWidth = 0.7 + Math.random() * 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + tilt, y - len);
    ctx.stroke();
  }

  for (let i = 0; i < 450; i += 1) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = 1.2 + Math.random() * 2.4;
    ctx.fillStyle = `rgba(${90 + Math.random() * 50}, ${145 + Math.random() * 65}, ${70 + Math.random() * 40}, 0.12)`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(28, 18);
  return texture;
}

const grassTexture = makeGrassTexture();

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(260, 160),
  new THREE.MeshStandardMaterial({ map: grassTexture, roughness: 0.94, metalness: 0.02 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.82;
ground.receiveShadow = true;
world.add(ground);

const textureLoader = new THREE.TextureLoader();
const posterCountPerStage = 10;
const stagePosterTexturePaths = {
  past: Array.from({ length: posterCountPerStage }, (_, index) => `static/stickers/past-${index + 1}.png`),
  present: Array.from({ length: posterCountPerStage }, (_, index) => `static/stickers/present-${index + 1}.png`),
  future: Array.from({ length: posterCountPerStage }, (_, index) => `static/stickers/future-${index + 1}.png`),
};

const stagePosterTitles = {
  past: [
    '어린 시절의 첫 기억',
    '가족과 함께한 여행',
    '학교에서의 첫 도전',
    '꿈을 키우던 순간',
    '처음 만든 작품 노트',
    '비 오는 날의 운동장',
    '친구들과의 축제 준비',
    '작은 용기를 냈던 발표',
    '해 질 무렵의 귀가길',
    '오래 간직한 소중한 장면',
  ],
  present: [
    '지금의 일상 루틴',
    '함께하는 팀 프로젝트',
    '성장 중인 나의 기록',
    '요즘 가장 몰입한 취미',
    '작업실의 오후 풍경',
    '새로운 아이디어 스케치',
    '동료와 나눈 피드백',
    '집중이 가장 잘 되는 시간',
    '몸과 마음을 돌보는 습관',
    '오늘의 작은 성취',
  ],
  future: [
    '가고 싶은 도시',
    '만들고 싶은 작품',
    '이루고 싶은 목표',
    '미래의 나에게 보내는 메시지',
    '함께 열고 싶은 전시',
    '도전해 보고 싶은 기술',
    '오래 지속할 프로젝트',
    '새로운 팀과의 협업',
    '내가 꿈꾸는 하루의 모습',
    '미래를 향한 약속',
  ],
};

const stagePosterComments = {
  past: [
    '처음으로 스스로를 칭찬했던 날의 감정.',
    '가족과 웃던 순간이 아직도 선명하게 남아있다.',
    '두려워도 한 걸음 내딛었던 그날의 용기.',
    '작은 메모장에 큰 꿈을 적어 내려가던 시기.',
    '서툴지만 진심으로 몰입했던 첫 창작의 기록.',
    '비 냄새와 함께 떠오르는 또렷한 풍경의 조각.',
    '서로를 응원하며 밤늦게까지 준비했던 시간.',
    '떨렸지만 끝내 해냈던 순간이 남긴 자신감.',
    '하루를 마무리하며 스스로를 다독이던 장면.',
    '시간이 지나도 선명하게 남아 있는 추억의 온기.',
  ],
  present: [
    '반복되는 일상 속에서도 꾸준함을 연습하는 중.',
    '서로 다른 아이디어가 모여 더 나은 결과를 만든다.',
    '어제보다 나아진 오늘을 남기는 개인 아카이브.',
    '몰입하는 시간이 하루의 에너지를 채워준다.',
    '익숙한 공간에서도 새로운 시선을 발견하려 한다.',
    '작은 스케치 하나가 다음 결과물의 출발점이 된다.',
    '대화 속에서 놓치기 쉬운 힌트를 자주 얻는다.',
    '리듬을 찾은 시간대에는 집중이 자연스럽게 이어진다.',
    '건강한 루틴이 작업의 지속력을 만들어 준다.',
    '작은 완성도 모이면 분명한 변화로 이어진다.',
  ],
  future: [
    '낯선 도시에서 새로운 시선을 만나고 싶다.',
    '언젠가 사람들에게 오래 기억될 작품을 만들고 싶다.',
    '명확한 목표는 매일의 선택을 단단하게 만든다.',
    '미래의 나에게: 지금의 진심을 잊지 말자.',
    '더 많은 사람과 감상을 나누는 공간을 만들고 싶다.',
    '낯선 분야를 배우며 표현의 폭을 넓히고 싶다.',
    '오랜 시간 애정을 담아 완성할 작업을 준비 중이다.',
    '서로 영감을 주고받는 동료들과 함께 성장하고 싶다.',
    '일과 삶이 균형을 이루는 하루를 설계하고 싶다.',
    '작은 실천을 꾸준히 쌓아 먼 미래를 바꾸고 싶다.',
  ],
};

function createPosterFallbackTexture(stageName, posterNumber) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#ffe9f0');
  gradient.addColorStop(1, '#f3f0ff');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(29, 24, 36, 0.82)';
  ctx.font = '700 90px Pretendard, Noto Sans KR, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${stageName.toUpperCase()} ${posterNumber}`, canvas.width / 2, canvas.height / 2 - 30);
  ctx.font = '500 56px Pretendard, Noto Sans KR, sans-serif';
  ctx.fillText('IMAGE 준비 중', canvas.width / 2, canvas.height / 2 + 70);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const stagePosterTextures = Object.fromEntries(
  Object.entries(stagePosterTexturePaths).map(([stageName, paths]) => [
    stageName,
    paths.map((path, index) => {
      const texture = textureLoader.load(
        path,
        undefined,
        undefined,
        () => {
          const fallbackTexture = createPosterFallbackTexture(stageName, index + 1);
          texture.image = fallbackTexture.image;
          texture.needsUpdate = true;
        },
      );
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
const stageWidth = 34;
const posterMeshes = [];
const walkableMeshes = [];
const bridgeZones = [];
const posterAspectRatio = 1080 / 1920;

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
  canvas.height = 220;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, 'rgba(17, 14, 28, 0.96)');
  gradient.addColorStop(1, 'rgba(34, 27, 52, 0.96)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, canvas.width - 28, canvas.height - 28);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 255, 255, 1)';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.38)';
  let fontSize = 74;
  while (fontSize > 44) {
    ctx.font = `800 ${fontSize}px Pretendard, Noto Sans KR, sans-serif`;
    if (ctx.measureText(text).width < canvas.width - 90) break;
    fontSize -= 4;
  }
  ctx.lineWidth = 10;
  ctx.strokeText(text, canvas.width / 2, canvas.height / 2 + 3);
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createPosterCommentTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 210;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, 'rgba(255, 250, 239, 0.98)');
  gradient.addColorStop(1, 'rgba(249, 241, 228, 0.98)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(101, 82, 59, 0.25)';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(34, 24, 13, 0.98)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  let fontSize = 45;
  while (fontSize > 30) {
    ctx.font = `700 ${fontSize}px Pretendard, Noto Sans KR, sans-serif`;
    if (ctx.measureText(text).width < canvas.width - 90) break;
    fontSize -= 2;
  }
  ctx.lineWidth = 5;
  ctx.strokeText(text, canvas.width / 2, canvas.height / 2 + 1);
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 1);

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
  floor.material.map = grassTexture;
  floor.material.color.setHex(0xd4f2c7);
  floor.material.roughness = 0.95;
  floor.material.metalness = 0.01;
  floor.material.needsUpdate = true;
  group.add(floor);
  walkableMeshes.push(floor);

  const totalPosters = stagePosterTextures[stage.name].length;
  const framesPerSide = Math.ceil(totalPosters / 2);
  const galleryScale = 0.8;
  const spacing = stageLength / (framesPerSide + 1);
  const wallInsetBySide = {
    1: stageWidth * 0.5 - 2.1,
    '-1': stageWidth * 0.5 - 6.2,
  };
  const posterHeight = 8 * galleryScale;
  const posterWidth = posterHeight * posterAspectRatio;
  const captionHeight = 1.6 * galleryScale;
  const framePadding = 0.7;
  const frameWidth = posterWidth + framePadding;
  const frameHeight = posterHeight + framePadding;
  const wallWidth = frameWidth + 1.1;
  const wallHeight = frameHeight + 0.9;

  const ceilingLight = new THREE.PointLight(0xcfc5ff, 8, 50, 2);
  ceilingLight.position.set(0, 7.2, 0);
  group.add(ceilingLight);

  for (let side of [-1, 1]) {
    for (let w = 0; w < framesPerSide; w += 1) {
      const x = -stageLength / 2 + spacing * (w + 1);
      const z = side * wallInsetBySide[side];
      const posterIndex = side === -1 ? w : w + framesPerSide;
      if (posterIndex >= totalPosters) continue;

      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(wallWidth, wallHeight, 0.5 * galleryScale),
        shared.wall,
      );
      wall.position.set(x, 3.6, z);
      wall.rotation.y = side === 1 ? Math.PI : 0;
      wall.castShadow = true;
      wall.receiveShadow = true;
      group.add(wall);

      const poster = new THREE.Mesh(
        new THREE.PlaneGeometry(posterWidth, posterHeight),
        new THREE.MeshStandardMaterial({
          map: stagePosterTextures[stage.name][posterIndex],
          roughness: 0.66,
          side: THREE.FrontSide,
        }),
      );
      poster.position.set(0, 0.24, 0.26);
      wall.add(poster);
      poster.userData.isPoster = true;
      posterMeshes.push(poster);

      const caption = new THREE.Mesh(
        new THREE.PlaneGeometry(frameWidth - 0.2, captionHeight),
        new THREE.MeshBasicMaterial({
          map: createPosterTitleTexture(stagePosterTitles[stage.name][posterIndex]),
          transparent: true,
          depthTest: false,
        }),
      );
      caption.position.set(0, -posterHeight * 0.5 - captionHeight * 0.4, 0.5);
      caption.renderOrder = 10;
      wall.add(caption);

      const comment = new THREE.Mesh(
        new THREE.PlaneGeometry(frameWidth - 0.2, captionHeight * 0.92),
        new THREE.MeshBasicMaterial({
          map: createPosterCommentTexture(stagePosterComments[stage.name][posterIndex]),
          transparent: true,
          depthTest: false,
        }),
      );
      comment.position.set(0, -posterHeight * 0.5 - captionHeight * 1.42, 0.5);
      comment.renderOrder = 10;
      wall.add(comment);

      const frameBack = new THREE.Mesh(
        new THREE.PlaneGeometry(frameWidth, frameHeight),
        new THREE.MeshStandardMaterial({ color: 0x6f4f3a, roughness: 0.62 }),
      );
      frameBack.position.set(0, 0.2, -0.01);
      wall.add(frameBack);

      const h = frameHeight;
      const w2 = frameWidth;
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
  bridge.material.map = grassTexture;
  bridge.material.color.setHex(0xc6e8b6);
  bridge.material.roughness = 0.95;
  bridge.material.metalness = 0.01;
  bridge.material.needsUpdate = true;
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
  const grassAreaGeo = new THREE.PlaneGeometry(420, 300);
  const grassAreaMat = new THREE.MeshStandardMaterial({ map: grassTexture, color: 0x9dd48f, roughness: 0.96, metalness: 0.02 });
  const grassArea = new THREE.Mesh(grassAreaGeo, grassAreaMat);
  grassArea.rotation.x = -Math.PI / 2;
  grassArea.position.y = -0.87;
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

const animationState = {
  mixer: null,
  actions: {},
  activeAction: null,
  proceduralRig: null,
};

function findAnimationClip(clips, preferredNames) {
  if (!clips?.length) return null;

  for (const preferred of preferredNames) {
    const exact = clips.find((clip) => clip.name.toLowerCase() === preferred.toLowerCase());
    if (exact) return exact;
  }

  for (const preferred of preferredNames) {
    const partial = clips.find((clip) => clip.name.toLowerCase().includes(preferred.toLowerCase()));
    if (partial) return partial;
  }

  return null;
}

function setAnimationAction(name, fade = 0.24) {
  if (!animationState.actions[name]) return;

  const next = animationState.actions[name];
  if (animationState.activeAction === next) return;

  next.reset().fadeIn(fade).play();
  if (animationState.activeAction) {
    animationState.activeAction.fadeOut(fade);
  }
  animationState.activeAction = next;
}

function clearAnimationState() {
  if (animationState.mixer) {
    animationState.mixer.stopAllAction();
  }

  animationState.mixer = null;
  animationState.actions = {};
  animationState.activeAction = null;
  animationState.proceduralRig = null;
}

function setupModelAnimations(modelRoot, clips) {
  clearAnimationState();
  if (!clips?.length) return;

  const mixer = new THREE.AnimationMixer(modelRoot);
  const idleClip = findAnimationClip(clips, ['idle', 'breathe']);
  const runClip = findAnimationClip(clips, ['run', 'running', 'walk', 'walking']);
  const fallbackClip = clips[0];

  const idleAction = mixer.clipAction(idleClip || fallbackClip);
  const runAction = mixer.clipAction(runClip || idleClip || fallbackClip);
  idleAction.enabled = true;
  runAction.enabled = true;
  idleAction.play();

  animationState.mixer = mixer;
  animationState.actions = {
    Idle: idleAction,
    Run: runAction,
  };
  animationState.activeAction = idleAction;
}

function setupProceduralRig(root) {
  const rig = {
    hipY: root.position.y,
    leftArm: null,
    rightArm: null,
    leftLeg: null,
    rightLeg: null,
  };

  root.traverse((obj) => {
    if (!obj?.isMesh) return;
    const y = obj.position.y;
    const x = obj.position.x;

    if (obj.geometry?.type === 'CapsuleGeometry') {
      if (y > 0.68 && Math.abs(x) > 0.3) {
        if (x < 0) rig.leftArm = obj;
        else rig.rightArm = obj;
      } else if (y < 0.35 && Math.abs(x) < 0.25) {
        if (x < 0) rig.leftLeg = obj;
        else rig.rightLeg = obj;
      }
    }
  });

  const hasLimbSet = rig.leftArm && rig.rightArm && rig.leftLeg && rig.rightLeg;
  animationState.proceduralRig = hasLimbSet ? rig : null;
}

function updateProceduralAnimation(t) {
  const rig = animationState.proceduralRig;
  if (!rig) return;

  const moving = state.actor === 'Run';
  const speed = moving ? 11.5 : 3.6;
  const stride = moving ? 0.72 : 0.08;
  const armStride = moving ? 0.9 : 0.1;
  const phase = t * speed;

  rig.leftArm.rotation.x = Math.sin(phase) * armStride + 0.1;
  rig.rightArm.rotation.x = -Math.sin(phase) * armStride - 0.1;
  rig.leftLeg.rotation.x = -Math.sin(phase) * stride;
  rig.rightLeg.rotation.x = Math.sin(phase) * stride;

  const bobScale = moving ? 0.06 : 0.03;
  player.position.y = rig.hipY + Math.abs(Math.sin(phase * 0.5)) * bobScale;
}

function loadMainCharacter() {
  const loader = new GLTFLoader();
  const modelCandidates = [
    'static/RobotExpressive.glb',
    'static/models/main-character.glb',
    'static/models/avatar.glb',
  ];

  const applyModelToPlayer = (model) => {
    player.clear();
    model.scale.multiplyScalar(0.5);
    player.add(model);
    setupProceduralRig(model);
  };

  const applyFallback = (hintText) => {
    applyModelToPlayer(createFallbackCharacter());
    setHint(hintText);
  };

  // GLB 파싱이 지연되거나 실패하더라도 장면이 비어 보이지 않게 기본 캐릭터를 먼저 배치합니다.
  applyFallback('GLB 파일을 불러오는 중이에요...');

  const tryLoad = (index) => {
    if (index >= modelCandidates.length) {
      applyFallback('GLB 파일을 찾지 못해 기본 캐릭터를 사용 중이에요. static/models/character.glb 파일을 추가해 주세요.');
      return;
    }

    loader.load(
      modelCandidates[index],
      (gltf) => {
        try {
          const modelRoot = gltf.scene || gltf.scenes?.[0];
          if (!modelRoot) throw new Error('GLTF scene is missing');

          modelRoot.scale.setScalar(1.5);
          const box = new THREE.Box3().setFromObject(modelRoot);
          const size = new THREE.Vector3();
          box.getSize(size);
          const center = new THREE.Vector3();
          box.getCenter(center);

          const invalidSize = [size.x, size.y, size.z].some((value) => !Number.isFinite(value) || value <= 0.0001);
          if (invalidSize) throw new Error('Model bounds are invalid');

          modelRoot.position.sub(center);
          modelRoot.position.y += size.y * 0.5;

          modelRoot.traverse((obj) => {
            if (obj.isMesh) {
              obj.castShadow = true;
              obj.receiveShadow = true;
            }
          });

          applyModelToPlayer(modelRoot);
          setupModelAnimations(modelRoot, gltf.animations);
          setHint(`GLB 캐릭터(${modelCandidates[index]})를 불러왔어요. 바닥을 클릭해 이동해 보세요.`);
        } catch (_error) {
          tryLoad(index + 1);
        }
      },
      undefined,
      () => tryLoad(index + 1),
    );
  };

  tryLoad(0);
}

loadMainCharacter();

const state = {
  stage: 0,
  actor: 'Idle',
  moveTarget: null,
  focusedPoster: null,
  focusedPosterDistance: 4.8,
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
  player.position.z = THREE.MathUtils.clamp(player.position.z, -56, 56);
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
  const posterSize = new THREE.Vector3();
  new THREE.Box3().setFromObject(poster).getSize(posterSize);

  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
  const distanceForHeight = (posterSize.y * 0.5) / Math.tan(verticalFov / 2);
  const distanceForWidth = (posterSize.x * 0.5) / Math.tan(horizontalFov / 2);
  state.focusedPosterDistance = Math.max(distanceForHeight, distanceForWidth) + 0.8;

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
    posterFocusPosition.copy(posterLookTarget).addScaledVector(normal, state.focusedPosterDistance).add(new THREE.Vector3(0, 0.4, 0));
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

  if (animationState.mixer) {
    animationState.mixer.update(dt);
    setAnimationAction(state.actor === 'Run' ? 'Run' : 'Idle');
    player.position.y = 0;
  }

  if (!animationState.mixer) {
    updateProceduralAnimation(t);
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
