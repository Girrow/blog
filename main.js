import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.165.0/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x090b12, 8, 24);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.set(0, 1.7, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.append(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxDistance = 15;
controls.minDistance = 3;

const ambient = new THREE.AmbientLight(0xffffff, 1.4);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0x92a7ff, 1.2);
keyLight.position.set(4, 6, 5);
scene.add(keyLight);

const point = new THREE.PointLight(0xff7de5, 40, 20, 2);
point.position.set(-2, 2, 2);
scene.add(point);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(9, 64),
  new THREE.MeshStandardMaterial({
    color: 0x0f1320,
    roughness: 0.9,
    metalness: 0.05,
    transparent: true,
    opacity: 0.8,
  }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.6;
scene.add(floor);

const centerObject = new THREE.Mesh(
  new THREE.TorusKnotGeometry(1, 0.32, 160, 24),
  new THREE.MeshStandardMaterial({
    color: 0x6ca5ff,
    metalness: 0.6,
    roughness: 0.2,
    emissive: 0x1b4de0,
    emissiveIntensity: 0.25,
  }),
);
scene.add(centerObject);

const textureLoader = new THREE.TextureLoader();
const photoUrls = [
  'https://picsum.photos/id/1015/1024/768',
  'https://picsum.photos/id/1025/1024/768',
  'https://picsum.photos/id/1035/1024/768',
  'https://picsum.photos/id/1040/1024/768',
  'https://picsum.photos/id/1067/1024/768',
  'https://picsum.photos/id/1074/1024/768',
];

const photoGroup = new THREE.Group();
scene.add(photoGroup);

photoUrls.forEach((url, index) => {
  const angle = (index / photoUrls.length) * Math.PI * 2;
  const radius = 5.1;
  const texture = textureLoader.load(url);
  texture.colorSpace = THREE.SRGBColorSpace;

  const frame = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 1.6),
    new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.65,
      metalness: 0.1,
      side: THREE.DoubleSide,
    }),
  );

  frame.position.set(Math.cos(angle) * radius, 0.25, Math.sin(angle) * radius);
  frame.lookAt(0, 0.25, 0);

  const border = new THREE.Mesh(
    new THREE.PlaneGeometry(2.45, 1.75),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }),
  );
  border.position.z = -0.015;
  frame.add(border);

  photoGroup.add(frame);
});

const clock = new THREE.Clock();

function animate() {
  const t = clock.getElapsedTime();

  centerObject.rotation.x = t * 0.45;
  centerObject.rotation.y = t * 0.55;
  centerObject.position.y = Math.sin(t * 1.4) * 0.24;

  photoGroup.rotation.y = t * 0.14;
  point.position.x = Math.sin(t * 1.7) * 3;
  point.position.z = Math.cos(t * 1.4) * 3;

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
