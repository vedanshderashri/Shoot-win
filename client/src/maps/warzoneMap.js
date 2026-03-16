import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// ============================================================
//  WARZONE MAP — Destroyed Urban Battlefield
// ============================================================

// ─── Procedural Textures ────────────────────────────────────

function createConcreteTexture(baseColor = '#606468') {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Smooth gradient base instead of flat color
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#6a6e73');
    grad.addColorStop(1, '#505458');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Subtle soft smudges instead of sharp noise
    for (let i = 0; i < 400; i++) {
        const x = Math.random() * 512, y = Math.random() * 512;
        const r = 5 + Math.random() * 20;
        const sGrad = ctx.createRadialGradient(x, y, 0, x, y, r);
        sGrad.addColorStop(0, 'rgba(0,0,0,0.06)');
        sGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sGrad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // A few subtle cracks
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        let cx = Math.random() * 512, cy = Math.random() * 512;
        ctx.moveTo(cx, cy);
        for (let s = 0; s < 5; s++) {
            cx += (Math.random() - 0.5) * 50;
            cy += Math.random() * 30;
            ctx.lineTo(cx, cy);
        }
        ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

function createGroundTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Smooth, realistic ground base
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#857865');
    grad.addColorStop(1, '#685d4c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Soft sand/dirt patches rather than noisy pixels
    for (let i = 0; i < 200; i++) {
        const x = Math.random() * 512, y = Math.random() * 512;
        const r = 10 + Math.random() * 40;
        const sGrad = ctx.createRadialGradient(x, y, 0, x, y, r);
        sGrad.addColorStop(0, 'rgba(0,0,0,0.05)');
        sGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sGrad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // Soft subtle highlights
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * 512, y = Math.random() * 512;
        const r = 5 + Math.random() * 25;
        const hGrad = ctx.createRadialGradient(x, y, 0, x, y, r);
        hGrad.addColorStop(0, 'rgba(255,255,255,0.03)');
        hGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = hGrad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(12, 12);
    return tex;
}

function createRubbleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Smooth rubble base
    const grad = ctx.createLinearGradient(0, 0, 256, 256);
    grad.addColorStop(0, '#756c60');
    grad.addColorStop(1, '#554c40');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // Soft shaded blocks instead of sharp flat rectangles
    for (let i = 0; i < 40; i++) {
        const x = Math.random() * 256, y = Math.random() * 256;
        const r = 8 + Math.random() * 15;
        const bGrad = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
        bGrad.addColorStop(0, 'rgba(255,255,255,0.08)');
        bGrad.addColorStop(1, 'rgba(0,0,0,0.15)');
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

// ─── Ambient War Audio ───────────────────────────────────────
export class AmbientWarAudio {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.running = false;
        this.timers = [];
    }

    start() {
        if (this.running) return;
        this.running = true;
        this._scheduleLoop();
    }

    stop() {
        this.running = false;
        this.timers.forEach(t => clearTimeout(t));
        this.timers = [];
    }

    _noise(duration = 0.08) {
        const bufLen = Math.floor(this.ctx.sampleRate * duration);
        const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
        return buf;
    }

    _playDistantShot() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const t = this.ctx.currentTime;

        // Low distant boom
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, t);
        osc.frequency.exponentialRampToValueAtTime(20, t + 0.4);
        const g1 = this.ctx.createGain();
        g1.gain.setValueAtTime(0.15, t);
        g1.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(g1); g1.connect(this.ctx.destination);
        osc.start(t); osc.stop(t + 0.5);

        // Crack noise tail
        const noise = this.ctx.createBufferSource();
        noise.buffer = this._noise(0.12);
        const bpf = this.ctx.createBiquadFilter();
        bpf.type = 'bandpass'; bpf.frequency.value = 600; bpf.Q.value = 0.5;
        const g2 = this.ctx.createGain();
        g2.gain.setValueAtTime(0.1, t);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        noise.connect(bpf); bpf.connect(g2); g2.connect(this.ctx.destination);
        noise.start(t);
    }

    _playExplosion() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const t = this.ctx.currentTime;

        const noise = this.ctx.createBufferSource();
        noise.buffer = this._noise(1.2);
        const lpf = this.ctx.createBiquadFilter();
        lpf.type = 'lowpass'; lpf.frequency.value = 400;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.5, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
        noise.connect(lpf); lpf.connect(g); g.connect(this.ctx.destination);
        noise.start(t);

        // Deep sub thump
        const osc = this.ctx.createOscillator();
        osc.type = 'sine'; osc.frequency.setValueAtTime(60, t);
        osc.frequency.exponentialRampToValueAtTime(15, t + 0.8);
        const g2 = this.ctx.createGain();
        g2.gain.setValueAtTime(0.6, t);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
        osc.connect(g2); g2.connect(this.ctx.destination);
        osc.start(t); osc.stop(t + 1.0);
    }

    _playBurst() {
        // 3-4 rapid shots
        const shots = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < shots; i++) {
            const delay = i * (0.08 + Math.random() * 0.04);
            const t = setTimeout(() => {
                if (!this.running) return;
                this._playDistantShot();
            }, delay * 1000);
            this.timers.push(t);
        }
    }

    _scheduleLoop() {
        if (!this.running) return;
        const events = [
            { weight: 50, fn: () => this._playBurst() },
            { weight: 30, fn: () => this._playDistantShot() },
            { weight: 20, fn: () => this._playExplosion() }
        ];

        const total = events.reduce((s, e) => s + e.weight, 0);
        const roll = Math.random() * total;
        let cum = 0;
        for (const event of events) {
            cum += event.weight;
            if (roll < cum) { event.fn(); break; }
        }

        const nextDelay = 1500 + Math.random() * 4000; // 1.5–5.5s between events
        const t = setTimeout(() => this._scheduleLoop(), nextDelay);
        this.timers.push(t);
    }
}

// ─── Map Builder ─────────────────────────────────────────────

export function buildWarzoneMap(scene, world, physicsMaterial) {
    const concTex = createConcreteTexture();
    const conc2Tex = createConcreteTexture('#4a3e30');
    const groundTex = createGroundTexture();
    const rubbleTex = createRubbleTexture();

    concTex.repeat.set(3, 3);
    conc2Tex.repeat.set(3, 3);

    const concMat = new THREE.MeshStandardMaterial({ map: concTex, roughness: 0.95 });
    const conc2Mat = new THREE.MeshStandardMaterial({ map: conc2Tex, roughness: 0.95 });
    const rubbleMat = new THREE.MeshStandardMaterial({ map: rubbleTex, roughness: 0.98 });

    // ── Sky / Fog ─────────────────────────────────
    scene.fog = new THREE.FogExp2(0xb89060, 0.025); // Dense war dust
    scene.background = new THREE.Color(0xb89060);

    // ── Lighting ──────────────────────────────────
    // Existing lights removed and re-done for a dark moody warzone feel
    scene.children
        .filter(c => c.isLight || c.isAmbientLight || c.isDirectionalLight)
        .forEach(l => scene.remove(l));

    const ambient = new THREE.AmbientLight(0x8a7060, 0.4);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffcc88, 0.8);
    sun.position.set(30, 40, -20);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 200;
    sun.shadow.camera.left = -80;
    sun.shadow.camera.right = 80;
    sun.shadow.camera.top = 80;
    sun.shadow.camera.bottom = -80;
    scene.add(sun);

    // Orange fire glow
    const fireGlow1 = new THREE.PointLight(0xff4400, 3, 25);
    fireGlow1.position.set(20, 3, -10);
    scene.add(fireGlow1);
    const fireGlow2 = new THREE.PointLight(0xff6600, 2.5, 20);
    fireGlow2.position.set(-25, 4, 15);
    scene.add(fireGlow2);

    // ── Ground ────────────────────────────────────
    const groundGeo = new THREE.PlaneGeometry(150, 150);
    const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.98 });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    groundMesh.name = 'env';
    scene.add(groundMesh);

    const groundBody = new CANNON.Body({ mass: 0, material: physicsMaterial });
    groundBody.addShape(new CANNON.Plane());
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(groundBody);

    // ── Helper functions ──────────────────────────
    function addBox(x, y, z, w, h, d, mat, rotation = 0) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        mesh.position.set(x, y, z);
        mesh.rotation.y = rotation;
        mesh.castShadow = true; mesh.receiveShadow = true;
        mesh.userData.isObstacle = true;
        mesh.name = 'env';
        scene.add(mesh);

        const body = new CANNON.Body({ mass: 0, material: physicsMaterial });
        const shape = new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2));
        body.addShape(shape);
        body.position.set(x, y, z);
        body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotation);
        world.addBody(body);
        return mesh;
    }

    function addRubblePile(cx, cz, radius, count = 12) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * radius;
            const x = cx + Math.cos(angle) * r;
            const z = cz + Math.sin(angle) * r;
            const w = 0.3 + Math.random() * 1.4;
            const h = 0.15 + Math.random() * 0.5;
            const d = 0.3 + Math.random() * 1.4;
            const rot = Math.random() * Math.PI;
            addBox(x, h / 2, z, w, h, d, rubbleMat, rot);
        }
    }

    function addCrackedWall(x, y, z, w, h, d, mat, rot = 0) {
        // Main wall section
        addBox(x, y, z, w, h, d, mat, rot);
        // Chunks extending out
        addBox(x + (Math.random() - 0.5) * w, 0.5, z + (Math.random() - 0.5) * d,
            0.6 + Math.random(), 1, 0.6 + Math.random(), rubbleMat, Math.random() * Math.PI);
    }

    // ── BOUNDARY ──────────────────────────────────
    addBox(0, 5, -60, 120, 10, 1, concMat);
    addBox(0, 5, 60, 120, 10, 1, concMat);
    addBox(-60, 5, 0, 1, 10, 120, concMat);
    addBox(60, 5, 0, 1, 10, 120, concMat);

    // ── BUILDINGS ─────────────────────────────────

    // Building A — Destroyed block, NW corner
    addBox(-30, 3.5, -30, 14, 7, 0.6, concMat);      // Front wall (mostly standing)
    addBox(-37, 3.5, -25, 0.6, 7, 12, concMat);      // Left wall
    addBox(-30, 6, -25, 7, 1.5, 12, conc2Mat);       // Partial ceiling/collapse
    addBox(-25, 2, -22, 5, 4, 0.6, conc2Mat);        // Broken interior wall
    addBox(-30, 0.4, -20, 12, 0.8, 10, concMat);     // Floor slab (interior)
    addRubblePile(-28, -27, 3, 18); // Rubble inside

    // Building B — SW corner, mostly just walls
    addCrackedWall(30, 3, -30, 0.6, 6, 16, concMat);   // Left wall standing
    addBox(37, 1.5, -28, 0.6, 3, 10, conc2Mat);        // Partial collapse right wall
    addBox(33, 3, -22, 12, 0.6, 0.6, conc2Mat);        // Broken lintel
    addRubblePile(32, -30, 5, 20);

    // Building C — Far left, interior ruin
    addBox(-30, 4, 20, 0.6, 8, 20, concMat);   // Side wall
    addBox(-22, 4, 30, 16, 8, 0.6, concMat);   // Back wall (intact)
    addBox(-22, 8.5, 24, 16, 0.6, 12, conc2Mat); // Collapsed roof slab
    addBox(-19, 2, 22, 6, 4, 0.6, conc2Mat);   // Rubble wall shard
    addRubblePile(-24, 22, 4, 16);

    // Building D — Urban alley pillars
    const pillarMat = concMat;
    for (let i = 0; i < 4; i++) {
        addBox(-5 + i * 5, 4, 10, 0.8, 8, 0.8, pillarMat);
    }
    addBox(5, 8, 10, 20, 0.6, 0.8, conc2Mat); // Collapsed beam between pillars
    addRubblePile(5, 10, 6, 12);

    // ── LARGE COVER OBJECTS ───────────────────────

    // Destroyed vehicle / truck hulk (rough box shape)
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x3a3a2a, metalness: 0.6, roughness: 0.7 });
    addBox(-10, 1, -5, 5, 2, 10, metalMat, 0.3); // truck body
    addBox(-10, 2.5, -3, 4, 1, 3, metalMat, 0.3); // cab top

    addBox(15, 0.8, 5, 4, 1.6, 8, metalMat, -0.2); // second wrecked car

    // Sandbag walls
    const sandbagMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.98 });
    for (let i = 0; i < 5; i++) {
        addBox(-18 + i * 1.1, 0.5, -2, 1, 1, 0.6, sandbagMat);
    }
    addBox(-18, 1.1, -2, 1, 0.6, 0.6, sandbagMat); // second row cap
    for (let i = 0; i < 4; i++) {
        addBox(25, 0.5, -8 + i * 1.1, 0.6, 1, 1, sandbagMat);
    }
    addBox(25, 1.1, -8, 0.6, 0.6, 1, sandbagMat);

    // Burned out car shells
    addBox(5, 0.7, -20, 3.5, 1.4, 7, metalMat, 0.1);
    addBox(-5, 0.7, 30, 3.5, 1.4, 7, metalMat, -0.3);

    // Low concrete barriers (jersey barriers)
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0x777066, roughness: 0.9 });
    const barrierPositions = [[0, 0], [5, 0], [-12, 8], [-12, 10], [20, -15], [22, -15], [-3, -15], [1, -15]];
    barrierPositions.forEach(([bx, bz]) => addBox(bx, 0.6, bz, 0.8, 1.2, 3, barrierMat));

    // ── SCATTERED RUBBLE ──────────────────────────
    addRubblePile(0, 0, 4, 8);
    addRubblePile(-10, -10, 3, 10);
    addRubblePile(10, 10, 3, 10);
    addRubblePile(-20, 20, 4, 12);
    addRubblePile(20, -20, 4, 12);
    addRubblePile(0, -30, 3, 8);

    // ── FIRE PARTICLES (Billboard quads) ────────────
    function createFireEffect(x, z) {
        const fireGroup = new THREE.Group();
        scene.add(fireGroup);

        const fireMat = new THREE.MeshBasicMaterial({
            color: 0xff4400,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        for (let i = 0; i < 4; i++) {
            const w = 0.8 + Math.random() * 1.2;
            const h = 1.2 + Math.random() * 1.5;
            const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), fireMat.clone());
            plane.position.set(
                x + (Math.random() - 0.5) * 1.5,
                h / 2,
                z + (Math.random() - 0.5) * 1.5
            );
            plane.userData.firePhase = Math.random() * Math.PI * 2;
            plane.userData.baseY = plane.position.y;
            fireGroup.add(plane);
        }

        // Smoke above fire
        const smokeMat = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
        for (let i = 0; i < 3; i++) {
            const smoke = new THREE.Mesh(new THREE.PlaneGeometry(2 + Math.random() * 2, 2 + Math.random() * 2), smokeMat.clone());
            smoke.position.set(x + (Math.random() - 0.5), 3.5 + i * 1.5, z + (Math.random() - 0.5));
            smoke.userData.isSmoke = true;
            smoke.userData.smokeDrift = (Math.random() - 0.5) * 0.3;
            smoke.userData.baseY = smoke.position.y;
            smoke.userData.phase = Math.random() * Math.PI * 2;
            scene.add(smoke);
        }

        return fireGroup;
    }

    const fires = [
        createFireEffect(20, -10),
        createFireEffect(-25, 15),
        createFireEffect(10, -30),
        createFireEffect(-5, 5),
    ];

    // ── BLOOD DECALS on floor ──────────────────────
    function addBloodDecal(x, z, scale = 1) {
        const canvas = document.createElement('canvas');
        canvas.width = 128; canvas.height = 128;
        const ctx = canvas.getContext('2d');

        const cx = 64, cy = 64;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 50 * scale);
        grad.addColorStop(0, 'rgba(120, 0, 0, 1)');
        grad.addColorStop(0.5, 'rgba(80, 0, 0, 0.7)');
        grad.addColorStop(1, 'rgba(40, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 40, 28, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();

        // Splatter droplets
        for (let i = 0; i < 8; i++) {
            const dx = (Math.random() - 0.5) * 90;
            const dy = (Math.random() - 0.5) * 90;
            const r = 2 + Math.random() * 8;
            ctx.fillStyle = 'rgba(90, 0, 0, 0.7)';
            ctx.beginPath();
            ctx.ellipse(cx + dx, cy + dy, r, r * 0.6, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }

        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.9 });
        const decal = new THREE.Mesh(new THREE.PlaneGeometry(scale * 2.5, scale * 1.8), mat);
        decal.rotation.x = -Math.PI / 2;
        decal.position.set(x, 0.01, z);
        decal.rotation.z = Math.random() * Math.PI;
        scene.add(decal);
    }

    // Multiple blood pools around the battlefield
    [[-5, -5], [12, 8], [-20, -5], [3, -18], [-8, 15], [25, 2], [-3, 28], [18, -28]].forEach(([bx, bz]) =>
        addBloodDecal(bx, bz, 1 + Math.random() * 1.5)
    );

    // ── DUST & DEBRIS PARTICLES ─────────────────────
    const dustGeo = new THREE.BufferGeometry();
    const dustCount = 400;
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
        dustPos[i * 3] = (Math.random() - 0.5) * 100;
        dustPos[i * 3 + 1] = Math.random() * 12;
        dustPos[i * 3 + 2] = (Math.random() - 0.5) * 100;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({ color: 0xbba070, size: 0.15, transparent: true, opacity: 0.5 });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    // ── EMBER PARTICLES ──────────────────────────────
    const emberGeo = new THREE.BufferGeometry();
    const emberCount = 150;
    const emberPos = new Float32Array(emberCount * 3);
    const emberSpeeds = new Float32Array(emberCount);
    for (let i = 0; i < emberCount; i++) {
        emberPos[i * 3] = (Math.random() - 0.5) * 80;
        emberPos[i * 3 + 1] = Math.random() * 15;
        emberPos[i * 3 + 2] = (Math.random() - 0.5) * 80;
        emberSpeeds[i] = 0.5 + Math.random() * 1.5;
    }
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
    const emberMat = new THREE.PointsMaterial({
        color: 0xff6600,
        size: 0.08,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const embers = new THREE.Points(emberGeo, emberMat);
    scene.add(embers);

    // (Removed Barbed Wire Coils)
    // ── BROKEN STREET LAMPS ──────────────────────────
    const lampPosts = [];
    const lampPostPositions = [[-15, -25], [20, 15], [-25, 25], [15, -10]];
    lampPostPositions.forEach(([lpx, lpz]) => {
        // Post
        const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.12, 5, 8),
            metalMat
        );
        post.position.set(lpx, 2.5, lpz);
        post.castShadow = true;
        post.name = 'env';
        scene.add(post);

        // Arm
        const arm = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, 1.5, 6),
            metalMat
        );
        arm.position.set(lpx + 0.5, 4.8, lpz);
        arm.rotation.z = Math.PI / 2;
        arm.name = 'env';
        scene.add(arm);

        // Flickering light (some broken, some working)
        if (Math.random() > 0.3) {
            const lamp = new THREE.PointLight(0xff9966, 1.5, 12);
            lamp.position.set(lpx + 1, 4.5, lpz);
            scene.add(lamp);
            lampPosts.push({ light: lamp, phase: Math.random() * Math.PI * 2 });
        }
    });

    // ── ANIMATE: fires + dust + embers ───────────────
    let fireT = 0;
    function animateWarzone(dt) {
        fireT += dt;
        // Flicker fires
        scene.traverse((obj) => {
            if (obj.isMesh && obj.parent?.parent === scene) {
                if (obj.material?.blending === THREE.AdditiveBlending) {
                    obj.material.opacity = 0.6 + Math.sin(fireT * 8 + (obj.userData.firePhase || 0)) * 0.3;
                    obj.position.y = (obj.userData.baseY || 1) + Math.sin(fireT * 5 + (obj.userData.firePhase || 0)) * 0.15;
                    obj.lookAt(0, obj.position.y, 0);
                }
                if (obj.userData.isSmoke) {
                    obj.material.opacity = 0.15 + Math.sin(fireT * 1.5 + (obj.userData.phase || 0)) * 0.1;
                    obj.position.y = (obj.userData.baseY || 3) + Math.sin(fireT * 0.8 + (obj.userData.phase || 0)) * 0.3;
                    obj.position.x += (obj.userData.smokeDrift || 0) * dt;
                    obj.lookAt(0, obj.position.y, 0);
                }
            }
        });

        // Drift dust particles
        const pos = dustGeo.attributes.position.array;
        for (let i = 1; i < dustCount * 3; i += 3) {
            pos[i] += dt * (0.1 + Math.random() * 0.05);
            if (pos[i] > 14) pos[i] = 0;
        }
        dustGeo.attributes.position.needsUpdate = true;

        // Float embers upward with wind sway
        const ep = emberGeo.attributes.position.array;
        for (let i = 0; i < emberCount; i++) {
            ep[i * 3 + 1] += emberSpeeds[i] * dt;
            ep[i * 3] += Math.sin(fireT * 2 + i) * 0.03;
            if (ep[i * 3 + 1] > 18) {
                ep[i * 3 + 1] = 0;
                ep[i * 3] = (Math.random() - 0.5) * 80;
                ep[i * 3 + 2] = (Math.random() - 0.5) * 80;
            }
        }
        emberGeo.attributes.position.needsUpdate = true;

        // Pulse fire glows
        fireGlow1.intensity = 2 + Math.sin(fireT * 7) * 1;
        fireGlow2.intensity = 2 + Math.cos(fireT * 5) * 1;

        // Flicker broken street lamps
        lampPosts.forEach(lp => {
            const flicker = Math.sin(fireT * 15 + lp.phase);
            lp.light.intensity = flicker > 0.7 ? 0 : (1.0 + flicker * 0.5);
        });
    }

    return { animateWarzone };
}
