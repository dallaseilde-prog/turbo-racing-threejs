/**
 * TURBO RACING DAY - GAME ENGINE
 */

const CONFIG = {
    trackRadius: 400,
    trackWidth: 20,
    laps: 3,
    aiCount: 5
};

const TRACKS = [
    {
        name: "SUNNY HILLS",
        sky: 0x87CEEB,
        ground: 0x44aa44,
        fog: 0x87CEEB,
        treeColor: 0x228822,
        asphalt: '#555',
        pts: (r) => {
            const p = [];
            for (let i = 0; i < 24; i++) {
                const t = (i / 24) * Math.PI * 2;
                const x = Math.cos(t) * r + Math.sin(t * 3) * 60;
                const z = Math.sin(t) * r + Math.cos(t * 2) * 100;
                const y = Math.sin(t * 4) * 8;
                p.push(new THREE.Vector3(x, y, z));
            }
            return p;
        }
    },
    {
        name: "DESERT CANYON",
        sky: 0xffa500,
        ground: 0xd2b48c,
        fog: 0xffa500,
        treeColor: 0x8b4513,
        asphalt: '#443322',
        pts: (r) => {
            const p = [];
            for (let i = 0; i < 24; i++) {
                const t = (i / 24) * Math.PI * 2;
                const x = Math.cos(t) * (r * 1.2) + Math.sin(t * 5) * 120;
                const z = Math.sin(t) * (r * 0.8) + Math.cos(t * 3) * 150;
                const y = Math.sin(t * 2) * 20 + (i % 2 === 0 ? 5 : -5);
                p.push(new THREE.Vector3(x, y, z));
            }
            return p;
        }
    },
    {
        name: "NIGHT CITY",
        sky: 0x050510,
        ground: 0x111111,
        fog: 0x050510,
        treeColor: 0x00ffff,
        asphalt: '#1a1a1a',
        neon: true,
        pts: (r) => {
            const p = [];
            for (let i = 0; i < 32; i++) {
                const t = (i / 32) * Math.PI * 2;
                const x = Math.cos(t) * (r * 1.5) + Math.cos(t * 4) * 50;
                const z = Math.sin(t) * r + Math.sin(t * 4) * 100;
                const y = 0;
                p.push(new THREE.Vector3(x, y, z));
            }
            return p;
        }
    }
];

const CARS = [
    { name: "RED FIRE", color: 0xff4444, speed: 1.0, handle: 1.0 },
    { name: "BLUE JET", color: 0x4488ff, speed: 1.1, handle: 0.8 },
    { name: "SHADOW", color: 0x222222, speed: 0.9, handle: 1.2 }
];

let selectedCarIdx = 0;
let selectedTrackIdx = 0;
let gameState = 'menu';
let clock, scene, camera, renderer;
let trackCurve;
let player = { mesh: null, progress: 0, offset: 0, speed: 0, maxSpeed: 0, accel: 0, lap: 1 };
let opponents = [];
let obstacles = [];
let inputs = { left: false, right: false };

function selectCar(idx) {
    selectedCarIdx = idx;
    document.querySelectorAll('.car-option').forEach((el, i) => el.classList.toggle('selected', i === idx));
}

function selectTrack(idx) {
    selectedTrackIdx = idx;
    document.querySelectorAll('.track-option').forEach((el, i) => el.classList.toggle('selected', i === idx));
}

function startGame() {
    document.getElementById('menu-layer').style.display = 'none';
    document.getElementById('hud').style.display = 'flex';
    initThree();
    createTrack();
    createPlayer();
    createOpponents();
    createObstacles();
    createEnvironment();
    gameState = 'countdown';
    document.getElementById('countdown-layer').style.display = 'flex';
    let count = 3;
    const el = document.getElementById('countdown');
    updateCarPosition(player.mesh, 0, 0);
    updateCameraChase();
    const timer = setInterval(() => {
        count--;
        if (count > 0) { el.innerText = count; }
        else if (count === 0) { el.innerText = 'GO!'; el.style.color = '#ffcc00'; }
        else {
            clearInterval(timer);
            document.getElementById('countdown-layer').style.display = 'none';
            gameState = 'racing';
            clock.start();
        }
    }, 1000);
    animate();
}

function initThree() {
    const track = TRACKS[selectedTrackIdx];
    clock = new THREE.Clock();
    scene = new THREE.Scene();
    scene.background = new THREE.Color(track.sky);
    scene.fog = new THREE.Fog(track.fog, 200, 1500);
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 4000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(200, 400, 100);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 4096;
    sun.shadow.camera.far = 1000;
    scene.add(sun);
}

function createTrack() {
    const trackData = TRACKS[selectedTrackIdx];
    const pts = trackData.pts(CONFIG.trackRadius);
    trackCurve = new THREE.CatmullRomCurve3(pts);
    trackCurve.closed = true;
    const segments = 600;
    const roadGeo = new THREE.BufferGeometry();
    const positions = [], uvs = [], indices = [];
    const w = CONFIG.trackWidth;
    for (let i = 0; i < segments; i++) {
        const t = i / segments, pt = trackCurve.getPointAt(t), tan = trackCurve.getTangentAt(t).normalize();
        const up = new THREE.Vector3(0, 1, 0), binormal = new THREE.Vector3().crossVectors(tan, up).normalize();
        const p1 = pt.clone().add(binormal.clone().multiplyScalar(-w)), p2 = pt.clone().add(binormal.clone().multiplyScalar(w));
        positions.push(p1.x, p1.y + 0.3, p1.z, p2.x, p2.y + 0.3, p2.z);
        uvs.push(0, t * 60, 1, t * 60);
        const base = i * 2, nextBase = ((i + 1) % segments) * 2;
        indices.push(base, base + 1, nextBase, base + 1, nextBase + 1, nextBase);
    }
    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    roadGeo.setIndex(indices);
    roadGeo.computeVertexNormals();
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = trackData.asphalt; ctx.fillRect(0, 0, 512, 512);
    const tex = new THREE.CanvasTexture(canvas); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    const mat = new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(roadGeo, mat); mesh.receiveShadow = true;
    scene.add(mesh);
}

function createEnvironment() {
    const trackData = TRACKS[selectedTrackIdx];
    const textureLoader = new THREE.TextureLoader();
    const buildingTextures = [
        textureLoader.load('assets/textures/building_cyber.jpg'),
        textureLoader.load('assets/textures/building_neon.jpg'),
        textureLoader.load('assets/textures/building_tech.jpg')
    ];
    buildingTextures.forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 4); });
    const grassGeo = new THREE.PlaneGeometry(20000, 20000);
    const grassMat = new THREE.MeshStandardMaterial({ color: trackData.ground });
    const grass = new THREE.Mesh(grassGeo, grassMat); grass.rotation.x = -Math.PI / 2; grass.position.y = -20;
    scene.add(grass);
    const treeGeo = new THREE.ConeGeometry(5, 15, 8);
    const treeMat = new THREE.MeshStandardMaterial({ color: trackData.treeColor });
    for (let i = 0; i < 300; i++) {
        const t = Math.random(), pos = trackCurve.getPointAt(t), tan = trackCurve.getTangentAt(t);
        const norm = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 1, 0)).normalize();
        const dist = 50 + Math.random() * 500, side = Math.random() > 0.5 ? 1 : -1;
        const finalPos = pos.clone().add(norm.multiplyScalar(dist * side));
        const grp = new THREE.Group();
        if (trackData.name === 'NIGHT CITY') {
            const tex = buildingTextures[Math.floor(Math.random() * buildingTextures.length)];
            const h = 100 + Math.random() * 300, w = 30 + Math.random() * 20;
            const mat = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.9, roughness: 0.1, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.4 });
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat); mesh.position.y = h / 2;
            grp.add(mesh);
        } else {
            const mesh = new THREE.Mesh(treeGeo, treeMat); mesh.position.y = 10; grp.add(mesh);
            grp.scale.set(2, 2, 2);
        }
        grp.position.copy(finalPos); scene.add(grp);
    }
}

function createCarMesh(color) {
    const grp = new THREE.Group();
    const matBody = new THREE.MeshStandardMaterial({ color: color, metalness: 0.6, roughness: 0.2 });
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, 7), matBody);
    chassis.position.y = 1.2; chassis.castShadow = true; grp.add(chassis);
    return grp;
}

function createPlayer() {
    const spec = CARS[selectedCarIdx];
    player.mesh = createCarMesh(spec.color); scene.add(player.mesh);
    player.maxSpeed = 180 * spec.speed; player.trackLen = trackCurve.getLength();
    player.accel = 100; player.turnSpeed = 25 * spec.handle;
}

function createOpponents() {
    for (let i = 0; i < CONFIG.aiCount; i++) {
        const ai = { mesh: createCarMesh(0x00ff00), progress: 0.01 + (i * 0.01), offset: (Math.random() - 0.5) * 15, speed: 145 + Math.random() * 35 };
        scene.add(ai.mesh); opponents.push(ai);
    }
}

function createObstacles() {
    const mat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
    for (let i = 0; i < 45; i++) {
        const p = 0.15 + (i / 45) * 0.8;
        const pt = trackCurve.getPointAt(p), tan = trackCurve.getTangentAt(p);
        const norm = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 1, 0)).normalize();
        const o = (Math.random() - 0.5) * 20;
        const mesh = new THREE.Mesh(new THREE.ConeGeometry(1.5, 4, 8), mat);
        mesh.position.copy(pt.clone().add(norm.multiplyScalar(o)));
        mesh.position.y += 2; scene.add(mesh);
        obstacles.push({ mesh, progress: p, offset: o });
    }
}

window.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'a') inputs.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd') inputs.right = true;
});
window.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft' || e.key === 'a') inputs.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') inputs.right = false;
});

function animate() {
    requestAnimationFrame(animate);
    if (gameState === 'racing') { updateGame(clock.getDelta()); }
    renderer.render(scene, camera);
}

function updateGame(dt) {
    if (player.speed < player.maxSpeed) player.speed += player.accel * dt;
    let turn = 0; if (inputs.left) turn -= 1; if (inputs.right) turn += 1;
    player.offset += turn * player.turnSpeed * dt;
    player.progress += (player.speed * dt) / player.trackLen;
    if (player.progress >= 1) { player.progress -= 1; player.lap++; document.getElementById('hud-lap').innerText = `${player.lap}/${CONFIG.laps}`; if (player.lap > CONFIG.laps) endGame(); }
    updateCarPosition(player.mesh, player.progress, player.offset);
    updateCameraChase();
    opponents.forEach(ai => { ai.progress += (ai.speed / player.trackLen) * dt; if (ai.progress >= 1) ai.progress -= 1; updateCarPosition(ai.mesh, ai.progress, ai.offset); });
    document.getElementById('hud-speed').innerText = Math.floor(player.speed);
}

function updateCarPosition(mesh, progress, offset) {
    const pt = trackCurve.getPointAt(progress % 1), tan = trackCurve.getTangentAt(progress % 1).normalize();
    const up = new THREE.Vector3(0, 1, 0), binormal = new THREE.Vector3().crossVectors(tan, up).normalize();
    mesh.position.copy(pt.clone().add(binormal.multiplyScalar(offset)));
    mesh.lookAt(mesh.position.clone().add(tan));
}

function updateCameraChase() {
    const tan = trackCurve.getTangentAt(player.progress % 1).normalize();
    camera.position.lerp(player.mesh.position.clone().add(tan.clone().multiplyScalar(-38).add(new THREE.Vector3(0, 22, 0))), 0.12);
    camera.lookAt(player.mesh.position.clone().add(tan.multiplyScalar(25)));
}

function endGame() { gameState = 'finished'; document.getElementById('hud').style.display = 'none'; document.getElementById('game-over-layer').style.display = 'flex'; }

window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
