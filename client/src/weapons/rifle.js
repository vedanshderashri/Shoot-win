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

        const gunMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.5, roughness: 0.4 });
        const plasticMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });

        // 1. Receiver (Main Body)
        const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.4), gunMat);
        this.mesh.add(receiver);

        // 2. Handguard (Barrel Shroud)
        const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.3), gunMat);
        handguard.position.z = -0.35;
        this.mesh.add(handguard);

        // 3. Barrel & Suppressor
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2), gunMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.z = -0.6;
        this.mesh.add(barrel);

        // 4. Magazine (Curved)
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.08), plasticMat);
        mag.position.set(0, -0.12, -0.1);
        mag.rotation.x = 0.2;
        this.mesh.add(mag);

        // 5. Pistol Grip
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.12, 0.06), plasticMat);
        grip.position.set(0, -0.1, 0.1);
        grip.rotation.x = -0.3;
        this.mesh.add(grip);

        // 6. Stock
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.2), plasticMat);
        stock.position.set(0, 0.02, 0.3);
        this.mesh.add(stock);

        // 7. Sights (Iron Sights)
        const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.04, 0.01), gunMat);
        frontSight.position.set(0, 0.06, -0.45);
        this.mesh.add(frontSight);

        const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.01), gunMat);
        rearSight.position.set(0, 0.06, 0.15);
        this.mesh.add(rearSight);

        // Final Mesh positioning in camera view
        this.mesh.position.copy(this.basePosition);
        this.camera.add(this.mesh);

        this.muzzlePos = new THREE.Object3D();
        this.muzzlePos.position.set(0, 0, -0.7);
        this.mesh.add(this.muzzlePos);
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
            this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.aimFov, dt * 10);
            this.mesh.position.lerp(this.aimPosition, dt * 10);
        } else {
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
