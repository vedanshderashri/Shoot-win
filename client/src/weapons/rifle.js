import * as THREE from 'three';

const RIFLE_CONFIG = {
    damage: 25,
    headshotMultiplier: 2,
    fireRateRPM: 600,
    magazine: 30,
    reloadTimeSec: 2
};
import soundSystem from '../engine/soundSystem';
import { createImpactEffect } from './bullet';

export default class Rifle {
    constructor(scene, camera, socket, onAmmoChange, onHitmarker) {
        this.scene = scene;
        this.camera = camera;
        this.socket = socket;
        this.onAmmoChange = onAmmoChange;
        this.onHitmarker = onHitmarker;

        // Constants from config
        const config = RIFLE_CONFIG;
        this.damage = config.damage;
        this.headshotMultiplier = config.headshotMultiplier;

        this.shootDelay = 60 / config.fireRateRPM; // fire rate in seconds
        this.lastShootTime = 0;
        this.maxAmmo = config.magazine;
        this.ammo = this.maxAmmo;
        this.reloadTimeMs = config.reloadTimeSec * 1000;

        this.isReloading = false;
        this.isAiming = false;

        this.raycaster = new THREE.Raycaster();
        this.currentRecoil = 0;
        this.maxRecoil = 0.05;

        // Base positions for aiming lerp
        this.baseFov = camera.fov;
        this.aimFov = 45;
        this.basePosition = new THREE.Vector3(0.3, -0.3, -0.5);
        this.aimPosition = new THREE.Vector3(0, -0.15, -0.3);

        // Visual setup
        this.muzzleFlash = new THREE.PointLight(0xffaa00, 0, 10);
        this.scene.add(this.muzzleFlash);
        this.createMesh();
    }

    createMesh() {
        this.mesh = new THREE.Group();
        this.gunBody = new THREE.Group();
        this.mesh.add(this.gunBody);

        const gunMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.3 });
        const plasticMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
        const railMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.6 });
        const lensMat = new THREE.MeshStandardMaterial({ color: 0x1122AA, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.8 });

        // 1. Lower Receiver
        const lowerReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.25), gunMat);
        lowerReceiver.position.set(0, -0.02, 0);
        this.gunBody.add(lowerReceiver);

        // 2. Upper Receiver
        const upperReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.06, 0.26), gunMat);
        upperReceiver.position.set(0, 0.05, 0);
        this.gunBody.add(upperReceiver);

        // 3. Handguard / Rail System
        const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.055, 0.35), railMat);
        handguard.position.set(0, 0.045, -0.3);
        this.gunBody.add(handguard);

        // Side Rails
        for (let i = 0; i < 2; i++) {
            const sideRail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.3), railMat);
            sideRail.position.set(0, 0.045, -0.3);
            this.gunBody.add(sideRail);
        }

        // 4. Barrel
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.4), gunMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.045, -0.55);
        this.gunBody.add(barrel);

        // 5. Suppressor
        const suppressor = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18), plasticMat);
        suppressor.rotation.x = Math.PI / 2;
        suppressor.position.set(0, 0.045, -0.75);
        this.gunBody.add(suppressor);

        // 6. Magazine
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.16, 0.07), plasticMat);
        mag.position.set(0, -0.12, -0.08);
        mag.rotation.x = 0.15;
        this.gunBody.add(mag);

        // Magazine details (lines)
        const magDetail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.05), plasticMat);
        magDetail.position.set(0, -0.12, -0.08);
        magDetail.rotation.x = 0.15;
        this.gunBody.add(magDetail);

        // 7. Pistol Grip (Ergonomic)
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.055), plasticMat);
        grip.position.set(0, -0.1, 0.08);
        grip.rotation.x = -0.25;
        this.gunBody.add(grip);

        const gripBase = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.02, 0.06), plasticMat);
        gripBase.position.set(0, -0.16, 0.095);
        gripBase.rotation.x = -0.25;
        this.gunBody.add(gripBase);

        // 8. Tactical Stock
        const stockTube = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2), gunMat);
        stockTube.rotation.x = Math.PI / 2;
        stockTube.position.set(0, 0.03, 0.22);
        this.gunBody.add(stockTube);

        const stockBody = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.12, 0.15), plasticMat);
        stockBody.position.set(0, -0.01, 0.3);
        this.gunBody.add(stockBody);

        const stockPad = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.02), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1.0 }));
        stockPad.position.set(0, -0.01, 0.38);
        this.gunBody.add(stockPad);

        // 9. ACOG Optic Scope
        this.scopeGroup = new THREE.Group();
        this.mesh.add(this.scopeGroup);

        const scopeBase = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.08), railMat);
        scopeBase.position.set(0, 0.09, -0.05);
        this.scopeGroup.add(scopeBase);

        const scopeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.12), gunMat);
        scopeBody.rotation.x = Math.PI / 2;
        scopeBody.position.set(0, 0.115, -0.05);
        this.scopeGroup.add(scopeBody);

        const scopeFront = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.022, 0.04), gunMat);
        scopeFront.rotation.x = Math.PI / 2;
        scopeFront.position.set(0, 0.115, -0.13);
        this.scopeGroup.add(scopeFront);

        // Glass lenses
        const lensBack = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.005), lensMat);
        lensBack.rotation.x = Math.PI / 2;
        lensBack.position.set(0, 0.115, 0.01);
        this.scopeGroup.add(lensBack);

        const lensFront = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.005), lensMat);
        lensFront.rotation.x = Math.PI / 2;
        lensFront.position.set(0, 0.115, -0.15);
        this.scopeGroup.add(lensFront);

        // Final Mesh positioning in camera view
        // Move aiming position so the scope aligns with the camera center
        this.aimPosition = new THREE.Vector3(0, -0.115, -0.25);
        this.basePosition = new THREE.Vector3(0.25, -0.25, -0.5);

        this.mesh.position.copy(this.basePosition);
        this.camera.add(this.mesh);

        this.muzzlePos = new THREE.Object3D();
        this.muzzlePos.position.set(0, 0.045, -0.85); // End of suppressor
        this.gunBody.add(this.muzzlePos);
    }

    reload() {
        if (this.isReloading || this.ammo >= this.maxAmmo) return;
        this.isReloading = true;

        soundSystem.playReloadSound();

        // Start reload animation: spin the gun or drop it down
        const reloadAnimDuration = this.reloadTimeMs;

        setTimeout(() => {
            this.ammo = this.maxAmmo;
            this.isReloading = false;
            if (this.onAmmoChange) this.onAmmoChange(this.ammo);
        }, reloadAnimDuration);
    }

    setAiming(isAiming) {
        this.isAiming = isAiming && !this.isReloading;
    }

    shoot() {
        if (this.isReloading || this.ammo <= 0) return;

        const time = performance.now() / 1000;
        if (time - this.lastShootTime < this.shootDelay) return;
        this.lastShootTime = time;

        this.ammo--;
        if (this.onAmmoChange) this.onAmmoChange(this.ammo);

        this.playShootEffect();
        soundSystem.playShootSound();

        this.currentRecoil = Math.min(this.currentRecoil + 0.015, this.maxRecoil);
        this.socket.emit('player_shoot');

        // Use World Quaternion for accurate raycasting in nested hierarchies
        const worldQuat = new THREE.Quaternion();
        this.camera.getWorldQuaternion(worldQuat);

        // Correct Raycast with view-space spread
        const localDirection = new THREE.Vector3(
            (Math.random() - 0.5) * this.currentRecoil,
            (Math.random() - 0.5) * this.currentRecoil,
            -1
        ).normalize();

        const direction = localDirection.applyQuaternion(worldQuat);

        const cameraWorldPos = new THREE.Vector3();
        this.camera.getWorldPosition(cameraWorldPos);
        this.raycaster.set(cameraWorldPos, direction);

        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        for (let i = 0; i < intersects.length; i++) {
            const hit = intersects[i];
            if (hit.object.userData.isPlayer) {
                const localHit = hit.object.worldToLocal(hit.point.clone());
                const isHeadshot = localHit.y > 0.6;
                const dmg = isHeadshot ? this.damage * this.headshotMultiplier : this.damage;

                this.socket.emit('player_hit', {
                    targetId: hit.object.userData.id,
                    damage: dmg,
                    isHeadshot
                });

                createImpactEffect(this.scene, hit.point, true);
                soundSystem.playHitmarkerSound();
                if (this.onHitmarker) this.onHitmarker(isHeadshot);
                break;
            } else if (hit.object.userData.isObstacle || hit.object.name === 'env') {
                createImpactEffect(this.scene, hit.point, false);
                break;
            }
        }
    }

    playShootEffect() {
        this.mesh.position.z += 0.05 + this.currentRecoil * 2;
        this.mesh.rotation.x += 0.05 + this.currentRecoil;

        const worldPos = new THREE.Vector3();
        this.muzzlePos.getWorldPosition(worldPos);
        this.muzzleFlash.position.copy(worldPos);
        this.muzzleFlash.intensity = 5;
    }

    update(dt) {
        if (this.muzzleFlash.intensity > 0) {
            this.muzzleFlash.intensity -= dt * 50;
        }

        this.currentRecoil = THREE.MathUtils.lerp(this.currentRecoil, 0, dt * 5);

        // Aiming transitions
        if (this.isAiming && !this.isReloading) {
            if (this.gunBody) this.gunBody.visible = false;
            if (this.scopeGroup) this.scopeGroup.visible = false;
            this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.aimFov, dt * 10);
            this.mesh.position.lerp(this.aimPosition, dt * 10);
        } else {
            if (this.gunBody) this.gunBody.visible = true;
            if (this.scopeGroup) this.scopeGroup.visible = true;
            this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.baseFov, dt * 10);
            const targetPos = this.basePosition.clone();

            if (this.isReloading) {
                // Procedural reload animation: rotate gun downward
                targetPos.y -= 0.3;
                this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, -Math.PI / 4, dt * 5);
            } else {
                this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, 0, dt * 10);
            }

            this.mesh.position.lerp(targetPos, dt * 10);
        }
        this.camera.updateProjectionMatrix();

        // Apply recoil visually on top of base/aim position
        if (!this.isReloading) {
            this.mesh.position.z = THREE.MathUtils.lerp(this.mesh.position.z, this.isAiming ? this.aimPosition.z : this.basePosition.z, dt * 10);
            this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, 0, dt * 10);
        }
    }
}
