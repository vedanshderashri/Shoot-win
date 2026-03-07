import * as THREE from 'three';

export default class Soldier {
    constructor(scene) {
        this.group = new THREE.Group();
        this.scene = scene;
        this.scene.add(this.group);

        // ─── Materials ──────────────────────────────────────────
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xc8a882, roughness: 0.85 });
        const camoMat = new THREE.MeshStandardMaterial({ color: 0x3b4a2e, roughness: 0.95 }); // Olive camo jacket
        const camoDark = new THREE.MeshStandardMaterial({ color: 0x2b3520, roughness: 0.95 }); // Shadow patches
        const pantsMat = new THREE.MeshStandardMaterial({ color: 0x4a4030, roughness: 0.95 }); // Field trousers
        const vestMat = new THREE.MeshStandardMaterial({ color: 0x2a2e1e, roughness: 0.90 }); // Plate carrier
        const pouchMat = new THREE.MeshStandardMaterial({ color: 0x1e2218, roughness: 0.95 }); // Mag pouches
        const helmetMat = new THREE.MeshStandardMaterial({ color: 0x2f3a20, roughness: 0.85 }); // ACH helmet
        const helmetWebMat = new THREE.MeshStandardMaterial({ color: 0x3d4d28, roughness: 0.98 }); // Helmet cover
        const goggleMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5, metalness: 0.3 });
        const goggleLens = new THREE.MeshStandardMaterial({ color: 0x334433, roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.8 });
        const gunMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.6 });
        const gunStockMat = new THREE.MeshStandardMaterial({ color: 0x2a2216, roughness: 0.9 });
        const bootMat = new THREE.MeshStandardMaterial({ color: 0x1a1510, roughness: 0.85 });
        const gloveMat = new THREE.MeshStandardMaterial({ color: 0x1e2214, roughness: 0.9 });
        const kneeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a14, roughness: 0.9 });

        const createLimb = (w, h, d, mat, pivotY) => {
            const pivot = new THREE.Group();
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
            mesh.position.y = pivotY;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            pivot.add(mesh);
            return { pivot, mesh };
        };

        // meshGroup sits -2.0 below group so feet land on world Y=0 when server Y=2
        this.meshGroup = new THREE.Group();
        this.meshGroup.position.y = -2.0;
        this.group.add(this.meshGroup);

        // ─── TORSO ────────────────────────────────────────────────
        this.torsoGroup = new THREE.Group();
        this.torsoGroup.position.y = 1.0;
        this.meshGroup.add(this.torsoGroup);

        // Main torso box (jacket)
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.62, 0.26), camoMat);
        torso.position.y = 0.31;
        torso.castShadow = true;
        this.torsoGroup.add(torso);
        this.torso = torso;

        // Plate carrier vest (front + back)
        const plateCarrier = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.50, 0.30), vestMat);
        plateCarrier.position.set(0, 0.3, 0);
        torso.add(plateCarrier);

        // Mag pouches on chest (3 pouches)
        for (let i = -1; i <= 1; i++) {
            const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.12, 0.08), pouchMat);
            pouch.position.set(i * 0.14, -0.08, 0.17);
            plateCarrier.add(pouch);
        }

        // Radio/pouch on left side
        const sidePouch = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.07), pouchMat);
        sidePouch.position.set(-0.27, 0.05, 0);
        torso.add(sidePouch);

        // Belt (bottom of torso)
        const belt = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.06, 0.28), new THREE.MeshStandardMaterial({ color: 0x111108, roughness: 0.9 }));
        belt.position.set(0, -0.02, 0);
        torso.add(belt);

        // ─── HEAD & HELMET ─────────────────────────────────────────
        this.headPivot = new THREE.Group();
        this.headPivot.position.set(0, 0.62, 0);
        this.torsoGroup.add(this.headPivot);

        // Neck
        const neck = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.13), skinMat);
        neck.position.y = 0.04;
        this.headPivot.add(neck);

        // Head (face)
        this.head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.24), skinMat);
        this.head.position.y = 0.20;
        this.head.castShadow = true;
        this.headPivot.add(this.head);

        // Balaclava / lower face cover
        const balaclava = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.10, 0.26), camoDark);
        balaclava.position.set(0, -0.07, 0);
        this.head.add(balaclava);

        // ACH Helmet main body
        const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.20, 0.34), helmetMat);
        helmet.position.set(0, 0.14, 0.01);
        this.head.add(helmet);

        // Helmet brim front
        const helmetBrim = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.06), helmetWebMat);
        helmetBrim.position.set(0, 0.06, 0.19);
        this.head.add(helmetBrim);

        // NVG mount stub
        const nvgMount = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.04), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.5 }));
        nvgMount.position.set(0, 0.16, 0.18);
        this.head.add(nvgMount);

        // Goggles (pushed up on helmet)
        const gogFrame = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.04), goggleMat);
        gogFrame.position.set(0, 0.08, 0.16);
        this.head.add(gogFrame);
        const gogLeft = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.05, 0.02), goggleLens);
        gogLeft.position.set(-0.06, 0, 0.01);
        gogFrame.add(gogLeft);
        const gogRight = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.05, 0.02), goggleLens);
        gogRight.position.set(0.06, 0, 0.01);
        gogFrame.add(gogRight);

        // ─── ARMS ──────────────────────────────────────────────────
        const armW = 0.14, armH = 0.52, armD = 0.14;
        const forearmH = 0.36;

        // Left arm (upper)
        const leftArmData = createLimb(armW, armH, armD, camoMat, -armH / 2);
        this.leftShoulder = leftArmData.pivot;
        this.leftShoulder.position.set(-0.34, 0.51, 0);
        this.torsoGroup.add(this.leftShoulder);

        // Left forearm
        const leftForearm = new THREE.Mesh(new THREE.BoxGeometry(armW - 0.02, forearmH, armD - 0.02), camoMat);
        leftForearm.position.set(0, -armH / 2 - forearmH / 2, 0);
        leftArmData.mesh.add(leftForearm);

        // Left glove
        const lGlove = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), gloveMat);
        lGlove.position.set(0, -forearmH / 2 - 0.06, 0);
        leftForearm.add(lGlove);

        // Right arm (upper)
        const rightArmData = createLimb(armW, armH, armD, camoMat, -armH / 2);
        this.rightShoulder = rightArmData.pivot;
        this.rightShoulder.position.set(0.34, 0.51, 0);
        this.torsoGroup.add(this.rightShoulder);

        // Right forearm
        const rightForearm = new THREE.Mesh(new THREE.BoxGeometry(armW - 0.02, forearmH, armD - 0.02), camoMat);
        rightForearm.position.set(0, -armH / 2 - forearmH / 2, 0);
        rightArmData.mesh.add(rightForearm);

        // Right glove
        const rGlove = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), gloveMat);
        rGlove.position.set(0, -forearmH / 2 - 0.06, 0);
        rightForearm.add(rGlove);

        // ─── LEGS ───────────────────────────────────────────────────
        const legW = 0.20, legH = 0.55, legD = 0.20;
        const calfH = 0.38;

        const leftLegData = createLimb(legW, legH, legD, pantsMat, -legH / 2);
        this.leftHip = leftLegData.pivot;
        this.leftHip.position.set(-0.12, 1.0, 0);
        this.meshGroup.add(this.leftHip);

        // Left calf
        const leftCalf = new THREE.Mesh(new THREE.BoxGeometry(legW - 0.02, calfH, legD - 0.02), pantsMat);
        leftCalf.position.set(0, -legH / 2 - calfH / 2, 0);
        leftLegData.mesh.add(leftCalf);

        // Left kneeguard
        const lKnee = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.10, 0.14), kneeMat);
        lKnee.position.set(0, -0.05, 0.07);
        leftCalf.add(lKnee);

        // Left boot
        const lBoot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.30), bootMat);
        lBoot.position.set(0, -calfH / 2 - 0.09, 0.04);
        leftCalf.add(lBoot);
        // Boot sole
        const lSole = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.32), new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.99 }));
        lSole.position.set(0, -0.11, 0);
        lBoot.add(lSole);

        const rightLegData = createLimb(legW, legH, legD, pantsMat, -legH / 2);
        this.rightHip = rightLegData.pivot;
        this.rightHip.position.set(0.12, 1.0, 0);
        this.meshGroup.add(this.rightHip);

        const rightCalf = new THREE.Mesh(new THREE.BoxGeometry(legW - 0.02, calfH, legD - 0.02), pantsMat);
        rightCalf.position.set(0, -legH / 2 - calfH / 2, 0);
        rightLegData.mesh.add(rightCalf);

        const rKnee = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.10, 0.14), kneeMat);
        rKnee.position.set(0, -0.05, 0.07);
        rightCalf.add(rKnee);

        const rBoot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.30), bootMat);
        rBoot.position.set(0, -calfH / 2 - 0.09, 0.04);
        rightCalf.add(rBoot);
        const rSole = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.32), new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.99 }));
        rSole.position.set(0, -0.11, 0);
        rBoot.add(rSole);

        // ─── ASSAULT RIFLE (M4 silhouette) ─────────────────────────
        this.weaponGroup = new THREE.Group();
        // Offset from shoulder pivot center to hand position
        const totalArmLen = armH + forearmH;
        this.weaponGroup.position.set(0.09, -totalArmLen / 2 - 0.08, 0.14);
        this.rightShoulder.add(this.weaponGroup);

        // Receiver body
        const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.10, 0.44), gunMat);
        receiver.position.z = 0;
        this.weaponGroup.add(receiver);

        // Barrel
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.32), gunMat);
        barrel.position.set(0, 0.015, 0.38);
        receiver.add(barrel);

        // Handguard
        const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.26), new THREE.MeshStandardMaterial({ color: 0x252525, metalness: 0.4 }));
        handguard.position.set(0, 0, 0.20);
        receiver.add(handguard);

        // Suppressor
        const suppressor = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.16), gunMat);
        suppressor.position.set(0, 0, 0.54);
        receiver.add(suppressor);

        // Stock
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.20), gunStockMat);
        stock.position.set(0, 0.01, -0.32);
        receiver.add(stock);

        // Magazine
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.08), gunMat);
        mag.position.set(0, -0.14, 0.02);
        receiver.add(mag);

        // Optic sight
        const optic = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.06, 0.10), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.7 }));
        optic.position.set(0, 0.08, 0.05);
        receiver.add(optic);
        const opticLens = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.04, 0.02), goggleLens);
        opticLens.position.set(0, 0, 0.06);
        optic.add(opticLens);

        // Idle weapon-holding pose
        this.rightShoulder.rotation.x = -Math.PI / 3.5;
        this.rightShoulder.rotation.z = Math.PI / 10;
        this.leftShoulder.rotation.x = -Math.PI / 5;
        this.leftShoulder.rotation.z = -Math.PI / 8;

        this.group.traverse((child) => {
            if (child.isMesh) child.userData.isPlayer = true;
        });

        this.walkCycle = 0;
        this.idleTime = 0;
    }

    animate(isMoving, dt) {
        if (isMoving) {
            this.walkCycle += dt * 9;
            this.idleTime = 0;

            const legAngle = Math.sin(this.walkCycle) * 0.65;
            this.leftHip.rotation.x = legAngle;
            this.rightHip.rotation.x = -legAngle;

            const armAngle = Math.cos(this.walkCycle) * 0.18;
            this.rightShoulder.rotation.x = -Math.PI / 3.5 + armAngle;
            this.leftShoulder.rotation.x = -Math.PI / 5 - armAngle;

            this.torsoGroup.position.y = 1.0 + Math.abs(Math.sin(this.walkCycle * 2)) * 0.045;
            this.torsoGroup.rotation.y = Math.sin(this.walkCycle) * 0.08;
        } else {
            this.idleTime += dt;
            const breath = Math.sin(this.idleTime * 1.8);
            this.torsoGroup.position.y = 1.0 + breath * 0.018;
            this.torsoGroup.rotation.y = THREE.MathUtils.lerp(this.torsoGroup.rotation.y, 0, dt * 5);

            this.leftHip.rotation.x = THREE.MathUtils.lerp(this.leftHip.rotation.x, 0, dt * 10);
            this.rightHip.rotation.x = THREE.MathUtils.lerp(this.rightHip.rotation.x, 0, dt * 10);
            this.rightShoulder.rotation.x = THREE.MathUtils.lerp(this.rightShoulder.rotation.x, -Math.PI / 3.5, dt * 10);
            this.leftShoulder.rotation.x = THREE.MathUtils.lerp(this.leftShoulder.rotation.x, -Math.PI / 5, dt * 10);
        }
    }

    updatePosition(x, y, z, rotation) {
        this.group.position.set(x, y, z);
        this.group.rotation.y = rotation;
    }

    setVisible(visible) { this.group.visible = visible; }
    cleanup() { this.scene.remove(this.group); }
}
