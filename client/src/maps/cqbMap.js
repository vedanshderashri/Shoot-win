import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// Procedural textures for CQB
function createPlywoodTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    // Concrete base
    ctx.fillStyle = '#b0a080';
    ctx.fillRect(0, 0, 256, 256);
    // Brick pattern
    const brickH = 28, brickW = 64;
    for (let row = 0; row < 256 / brickH; row++) {
        const offset = (row % 2 === 0) ? 0 : brickW / 2;
        for (let col = -1; col < 256 / brickW + 1; col++) {
            const x = col * brickW + offset;
            const y = row * brickH;
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 2, y + 2, brickW - 4, brickH - 4);
            // Color variation per brick
            const shade = 160 + Math.floor(Math.random() * 40);
            ctx.fillStyle = `rgb(${shade},${shade - 20},${shade - 40})`;
            ctx.fillRect(x + 3, y + 3, brickW - 6, brickH - 6);
        }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

function createContainerTexture(baseColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    // Base metal paint
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 256, 256);
    // Horizontal ribs
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 3;
    for (let y = 32; y < 256; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(256, y);
        ctx.stroke();
    }
    // Rust streaks
    for (let i = 0; i < 8; i++) {
        const x = Math.random() * 256;
        ctx.fillStyle = `rgba(120, 50, 10, ${Math.random() * 0.4})`;
        ctx.fillRect(x, 0, 2 + Math.random() * 4, 256);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

function createAsphaltTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    // Main asphalt
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, 512, 512);
    // Aggregate gravel
    for (let i = 0; i < 5000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const g = 30 + Math.random() * 50;
        ctx.fillStyle = `rgb(${g},${g},${g})`;
        ctx.fillRect(x, y, 1 + Math.random(), 1 + Math.random());
    }
    // Cracks
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const sx = Math.random() * 512;
        const sy = Math.random() * 512;
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + (Math.random() - 0.5) * 100, sy + Math.random() * 80);
        ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

export function buildCQBMap(scene, world, physicsMaterial) {
    const plywoodTex = createPlywoodTexture();
    const asphaltTex = createAsphaltTexture();
    const blueTex = createContainerTexture('#1a3a5c');
    const redTex = createContainerTexture('#5c1a1a');
    const greenTex = createContainerTexture('#1a5c1a');
    asphaltTex.repeat.set(20, 20);

    // GROUND 100x100 (Tight arena)
    const groundGeo = new THREE.PlaneGeometry(100, 100);
    const groundMat = new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.9 });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    groundMesh.name = 'env';
    scene.add(groundMesh);

    const groundBody = new CANNON.Body({ mass: 0, material: physicsMaterial });
    groundBody.addShape(new CANNON.Plane());
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(groundBody);

    const wallMat = new THREE.MeshStandardMaterial({ map: plywoodTex, roughness: 0.8 });
    const containerMat = new THREE.MeshStandardMaterial({ map: blueTex, metalness: 0.5, roughness: 0.5 });
    const redContainerMat = new THREE.MeshStandardMaterial({ map: redTex, metalness: 0.5, roughness: 0.5 });
    const greenContainerMat = new THREE.MeshStandardMaterial({ map: greenTex, metalness: 0.5, roughness: 0.5 });

    function addBlock(x, y, z, w, h, d, mat = wallMat) {
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

    // BOUNDARY
    addBlock(0, 4, -50, 100, 8, 1);
    addBlock(0, 4, 50, 100, 8, 1);
    addBlock(-50, 4, 0, 1, 8, 100);
    addBlock(50, 4, 0, 1, 8, 100);

    // KILLHOUSE LAYOUT (Corridors & Rooms)
    // Left Corridor
    addBlock(-35, 2, 0, 2, 4, 40);
    addBlock(-42, 2, 0, 12, 4, 2);

    // Central Brawl Area (Containers with proper textures)
    addBlock(0, 1.25, 0, 6, 2.5, 12, containerMat);
    addBlock(8, 1.25, 5, 6, 2.5, 12, redContainerMat);
    addBlock(-8, 1.25, -5, 6, 2.5, 12, greenContainerMat);

    // Verticality: Double Stacked Containers
    addBlock(0, 3.75, 0, 6, 2.5, 12, containerMat);

    // Low Cover / Plywood Barriers
    const barriers = [
        [15, 15], [15, -15], [-15, 15], [-15, -15],
        [30, 0], [-30, 0], [0, 30], [0, -30]
    ];
    barriers.forEach(([x, z]) => {
        addBlock(x, 0.75, z, 4, 1.5, 0.2);
    });

    // Plywood Room in corner
    addBlock(40, 2, 40, 10, 4, 0.5);
    addBlock(35, 2, 45, 0.5, 4, 10);

    // Scattered Barrels
    function addBarrel(x, z) {
        const geo = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 8);
        const mat = new THREE.MeshStandardMaterial({ color: 0x444, metalness: 0.3 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, 0.6, z);
        mesh.castShadow = true;
        mesh.name = 'env';
        mesh.userData.isObstacle = true;
        scene.add(mesh);

        const body = new CANNON.Body({ mass: 0, material: physicsMaterial });
        body.addShape(new CANNON.Cylinder(0.4, 0.4, 1.2, 8));
        body.position.set(x, 0.6, z);
        world.addBody(body);
    }

    [[20, 20], [-20, -20], [10, -40], [-10, 40]].forEach(([x, z]) => addBarrel(x, z));
}
