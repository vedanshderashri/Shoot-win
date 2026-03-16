import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// Desert sand texture
function createSandTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#c2a868';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 8000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const r = Math.random() * 3 + 1;
        const b = Math.floor(Math.random() * 40) - 20;
        ctx.fillStyle = `rgb(${194 + b}, ${184 + b}, ${144 + b})`;
        ctx.fillRect(x, y, r, r);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 16;
    return tex;
}

function createConcreteTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#8a8070';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 3000; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const b = Math.floor(Math.random() * 30) - 15;
        ctx.fillStyle = `rgba(${128 + b}, ${120 + b}, ${100 + b}, 0.5)`;
        ctx.fillRect(x, y, 2, 2);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    for (let y = 64; y < 256; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y + (Math.random() - 0.5) * 4);
        ctx.lineTo(256, y + (Math.random() - 0.5) * 4);
        ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

function createWoodTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(0, 0, 128, 128);
    // Grain
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    for (let i = 0; i < 128; i += 4) {
        ctx.fillRect(i + Math.random() * 2, 0, 2, 128);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

function createMetalTexture(color) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 128, 128);
    // Scratches
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * 128, Math.random() * 128);
        ctx.lineTo(Math.random() * 128, Math.random() * 128);
        ctx.stroke();
    }
    return new THREE.CanvasTexture(canvas);
}

function createRustyTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#7a4a2a';
    ctx.fillRect(0, 0, 128, 128);
    // Splotches
    const colors = ['#8b4513', '#a0522d', '#5d2906'];
    for (let i = 0; i < 100; i++) {
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        ctx.globalAlpha = 0.3;
        ctx.fillRect(Math.random() * 128, Math.random() * 128, Math.random() * 10, Math.random() * 10);
    }
    return new THREE.CanvasTexture(canvas);
}

export function buildAdvancedMap(scene, world, physicsMaterial) {
    const sandTex = createSandTexture();
    sandTex.repeat.set(100, 100);
    const concreteTex = createConcreteTexture();
    concreteTex.repeat.set(2, 2);

    // ========== GROUND 400×400 ==========
    const groundGeo = new THREE.PlaneGeometry(400, 400);
    const groundMat = new THREE.MeshStandardMaterial({ map: sandTex, roughness: 0.95 });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    groundMesh.name = 'env';
    scene.add(groundMesh);

    const groundBody = new CANNON.Body({ mass: 0, material: physicsMaterial });
    groundBody.addShape(new CANNON.Plane());
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(groundBody);

    // ========== MATERIALS ==========
    const metalTex = createMetalTexture('#555555');
    const woodTex = createWoodTexture();
    const rustyTex = createRustyTexture();

    const concreteMat = new THREE.MeshStandardMaterial({ map: concreteTex, roughness: 0.8 });
    const darkConcreteMat = new THREE.MeshStandardMaterial({ color: 0x5a5040, roughness: 0.9 });
    const metalMat = new THREE.MeshStandardMaterial({ map: metalTex, metalness: 0.6, roughness: 0.4 });
    const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.85 });
    const sandbagMat = new THREE.MeshStandardMaterial({ color: 0xa09060, roughness: 0.95 });
    const crateMat = new THREE.MeshStandardMaterial({ map: woodTex, color: 0x6b5030, roughness: 0.9 });
    const rustyMat = new THREE.MeshStandardMaterial({ map: rustyTex, metalness: 0.4, roughness: 0.7 });

    function addBlock(x, y, z, w, h, d, material) {
        const mat = material || concreteMat;
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.isObstacle = true;
        mesh.name = 'env';
        scene.add(mesh);
        const shape = new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2));
        const body = new CANNON.Body({ mass: 0, material: physicsMaterial });
        body.addShape(shape);
        body.position.set(x, y, z);
        world.addBody(body);
    }

    function addBarrel(x, z) {
        const geo = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 12);
        const mat = new THREE.MeshStandardMaterial({ color: 0x2a4a20, metalness: 0.3, roughness: 0.8 });
        const barrel = new THREE.Mesh(geo, mat);
        barrel.position.set(x, 0.75, z);
        barrel.castShadow = true;
        barrel.receiveShadow = true;
        barrel.userData.isObstacle = true;
        barrel.name = 'env';
        scene.add(barrel);
        const shape = new CANNON.Cylinder(0.5, 0.5, 1.5, 12);
        const body = new CANNON.Body({ mass: 0, material: physicsMaterial });
        body.addShape(shape);
        body.position.set(x, 0.75, z);
        world.addBody(body);
    }

    // ========== PERIMETER WALLS (400×400) ==========
    addBlock(0, 4, -200, 400, 8, 2, darkConcreteMat);
    addBlock(0, 4, 200, 400, 8, 2, darkConcreteMat);
    addBlock(-200, 4, 0, 2, 8, 400, darkConcreteMat);
    addBlock(200, 4, 0, 2, 8, 400, darkConcreteMat);

    // ========== 4 CORNER WATCHTOWERS ==========
    function buildWatchtower(cx, cz) {
        addBlock(cx - 2, 4, cz - 2, 0.6, 8, 0.6, metalMat);
        addBlock(cx + 2, 4, cz - 2, 0.6, 8, 0.6, metalMat);
        addBlock(cx - 2, 4, cz + 2, 0.6, 8, 0.6, metalMat);
        addBlock(cx + 2, 4, cz + 2, 0.6, 8, 0.6, metalMat);
        addBlock(cx, 8, cz, 6, 0.5, 6, woodMat);
        addBlock(cx, 9, cz - 3, 6, 1.5, 0.3, metalMat);
        addBlock(cx, 9, cz + 3, 6, 1.5, 0.3, metalMat);
        addBlock(cx - 3, 9, cz, 0.3, 1.5, 6, metalMat);
        addBlock(cx + 3, 9, cz, 0.3, 1.5, 6, metalMat);
    }
    buildWatchtower(-180, -180);
    buildWatchtower(180, -180);
    buildWatchtower(-180, 180);
    buildWatchtower(180, 180);

    // ========== CENTRAL HQ COMPOUND ==========
    addBlock(0, 3, -12, 20, 6, 1);
    addBlock(0, 3, 12, 20, 6, 1);
    addBlock(-10, 3, 0, 1, 6, 24);
    addBlock(10, 3, 0, 1, 6, 24);
    addBlock(0, 6.3, 0, 22, 0.5, 26, darkConcreteMat);

    // ========== EAST BUNKER ==========
    addBlock(60, 2, -20, 12, 4, 0.8);
    addBlock(60, 2, -10, 12, 4, 0.8);
    addBlock(54, 2, -15, 0.8, 4, 10);
    addBlock(66, 2, -15, 0.8, 4, 10);
    addBlock(60, 4.2, -15, 13, 0.5, 11, darkConcreteMat);

    // ========== WEST BUNKER ==========
    addBlock(-60, 2, 10, 12, 4, 0.8);
    addBlock(-60, 2, 20, 12, 4, 0.8);
    addBlock(-54, 2, 15, 0.8, 4, 10);
    addBlock(-66, 2, 15, 0.8, 4, 10);
    addBlock(-60, 4.2, 15, 13, 0.5, 11, darkConcreteMat);

    // ========== DESTROYED VEHICLES (large cover) ==========
    // Truck hulk - north area
    addBlock(30, 1.5, -80, 8, 3, 3, rustyMat);
    addBlock(30, 3.5, -80, 4, 2, 3, rustyMat);
    // Tank hull - south area
    addBlock(-40, 1.5, 70, 10, 3, 5, rustyMat);
    addBlock(-40, 3.5, 70, 6, 2, 3, rustyMat);
    // Jeep wreck - east
    addBlock(100, 1, -60, 5, 2, 3, rustyMat);
    // APC wreck - west
    addBlock(-90, 2, -40, 8, 4, 4, rustyMat);

    // ========== COMPOUND BUILDINGS (scattered) ==========
    // North building
    addBlock(80, 3, -120, 16, 6, 1);
    addBlock(80, 3, -108, 16, 6, 1);
    addBlock(72, 3, -114, 1, 6, 12);
    addBlock(88, 3, -114, 1, 6, 12);
    addBlock(80, 6.2, -114, 18, 0.5, 14, darkConcreteMat);

    // South building
    addBlock(-70, 3, 110, 14, 6, 1);
    addBlock(-70, 3, 120, 14, 6, 1);
    addBlock(-77, 3, 115, 1, 6, 10);
    addBlock(-63, 3, 115, 1, 6, 10);
    addBlock(-70, 6.2, 115, 16, 0.5, 12, darkConcreteMat);

    // ========== SNIPER TOWERS (tall, narrow) ==========
    function buildSniperTower(cx, cz) {
        addBlock(cx, 6, cz, 0.5, 12, 0.5, metalMat); // pillar
        addBlock(cx, 12, cz, 4, 0.4, 4, woodMat);     // platform
        addBlock(cx, 13, cz - 2, 4, 1.5, 0.3, metalMat);
        addBlock(cx, 13, cz + 2, 4, 1.5, 0.3, metalMat);
        addBlock(cx - 2, 13, cz, 0.3, 1.5, 4, metalMat);
        addBlock(cx + 2, 13, cz, 0.3, 1.5, 4, metalMat);
    }
    buildSniperTower(120, 0);
    buildSniperTower(-120, 0);
    buildSniperTower(0, 120);
    buildSniperTower(0, -120);

    // ========== TRENCHES (low walls) ==========
    addBlock(40, 0.6, 40, 30, 1.2, 0.5, darkConcreteMat);
    addBlock(55, 0.6, 55, 0.5, 1.2, 30, darkConcreteMat);
    addBlock(-40, 0.6, -40, 30, 1.2, 0.5, darkConcreteMat);
    addBlock(-55, 0.6, -55, 0.5, 1.2, 30, darkConcreteMat);

    // ========== SCATTERED COVER ==========
    // Concrete barriers
    const barriers = [
        [25, 35], [-25, -35], [50, -70], [-50, 70],
        [90, 50], [-90, -50], [70, 140], [-70, -140],
        [140, 70], [-140, -70], [30, -140], [-30, 140],
        [150, -100], [-150, 100]
    ];
    barriers.forEach(([x, z]) => {
        addBlock(x, 1.5, z, 6, 3, 0.6);
    });

    // L-shaped cover walls
    addBlock(80, 1.5, 60, 8, 3, 0.6);
    addBlock(84, 1.5, 64, 0.6, 3, 8);
    addBlock(-80, 1.5, -60, 8, 3, 0.6);
    addBlock(-84, 1.5, -64, 0.6, 3, 8);

    // ========== SANDBAG PILES ==========
    const sandbags = [
        [20, 50], [-20, -50], [45, -30], [-45, 30],
        [100, -20], [-100, 20], [60, 90], [-60, -90],
        [130, -40], [-130, 40], [0, 80], [0, -80],
        [150, 50], [-150, -50]
    ];
    sandbags.forEach(([x, z]) => {
        addBlock(x, 0.5, z, 4, 1, 1.5, sandbagMat);
    });

    // ========== CRATE CLUSTERS ==========
    const crates = [
        [70, 0], [-70, 0], [0, 60], [0, -60],
        [110, 80], [-110, -80], [40, -100], [-40, 100],
        [160, 0], [-160, 0]
    ];
    crates.forEach(([x, z]) => {
        addBlock(x, 1, z, 2, 2, 2, crateMat);
        addBlock(x + 1.5, 1, z + 2, 2, 2, 2, crateMat);
        addBlock(x + 0.5, 3, z + 1, 2, 2, 2, crateMat);
    });

    // ========== BARREL CLUSTERS ==========
    const barrelPos = [
        [15, -20], [-15, 20], [50, 30], [-50, -30],
        [90, -10], [-90, 10], [30, 80], [-30, -80],
        [120, 40], [-120, -40], [0, 150], [0, -150],
        [170, -30], [-170, 30]
    ];
    barrelPos.forEach(([x, z]) => {
        addBarrel(x, z);
        addBarrel(x + 1.5, z + 1);
    });

    // ========== ENHANCED LIGHTING ==========
    // Warm sun glow
    const sunGlow = new THREE.PointLight(0xffaa44, 1.5, 100);
    sunGlow.position.set(50, 30, 50);
    scene.add(sunGlow);

    // ========== SAND PARTICLE SYSTEM ==========
    const sandGeo = new THREE.BufferGeometry();
    const sandCount = 500;
    const sandPos = new Float32Array(sandCount * 3);
    const sandSpeeds = new Float32Array(sandCount);
    for (let i = 0; i < sandCount; i++) {
        sandPos[i * 3] = (Math.random() - 0.5) * 300;
        sandPos[i * 3 + 1] = Math.random() * 6;
        sandPos[i * 3 + 2] = (Math.random() - 0.5) * 300;
        sandSpeeds[i] = 2 + Math.random() * 4;
    }
    sandGeo.setAttribute('position', new THREE.BufferAttribute(sandPos, 3));
    const sandPartMat = new THREE.PointsMaterial({
        color: 0xc8a868,
        size: 0.1,
        transparent: true,
        opacity: 0.4,
        depthWrite: false
    });
    const sandParticles = new THREE.Points(sandGeo, sandPartMat);
    scene.add(sandParticles);

    // ========== HEAT SHIMMER ==========
    const shimmerPlanes = [];
    for (let i = 0; i < 4; i++) {
        const sGeo = new THREE.PlaneGeometry(60 + Math.random() * 40, 3 + Math.random() * 2);
        const sMat = new THREE.MeshBasicMaterial({
            color: 0xffeedd,
            transparent: true,
            opacity: 0.03,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const shimmer = new THREE.Mesh(sGeo, sMat);
        shimmer.position.set(
            (Math.random() - 0.5) * 200,
            0.3 + Math.random() * 0.5,
            (Math.random() - 0.5) * 200
        );
        shimmer.rotation.x = -Math.PI / 2;
        shimmer.userData.shimmerPhase = Math.random() * Math.PI * 2;
        scene.add(shimmer);
        shimmerPlanes.push(shimmer);
    }

    // ========== DEAD TREES ==========
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.95 });
    const treePositions = [[-80, -80], [80, 80], [-100, 50], [100, -50], [0, -130], [0, 130]];
    treePositions.forEach(([tx, tz]) => {
        // Trunk
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.3, 4, 6), treeMat);
        trunk.position.set(tx, 2, tz);
        trunk.rotation.z = (Math.random() - 0.5) * 0.2;
        trunk.castShadow = true;
        trunk.name = 'env';
        scene.add(trunk);
        // Branches
        for (let b = 0; b < 3; b++) {
            const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.08, 1.5 + Math.random(), 4), treeMat);
            branch.position.set(tx + (Math.random() - 0.5) * 0.5, 2.5 + b * 0.8, tz + (Math.random() - 0.5) * 0.5);
            branch.rotation.z = (Math.random() - 0.5) * 1.2;
            branch.rotation.x = (Math.random() - 0.5) * 0.5;
            branch.name = 'env';
            scene.add(branch);
        }
    });

    // ========== ANIMATE ==========
    let desertT = 0;
    function animateDesert(dt) {
        desertT += dt;

        // Wind-blown sand
        const sp = sandGeo.attributes.position.array;
        for (let i = 0; i < sandCount; i++) {
            sp[i * 3] += sandSpeeds[i] * dt; // wind direction
            sp[i * 3 + 1] += Math.sin(desertT * 2 + i) * 0.02; // slight bobbing
            if (sp[i * 3] > 150) {
                sp[i * 3] = -150;
                sp[i * 3 + 2] = (Math.random() - 0.5) * 300;
                sp[i * 3 + 1] = Math.random() * 6;
            }
        }
        sandGeo.attributes.position.needsUpdate = true;

        // Heat shimmer wobble
        shimmerPlanes.forEach(s => {
            const phase = s.userData.shimmerPhase || 0;
            s.material.opacity = 0.02 + Math.sin(desertT * 3 + phase) * 0.015;
            s.scale.x = 1 + Math.sin(desertT * 2 + phase) * 0.1;
        });

        // Sun glow pulse
        sunGlow.intensity = 1.2 + Math.sin(desertT * 0.5) * 0.3;
    }

    return { animateDesert };
}
