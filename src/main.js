import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import './style.css';

const floors = [5, 4, 3, 2, 1, -1];
const floorName = f => f === -1 ? '지하 1층' : `지상 ${f}층`;
const level = f => f === -1 ? 0 : f;
const equipment = [
  { id: 'server', name: '방재실 서버', type: '서버', floor: -1, location: '지하 1층 · 방재실', position: [-2.5, 0, 0.3], description: '건물 정보통신설비를 관리하는 중앙 서버입니다.' },
  { id: 'entrance', name: '출입구 CCTV', type: 'CCTV', floor: 1, location: '지상 1층 · 주 출입구', position: [0.9, 0, 2.6], description: '주 출입구와 로비 진입 구역을 촬영하는 카메라입니다.' },
  { id: 'corridor', name: '복도 CCTV', type: 'CCTV', floor: 3, location: '지상 3층 · 중앙 복도', position: [0.5, 0, 1], description: '사무실 사이 중앙 복도를 촬영하는 카메라입니다.' },
];
let selectedFloor = null;
let selectedEquipment = null;
document.querySelector('#app').innerHTML = `
<header><a class="brand" href="./"><span class="brand-mark">▥</span><span>빌딩스코프<small>정보통신설비 유지관리</small></span></a><div class="header-title">공간을 통해 이해하는 시설관리</div><span class="prototype"><i></i>시제품 체험</span></header>
<main><aside class="sidebar"><div class="eyebrow">시설 현황</div><h1>센트럴 오피스</h1><p class="muted">가상 업무시설 · 지상 5층 / 지하 1층</p><div class="summary"><div><b>6</b><span>전체 층</span></div><div><b>3</b><span>등록 설비</span></div></div><div class="section-heading"><h2>층별 탐색</h2><span>층을 선택하세요</span></div><div id="floors"><button class="floor active" data-floor="all"><span>전체 건물</span><span class="floor-meta">6개 층</span></button>${floors.map(f => `<button class="floor" data-floor="${f}"><span><b>${f === -1 ? 'B1' : `${f}F`}</b>${floorName(f)}</span><span class="floor-meta">${f === -1 ? '방재실 · 서버 1' : f === 1 ? '로비 · CCTV 1' : f === 3 ? '사무실 · CCTV 1' : '사무실'}</span></button>`).join('')}</div><div class="section-heading"><h2>등록 설비</h2><span>3대</span></div><div id="equipment-list">${equipment.map(e => `<button class="equipment-row" data-equipment="${e.id}"><span class="equipment-icon ${e.type === '서버' ? 'server' : ''}">${e.type === '서버' ? '▤' : '◉'}</span><span><strong>${e.name}</strong><small>${e.location}</small></span><span class="row-arrow">↗</span></button>`).join('')}</div><div class="sidebar-note">가상 건물 안내<br><span>실제 도면을 사용하지 않은 개념 시제품입니다.</span></div></aside>
<section class="workspace" aria-label="3D 건물 탐색"><div class="viewer-heading"><div><span class="eyebrow">입체 공간 탐색</span><h2 id="view-title">건물 전체 보기</h2></div><div class="view-actions"><button id="reset">↺ 시점 초기화</button><button id="labels" aria-pressed="true">설비 이름 표시</button></div></div><div id="viewport" role="img" aria-label="마우스로 회전하고 확대할 수 있는 반투명 3D 사무용 건물"></div><div class="viewer-legend"><span><i class="cyan"></i>CCTV</span><span><i class="amber"></i>서버</span><span><i class="slate"></i>반투명 외벽</span></div><div class="viewer-help">드래그로 회전 <span>·</span> 휠로 확대·축소 <span>·</span> 오른쪽 드래그로 이동</div><div class="view-badge">개념 모델 <span>·</span> 실시간 3D</div><div id="error" hidden></div></section>
<aside class="details"><div class="eyebrow">설비 인사이트</div><h2>설비 상세 정보</h2><div id="detail-content" aria-live="polite"><div class="empty-icon">⌖</div><h3>설비를 선택하세요</h3><p>건물 안의 설비 아이콘이나<br>왼쪽 설비 목록을 클릭하면<br>설치 정보를 확인할 수 있습니다.</p></div><div class="guide"><h3>탐색 가이드</h3><ol><li>전체 건물을 회전하며 살펴보세요.</li><li>층을 선택해 내부를 확인하세요.</li><li>설비를 눌러 설치 위치를 확인하세요.</li></ol></div><div class="data-note"><i></i>설치 위치는 시제품용 가상 데이터입니다.<br>실시간 장비 상태와 연결되어 있지 않습니다.</div></aside></main><footer><span>빌딩스코프 · 3D 시설관리 시제품</span><span>가상 구조 / 설비 3대</span></footer>`;

const viewport = document.querySelector('#viewport');
try {
  initialize();
} catch (error) {
  console.error(error);
  const message = document.querySelector('#error');
  message.hidden = false;
  message.textContent = '3D 화면을 시작하지 못했습니다. 최신 Chrome 또는 Edge에서 하드웨어 가속을 켜고 다시 시도해 주세요.';
}
function initialize() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#101c2c');
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 180);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  viewport.appendChild(renderer.domElement);
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.className = 'scene-labels';
  viewport.appendChild(labelRenderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 5;
  controls.maxDistance = 65;
  controls.maxPolarAngle = Math.PI * 0.86;
  scene.add(new THREE.HemisphereLight(0xd8efff, 0x556176, 2.5));
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.position.set(8, 20, 12);
  scene.add(sun);
  const grid = new THREE.GridHelper(44, 44, 0x314760, 0x1d3044);
  grid.position.y = -0.35;
  scene.add(grid);
  const material = (color, extras = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15, ...extras });
  const slabMat = material(0x738ca4);
  const wallMat = material(0x8ac5dc, { transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide });
  const frameMat = material(0x7195aa);
  const partitionMat = material(0x8bafbd, { transparent: true, opacity: 0.25, depthWrite: false });
  const groups = new Map();
  const interactive = [];
  const markers = [];
  function box(parent, size, position, mat) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
    mesh.position.set(...position); parent.add(mesh); return mesh;
  }
  function label(parent, text, position, className) {
    const element = document.createElement('div'); element.className = className; element.textContent = text;
    const object = new CSS2DObject(element); object.position.set(...position); parent.add(object); return object;
  }
  floors.forEach(f => {
    const group = new THREE.Group(); group.position.y = level(f) * 2.8; scene.add(group); groups.set(f, group);
    box(group, [9, 0.16, 6.5], [0, 0, 0], slabMat);
    const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(9, 0.17, 6.5)), new THREE.LineBasicMaterial({ color: 0xa5c3d5 })); group.add(outline);
    box(group, [9, 2.6, 0.05], [0, 1.4, -3.2], wallMat);
    box(group, [9, 2.6, 0.05], [0, 1.4, 3.2], wallMat);
    box(group, [0.05, 2.6, 6.4], [-4.45, 1.4, 0], wallMat);
    box(group, [0.05, 2.6, 6.4], [4.45, 1.4, 0], wallMat);
    [-4.35, 4.35].forEach(x => [-3.1, 3.1].forEach(z => box(group, [0.12, 2.7, 0.12], [x, 1.4, z], frameMat)));
    box(group, [0.07, 1.8, 4], [-1, 1, -1.1], partitionMat);
    box(group, [5.3, 1.8, 0.07], [1.7, 1, -0.4], partitionMat);
    // Shared circulation core and simplified office furniture.
    box(group, [1.2, 2.6, 1.4], [-3.5, 1.4, -2.3], material(0x39576a));
    if (f > 1) [-0.1, 2.5].forEach(x => {
      box(group, [1.6, 0.1, 0.8], [x, 0.9, -1.8], material(0xb5b5a7));
      box(group, [0.12, 0.8, 0.6], [x, 0.45, -1.8], frameMat);
      box(group, [0.6, 0.45, 0.08], [x, 1.18, -1.95], material(0x182f43));
    });
    if (f === 1) box(group, [2.5, 0.9, 0.8], [-2.5, 0.55, 1.8], material(0x779eae));
    label(group, f === -1 ? 'B1 · 방재실' : `${f}F`, [-5, 0.4, 3.3], 'floor-label');
  });
  equipment.forEach(e => {
    const group = new THREE.Group(); group.position.set(e.position[0], 0.15, e.position[2]); groups.get(e.floor).add(group);
    const color = e.type === '서버' ? 0xf4b860 : 0x40dfdb;
    if (e.type === '서버') {
      box(group, [0.8, 1.6, 0.85], [0, 0.85, 0], material(0x223950));
      for (let i = 0; i < 5; i++) {
        box(group, [0.64, 0.2, 0.06], [0, 0.35 + i * 0.25, 0.46], material(0x547086));
        box(group, [0.08, 0.06, 0.03], [0.22, 0.35 + i * 0.25, 0.5], material(color, { emissive: color, emissiveIntensity: 0.6 }));
      }
    } else {
      box(group, [0.12, 1.45, 0.12], [0, 0.75, 0], frameMat);
      box(group, [0.55, 0.35, 0.7], [0, 1.55, 0.15], material(0xe0eff3));
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 20), material(0x12293d));
      lens.rotation.x = Math.PI / 2; lens.position.set(0, 1.55, 0.55); group.add(lens);
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.035, 8, 48), material(color, { emissive: color, emissiveIntensity: 0.65 }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; group.add(ring);
    const hit = box(group, [1.2, 2, 1.4], [0, 1, 0], new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData.equipment = e; interactive.push(hit);
    const tag = label(group, `${e.type === '서버' ? '▤' : '◉'} ${e.name}`, [0, 2.2, 0], `equipment-label ${e.type === '서버' ? 'server-label' : ''}`);
    tag.element.addEventListener('click', () => selectEquipment(e));
    markers.push({ e, ring, tag });
  });
  function resetCamera() {
    const y = selectedFloor === null ? 7.3 : level(selectedFloor) * 2.8 + 1;
    controls.target.set(0, y, 0);
    camera.position.set(selectedFloor === null ? 22 : 13, y + (selectedFloor === null ? 13 : 8), selectedFloor === null ? 28 : 17);
    controls.update();
  }
  function selectFloor(f, reset = true) {
    selectedFloor = f;
    groups.forEach((g, floor) => { g.visible = f === null || floor === f; });
    document.querySelectorAll('[data-floor]').forEach(button => button.classList.toggle('active', button.dataset.floor === (f === null ? 'all' : String(f))));
    document.querySelector('#view-title').textContent = f === null ? '건물 전체 보기' : `${floorName(f)} · 내부 보기`;
    if (selectedEquipment && f !== null && selectedEquipment.floor !== f) clearSelection();
    if (reset) resetCamera();
  }
  function clearSelection() {
    selectedEquipment = null;
    document.querySelectorAll('[data-equipment]').forEach(b => b.classList.remove('selected'));
    document.querySelector('#detail-content').innerHTML = '<div class="empty-icon">⌖</div><h3>설비를 선택하세요</h3><p>건물 안의 설비 아이콘이나<br>왼쪽 설비 목록을 클릭하면<br>설치 정보를 확인할 수 있습니다.</p>';
  }
  function selectEquipment(e) {
    selectedEquipment = e; selectFloor(e.floor);
    document.querySelectorAll('[data-equipment]').forEach(b => b.classList.toggle('selected', b.dataset.equipment === e.id));
    document.querySelector('#detail-content').innerHTML = `<div class="detail-illustration ${e.type === '서버' ? 'warm' : ''}">${e.type === '서버' ? '▤' : '◉'}<span>${e.type}</span></div><span class="detail-category">정보통신설비</span><h3 class="equipment-title">${e.name}</h3><dl><dt>설비 종류</dt><dd>${e.type}</dd><dt>설치 위치</dt><dd>${e.location}</dd><dt>설비 번호</dt><dd>${e.id === 'server' ? '서버-001' : e.id === 'entrance' ? '카메라-001' : '카메라-002'}</dd></dl><p class="detail-description">${e.description}</p><div class="location-chip">⌖ ${floorName(e.floor)}에서 확인 중</div>`;
  }
  document.querySelectorAll('[data-floor]').forEach(b => b.addEventListener('click', () => selectFloor(b.dataset.floor === 'all' ? null : Number(b.dataset.floor))));
  document.querySelectorAll('[data-equipment]').forEach(b => b.addEventListener('click', () => selectEquipment(equipment.find(e => e.id === b.dataset.equipment))));
  document.querySelector('#reset').addEventListener('click', resetCamera);
  let labelsVisible = true;
  document.querySelector('#labels').addEventListener('click', event => {
    labelsVisible = !labelsVisible;
    markers.forEach(m => { m.tag.visible = labelsVisible; });
    event.currentTarget.setAttribute('aria-pressed', String(labelsVisible));
    event.currentTarget.textContent = labelsVisible ? '설비 이름 표시' : '설비 이름 숨김';
  });
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let down = null;
  renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', event => {
    if (!down || Math.hypot(event.clientX - down[0], event.clientY - down[1]) > 5 || event.button !== 0) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(interactive.filter(hit => selectedFloor === null || hit.userData.equipment.floor === selectedFloor));
    if (hits.length) selectEquipment(hits[0].object.userData.equipment);
  });
  new ResizeObserver(() => {
    const { width, height } = viewport.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height; camera.updateProjectionMatrix();
    renderer.setSize(width, height); labelRenderer.setSize(width, height);
  }).observe(viewport);
  resetCamera();
  renderer.setAnimationLoop(time => {
    controls.update();
    markers.forEach(m => { const scale = selectedEquipment?.id === m.e.id ? 1.15 + Math.sin(time * 0.003) * 0.1 : 1; m.ring.scale.setScalar(scale); });
    renderer.render(scene, camera); labelRenderer.render(scene, camera);
  });
}
