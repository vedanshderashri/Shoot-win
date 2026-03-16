import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// ============================================================
//  ARCTIC OUTPOST MAP — Frozen Military Base
// ============================================================

// ─── Procedural Textures ────────────────────────────────────

function createSnowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    // Base snow white
    ctx.fillStyle = '#e8eef0';
    ctx.fillRect(0, 0, 512, 512);
    // Snow grain noise
    for (let i = 0; i < 15000; i++) {
        const x = Math.random() * 512, y = Math.random() * 512;
        const g = 200 + Math.random() * 55;
        ctx.fillStyle = `rgba(${g},${g},${g + 5},0.25)`;
        ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    // Footprint-like depressions
    for (let i = 0; i < 8; i++) {
        const fx = Math.random() * 512, fy = Math.random() * 512;
        ctx.fillStyle = 'rgba(180,195,210,0.3)';
        ctx.beginPath();
        ctx.ellipse(fx, fy, 8 + Math.random() * 12, 4 + Math.random() * 6, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(16, 16);
    return tex;
}

function createIceTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    // Translucent blue-white
    const grad = ctx.createLinearGradient(0, 0, 256, 256);
    grad.addColorStop(0, '#b8d8e8');
    grad.addColorStop(0.5, '#d0e8f0');
    grad.addColorStop(1, '#a0c8d8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    // Cracks in ice
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        let cx = Math.random() * 256, cy = Math.random() * 256;
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

function createFrozenConcreteTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#6a707a';
    ctx.fillRect(0, 0, 256, 256);
    // Frost overlay
    for (let i = 0; i < 5000; i++) {
        const x = Math.random() * 256, y = Math.random() * 256;
        const b = 150 + Math.random() * 100;
        ctx.fillStyle = `rgba(${b},${b + 10},${b + 20},0.15)`;
        ctx.fillRect(x, y, 1 + Math.random(), 1 + Math.random());
    }
    // Frost edges
    for (let i = 0; i < 6; i++) {
        const x = Math.random() * 256, y = Math.random() * 256;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 20 + Math.random() * 30);
        grad.addColorStop(0, 'rgba(200,220,240,0.3)');
        grad.addColorStop(1, 'rgba(200,220,240,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x - 30, y - 30, 60, 60);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

function createMetalTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#4a5560';
    ctx.fillRect(0, 0, 128, 128);
    // Scratches
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 15; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * 128, Math.random() * 128);
        ctx.lineTo(Math.random() * 128, Math.random() * 128);
        ctx.stroke();
    }
    // Frost patina
    for (let i = 0; i < 3; i++) {
        const x = Math.random() * 128, y = Math.random() * 128;
        ctx.fillStyle = 'rgba(180,210,230,0.15)';
        ctx.beginPath();
        ctx.arc(x, y, 10 + Math.random() * 15, 0, Math.PI * 2);
        ctx.fill();
    }
    return new THREE.CanvasTexture(canvas);
}

// ─── Map Builder ─────────────────────────────────────────────

export function buildArcticMap(scene, world, physicsMaterial) {
    const snowTex = createSnowTexture();
    const iceTex = createIceTexture();
    const concTex = createFrozenConcreteTexture();
    const metalTex = createMetalTexture();

    concTex.repeat.set(2, 2);

    const concMat = new THREE.MeshStandardMaterial({ map: concTex, roughness: 0.85 });
    const darkConcMat = new THREE.MeshStandardMaterial({ color: 0x4a5055, roughness: 0.9 });
    const metalMat = new THREE.MeshStandardMaterial({ map: metalTex, metalness: 0.7, roughness: 0.4 });
    const iceMat = new THREE.MeshStandardMaterial({ map: iceTex, metalness: 0.3, roughness: 0.1, transparent: true, opacity: 0.85 });

    // ── Sky / Fog ─────────────────────────────────
    scene.fog = new THREE.FogExp2(0x8090a8, 0.012); // Cold fog
    scene.background = new THREE.Color(0x1a2530); // Dark arctic night sky

    // ── Lighting ──────────────────────────────────
    scene.children
        .filter(c => c.isLight || c.isAmbientLight || c.isDirectionalLight)
        .forEach(l => scene.remove(l));

    const ambient = new THREE.AmbientLight(0x6080a0, 0.4);
    scene.add(ambient);

    // Cold moonlight
    const moon = new THREE.DirectionalLight(0xaaccee, 0.6);
    moon.position.set(-30, 50, 20);
    moon.castShadow = true;
    moon.shadow.mapSize.width = 2048;
    moon.shadow.mapSize.height = 2048;
    moon.shadow.camera.near = 1;
    moon.shadow.camera.far = 200;
    moon.shadow.camera.left = -100;
    moon.shadow.camera.right = 100;
    moon.shadow.camera.top = 100;
    moon.shadow.camera.bottom = -100;
    scene.add(moon);

    // Emergency red lights
    const redLight1 = new THREE.PointLight(0xff2200, 2, 20);
    redLight1.position.set(15, 3, -15);
    scene.add(redLight1);
    const redLight2 = new THREE.PointLight(0xff2200, 2, 20);
    redLight2.position.set(-20, 3, 10);
    scene.add(redLight2);

    // Cool blue accent lights
    const blueLight1 = new THREE.PointLight(0x4488ff, 1.5, 25);
    blueLight1.position.set(0, 5, 0);
    scene.add(blueLight1);

    // ── Ground ────────────────────────────────────
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({ map: snowTex, roughness: 0.95 });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    groundMesh.name = 'env';
    scene.add(groundMesh);

    const groundBody = new CANNON.Body({ mass: 0, material: physicsMaterial });
    groundBody.addShape(new CANNON.Plane());
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(groundBody);

    // ── Helper ────────────────────────────────────
    function addBox(x, y, z, w, h, d, mat, rotation = 0) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        mesh.position.set(x, y, z);
        mesh.rotation.y = rotation;
        mesh.castShadow = true; mesh.receiveShadow = true;
        mesh.userData.isObstacle = true;
        mesh.name = 'env';
        scene.add(mesh);

        const body = new CANNON.Body({ mass: 0, material: physicsMaterial });
        body.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)));
        body.position.set(x, y, z);
        body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotation);
        world.addBody(body);
        return mesh;
    }

    // ── BOUNDARY ──────────────────────────────────
    addBox(0, 5, -80, 160, 10, 1, darkConcMat);
    addBox(0, 5, 80, 160, 10, 1, darkConcMat);
    addBox(-80, 5, 0, 1, 10, 160, darkConcMat);
    addBox(80, 5, 0, 1, 10, 160, darkConcMat);

    // ── MAIN RESEARCH STATION (center) ─────────────
    // Four walls with entrance gaps
    addBox(0, 3.5, -15, 20, 7, 0.6, concMat);       // Front wall
    addBox(0, 3.5, 15, 20, 7, 0.6, concMat);         // Back wall
    addBox(-10, 3.5, 0, 0.6, 7, 30, concMat);        // Left wall
    addBox(10, 3.5, 0, 0.6, 7, 30, concMat);         // Right wall
    addBox(0, 7, 0, 21, 0.6, 31, darkConcMat);       // Roof slab

    // Interior divider wall
    addBox(0, 2, 0, 8, 4, 0.4, concMat);

    // ── RADAR DOME (NE corner) ─────────────────────
    const domeGeo = new THREE.SphereGeometry(6, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({ color: 0xc0c8d0, metalness: 0.5, roughness: 0.3 });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.set(40, 0, -40);
    dome.receiveShadow = true; dome.castShadow = true;
    dome.name = 'env';
    scene.add(dome);
    // Dome platform
    addBox(40, 0.2, -40, 14, 0.4, 14, darkConcMat);

    // ── FUEL DEPOT (SW) ──────────────────────────────
    // Fuel tanks (cylinders)
    for (let i = 0; i < 3; i++) {
        const tankGeo = new THREE.CylinderGeometry(1.5, 1.5, 6, 16);
        const tankMat = new THREE.MeshStandardMaterial({ color: 0x556655, metalness: 0.5, roughness: 0.6 });
        const tank = new THREE.Mesh(tankGeo, tankMat);
        tank.position.set(-35 + i * 5, 3, 35);
        tank.castShadow = true; tank.receiveShadow = true;
        tank.userData.isObstacle = true;
        tank.name = 'env';
        scene.add(tank);

        const body = new CANNON.Body({ mass: 0, material: physicsMaterial });
        body.addShape(new CANNON.Cylinder(1.5, 1.5, 6, 16));
        body.position.set(-35 + i * 5, 3, 35);
        world.addBody(body);
    }
    // Fuel depot walls
    addBox(-35, 2, 30, 20, 4, 0.5, metalMat);
    addBox(-45, 2, 35, 0.5, 4, 12, metalMat);

    // ── WATCHTOWERS (corners) ──────────────────────
    function buildTower(cx, cz) {
        addBox(cx - 1.5, 4, cz - 1.5, 0.4, 8, 0.4, metalMat);
        addBox(cx + 1.5, 4, cz - 1.5, 0.4, 8, 0.4, metalMat);
        addBox(cx - 1.5, 4, cz + 1.5, 0.4, 8, 0.4, metalMat);
        addBox(cx + 1.5, 4, cz + 1.5, 0.4, 8, 0.4, metalMat);
        addBox(cx, 8, cz, 5, 0.4, 5, metalMat);        // Platform
        // Railings
        addBox(cx, 9, cz - 2.5, 5, 1.2, 0.2, metalMat);
        addBox(cx, 9, cz + 2.5, 5, 1.2, 0.2, metalMat);
        addBox(cx - 2.5, 9, cz, 0.2, 1.2, 5, metalMat);
        addBox(cx + 2.5, 9, cz, 0.2, 1.2, 5, metalMat);
    }
    buildTower(-60, -60);
    buildTower(60, -60);
    buildTower(-60, 60);
    buildTower(60, 60);

    // ── BUNKERS (east and west) ──────────────────────
    // East bunker
    addBox(50, 2, -10, 12, 4, 0.6, concMat);
    addBox(50, 2, 0, 12, 4, 0.6, concMat);
    addBox(44, 2, -5, 0.6, 4, 10, concMat);
    addBox(56, 2, -5, 0.6, 4, 10, concMat);
    addBox(50, 4.2, -5, 13, 0.5, 11, darkConcMat);

    // West bunker
    addBox(-50, 2, 10, 12, 4, 0.6, concMat);
    addBox(-50, 2, 0, 12, 4, 0.6, concMat);
    addBox(-44, 2, 5, 0.6, 4, 10, concMat);
    addBox(-56, 2, 5, 0.6, 4, 10, concMat);
    addBox(-50, 4.2, 5, 13, 0.5, 11, darkConcMat);

    // ── SCATTERED COVER ──────────────────────────────
    // Snow-covered crates
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x5a6840, roughness: 0.9 });
    const cratePositions = [
        [20, 25], [-20, -25], [30, -10], [-30, 10],
        [15, -40], [-15, 40], [45, 20], [-45, -20]
    ];
    cratePositions.forEach(([cx, cz]) => {
        addBox(cx, 1, cz, 2, 2, 2, crateMat);
        addBox(cx + 1.5, 1, cz + 1.5, 2, 2, 2, crateMat);
        // Snow cap on top
        const snowCap = new THREE.Mesh(
            new THREE.BoxGeometry(2.4, 0.15, 2.4),
            new THREE.MeshStandardMaterial({ color: 0xdde5ea, roughness: 0.95 })
        );
        snowCap.position.set(cx, 2.08, cz);
        snowCap.name = 'env';
        scene.add(snowCap);
    });

    // Concrete barriers
    const barrierPositions = [
        [0, 30], [0, -30], [25, 0], [-25, 0],
        [35, 35], [-35, -35], [35, -35], [-35, 35]
    ];
    barrierPositions.forEach(([bx, bz]) => addBox(bx, 0.7, bz, 0.6, 1.4, 3.5, concMat));

    // Sandbag walls
    const sandbagMat = new THREE.MeshStandardMaterial({ color: 0x7a7565, roughness: 0.98 });
    [[15, 15], [-15, -15], [30, -30], [-30, 30]].forEach(([sx, sz]) => {
        for (let i = 0; i < 4; i++) {
            addBox(sx + i * 1.1, 0.5, sz, 1, 1, 0.6, sandbagMat);
        }
    });

    // ── ICE PATCHES ──────────────────────────────────
    const icePositions = [[5, -25], [-15, 20], [30, 10], [-10, -40], [20, 45]];
    icePositions.forEach(([ix, iz]) => {
        const iceGeo = new THREE.PlaneGeometry(6 + Math.random() * 4, 6 + Math.random() * 4);
        const icePatch = new THREE.Mesh(iceGeo, iceMat.clone());
        icePatch.rotation.x = -Math.PI / 2;
        icePatch.position.set(ix, 0.02, iz);
        icePatch.rotation.z = Math.random() * Math.PI;
        icePatch.name = 'env';
        scene.add(icePatch);
    });

    // ── SNOW PARTICLES ───────────────────────────────
    const snowGeo = new THREE.BufferGeometry();
    const snowCount = 800;
    const snowPositions = new Float32Array(snowCount * 3);
    const snowVelocities = new Float32Array(snowCount);
    for (let i = 0; i < snowCount; i++) {
        snowPositions[i * 3] = (Math.random() - 0.5) * 160;
        snowPositions[i * 3 + 1] = Math.random() * 30;
        snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 160;
        snowVelocities[i] = 0.5 + Math.random() * 1.5;
    }
    snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
    const snowMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.12,
        transparent: true,
        opacity: 0.7,
        depthWrite: false
    });
    const snowParticles = new THREE.Points(snowGeo, snowMat);
    scene.add(snowParticles);

    // ── AURORA BOREALIS ──────────────────────────────
    const auroraGroup = new THREE.Group();
    scene.add(auroraGroup);

    for (let i = 0; i < 5; i++) {
        const aGeo = new THREE.PlaneGeometry(60 + Math.random() * 40, 8 + Math.random() * 6);
        const aMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL(0.3 + i * 0.06, 0.8, 0.5),
            transparent: true,
            opacity: 0.08 + Math.random() * 0.06,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const aurora = new THREE.Mesh(aGeo, aMat);
        aurora.position.set(
            (Math.random() - 0.5) * 80,
            25 + Math.random() * 10,
            -50 + Math.random() * 30
        );
        aurora.rotation.z = (Math.random() - 0.5) * 0.3;
        aurora.userData.auroraPhase = Math.random() * Math.PI * 2;
        aurora.userData.baseY = aurora.position.y;
        auroraGroup.add(aurora);
    }

    // ── WIND FOG WISPS ───────────────────────────────
    const fogWisps = [];
    for (let i = 0; i < 8; i++) {
        const fGeo = new THREE.PlaneGeometry(15 + Math.random() * 20, 2 + Math.random() * 3);
        const fMat = new THREE.MeshBasicMaterial({
            color: 0xccddee,
            transparent: true,
            opacity: 0.06 + Math.random() * 0.05,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const wisp = new THREE.Mesh(fGeo, fMat);
        wisp.position.set(
            (Math.random() - 0.5) * 120,
            0.5 + Math.random() * 2,
            (Math.random() - 0.5) * 120
        );
        wisp.userData.windSpeed = 1.5 + Math.random() * 2;
        wisp.userData.startX = wisp.position.x;
        scene.add(wisp);
        fogWisps.push(wisp);
    }

    // ── ANIMATE ──────────────────────────────────────
    let arcticT = 0;
    function animateArctic(dt) {
        arcticT += dt;

        // Snow falling
        const pos = snowGeo.attributes.position.array;
        for (let i = 0; i < snowCount; i++) {
            pos[i * 3 + 1] -= snowVelocities[i] * dt; // fall
            pos[i * 3] += Math.sin(arcticT * 0.5 + i) * 0.02; // wind sway
            if (pos[i * 3 + 1] < 0) {
                pos[i * 3 + 1] = 25 + Math.random() * 5;
                pos[i * 3] = (Math.random() - 0.5) * 160;
                pos[i * 3 + 2] = (Math.random() - 0.5) * 160;
            }
        }
        snowGeo.attributes.position.needsUpdate = true;

        // Aurora undulation
        auroraGroup.children.forEach((a) => {
            const phase = a.userData.auroraPhase || 0;
            a.position.y = (a.userData.baseY || 30) + Math.sin(arcticT * 0.3 + phase) * 1.5;
            a.material.opacity = 0.06 + Math.sin(arcticT * 0.5 + phase) * 0.04;
            a.rotation.z = Math.sin(arcticT * 0.15 + phase) * 0.1;
        });

        // Pulse red emergency lights
        redLight1.intensity = 1.5 + Math.sin(arcticT * 4) * 1;
        redLight2.intensity = 1.5 + Math.cos(arcticT * 3.5) * 1;

        // Blue accent pulse
        blueLight1.intensity = 1.2 + Math.sin(arcticT * 2) * 0.5;

        // Wind fog wisps drift
        fogWisps.forEach(w => {
            w.position.x += w.userData.windSpeed * dt;
            w.material.opacity = 0.04 + Math.sin(arcticT + w.position.z) * 0.03;
            if (w.position.x > 80) {
                w.position.x = -80;
                w.position.z = (Math.random() - 0.5) * 120;
            }
        });
    }

    return { animateArctic };
}
