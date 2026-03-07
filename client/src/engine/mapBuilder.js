import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// Create a procedural grid texture typical of "dev blockout" levels
function createGridTexture(color = '#ffffff', lines = '#cccccc') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 512, 512);

    ctx.lineWidth = 4;
    ctx.strokeStyle = lines;

    // Grid
    ctx.beginPath();
    for (let i = 0; i <= 512; i += 64) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 512);
        ctx.moveTo(0, i);
        ctx.lineTo(512, i);
    }
    ctx.stroke();

    // Border
    ctx.lineWidth = 8;
    ctx.strokeRect(0, 0, 512, 512);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 16;
    return tex;
}

export function buildAdvancedMap(scene, world, physicsMaterial) {
    const groundTex = createGridTexture('#3a3a3a', '#222222');
    groundTex.repeat.set(50, 50);

    const wallTex = createGridTexture('#808080', '#606060');
    wallTex.repeat.set(1, 1);

    const highlightTex = createGridTexture('#ff8c00', '#cc5500'); // Orange accent blocks

    // Ground Visuals
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.9, metalness: 0.1 });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Ground Physics
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0, material: physicsMaterial });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(groundBody);

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const basicWallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.7 });
    const accentWallMat = new THREE.MeshStandardMaterial({ map: highlightTex, roughness: 0.7 });

    function addBlock(x, y, z, width, height, depth, useAccent = false) {
        const mat = useAccent ? accentWallMat : basicWallMat;

        // Clone math to fix repeats by cloning material per block type
        const blockMat = mat.clone();
        if (blockMat.map) {
            blockMat.map = blockMat.map.clone();
            blockMat.map.repeat.set(width / 2, height / 2);
            blockMat.map.needsUpdate = true;
        }

        const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), blockMat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.isObstacle = true;
        scene.add(mesh);

        const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
        const body = new CANNON.Body({ mass: 0, material: physicsMaterial });
        body.addShape(shape);
        body.position.set(x, y, z);
        world.addBody(body);
    }

    // Build Arena Walls
    addBlock(0, 5, -50, 100, 10, 2); // North
    addBlock(0, 5, 50, 100, 10, 2);  // South
    addBlock(-50, 5, 0, 2, 10, 100); // West
    addBlock(50, 5, 0, 2, 10, 100);  // East

    // Random Cover/Structures inside the arena (using deterministic seeding for multiplayer sync if needed, or just arbitrary math)
    const seed = 12345;
    let s = seed;
    const random = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };

    for (let i = 0; i < 40; i++) {
        const x = (random() - 0.5) * 80;
        const z = (random() - 0.5) * 80;

        // Don't spawn in extreme center to leave an open battleground
        if (Math.abs(x) < 10 && Math.abs(z) < 10) continue;

        const w = random() * 6 + 2;
        const h = random() * 4 + 2;
        const d = random() * 6 + 2;

        // 20% chance to be an accent block
        const isAccent = random() > 0.8;

        addBlock(x, h / 2, z, w, h, d, isAccent);
    }
}
