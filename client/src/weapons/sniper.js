import * as THREE from 'three';
import soundSystem from '../engine/soundSystem';
import { createImpactEffect } from './bullet';

const SNIPER_CONFIG = {
    damage: 75,
    headshotMultiplier: 2,
    fireRateRPM: 45, // Slow bolt-action
    magazine: 5,
    reloadTimeSec: 3
};

export default class Sniper {
    constructor(scene, camera, socket, onAmmoChange, onHitmarker) {
        this.scene = scene;
        this.camera = camera;
        this.socket = socket;
        this.onAmmoChange = onAmmoChange;
        this.onHitmarker = onHitmarker;

        // Constants from config
        const config = SNIPER_CONFIG;
        this.damage = config.damage;
        this.headshotMultiplier = config.headshotMultiplier;

        this.shootDelay = 60 / config.fireRateRPM;
        this.lastShootTime = 0;
        this.maxAmmo = config.magazine;
        this.ammo = this.maxAmmo;
        this.reloadTimeMs = config.reloadTimeSec * 1000;

        this.isReloading = false;
        this.isAiming = false;

        this.raycaster = new THREE.Raycaster();
        this.currentRecoil = 0;
        this.maxRecoil = 0.12; // Massive recoil kick!

        // Base positions for aiming lerp
        this.baseFov = camera.fov;
        this.aimFov = 20; // Intense sniper zoom
        this.basePosition = new THREE.Vector3(0.2, -0.25, -0.6);
        this.aimPosition = new THREE.Vector3(0, -0.11, -0.3);

        // Visual setup
        this.muzzleFlash = new THREE.PointLight(0xff7700, 0, 15);
        this.scene.add(this.muzzleFlash);
        this.createMesh();
    }

    createMesh() {
        this.mesh = new THREE.Group();
        this.gunBody = new THREE.Group();
        this.mesh.add(this.gunBody);

        const steelMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.1 });
        const oliveMat = new THREE.MeshStandardMaterial({ color: 0x4B5320, roughness: 0.9 }); // Military olive-drab green
        const matteMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.95 });
        const glassMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.7 });

        // 1. Heavy Receiver & Chassis
        const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.45), oliveMat);
        chassis.position.set(0, -0.01, 0);
        this.gunBody.add(chassis);

        // 2. Extra Long Steel Barrel
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.75), steelMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.03, -0.6);
        this.gunBody.add(barrel);

        // 3. Huge Muzzle Brake
        const muzzleBrake = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.12), steelMat);
        muzzleBrake.rotation.x = Math.PI / 2;
        muzzleBrake.position.set(0, 0.03, -1.0);
        this.gunBody.add(muzzleBrake);

        // 4. Large Sniper Scope
        this.scopeGroup = new THREE.Group();
        this.mesh.add(this.scopeGroup);

        const scopeBase = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.04, 0.08), steelMat);
        scopeBase.position.set(0, 0.07, -0.05);
        this.scopeGroup.add(scopeBase);

        const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22), steelMat);
        scopeTube.rotation.x = Math.PI / 2;
        scopeTube.position.set(0, 0.11, -0.05);
        this.scopeGroup.add(scopeTube);

        const scopeFrontBell = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.02, 0.06), steelMat);
        scopeFrontBell.rotation.x = Math.PI / 2;
        scopeFrontBell.position.set(0, 0.11, -0.19);
        this.scopeGroup.add(scopeFrontBell);

        // Glass lenses
        const lensBack = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.005), glassMat);
        lensBack.rotation.x = Math.PI / 2;
        lensBack.position.set(0, 0.11, 0.06);
        this.scopeGroup.add(lensBack);

        const lensFront = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.005), glassMat);
        lensFront.rotation.x = Math.PI / 2;
        lensFront.position.set(0, 0.11, -0.22);
        this.scopeGroup.add(lensFront);

        // 5. Heavy Stock (Adjustable Cheekrest)
        const stockBody = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.11, 0.25), oliveMat);
        stockBody.position.set(0, -0.02, 0.3);
        this.gunBody.add(stockBody);

        const cheekRest = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.04, 0.14), matteMat);
        cheekRest.position.set(0, 0.055, 0.28);
        this.gunBody.add(cheekRest);

        const stockPad = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.13, 0.02), matteMat);
        stockPad.position.set(0, -0.02, 0.425);
        this.gunBody.add(stockPad);

        // 6. Tactical Bipod (Folded)
        const bipodLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.25), matteMat);
        bipodLeft.rotation.z = -0.15;
        bipodLeft.rotation.x = Math.PI / 2;
        bipodLeft.position.set(-0.03, -0.08, -0.4);
        this.gunBody.add(bipodLeft);

        const bipodRight = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.25), matteMat);
        bipodRight.rotation.z = 0.15;
        bipodRight.rotation.x = Math.PI / 2;
        bipodRight.position.set(0.03, -0.08, -0.4);
        this.gunBody.add(bipodRight);

        // 7. Bolt-action Handle (Visual indicator)
        this.boltHandle = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), steelMat);
        this.boltHandle.position.set(0.06, 0.02, 0.02);
        this.gunBody.add(this.boltHandle);

        const boltArm = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.05), steelMat);
        boltArm.rotation.z = Math.PI / 2.5;
        boltArm.position.set(0.03, 0.01, 0.02);
        this.gunBody.add(boltArm);

        // Offset aiming positions
        this.aimPosition = new THREE.Vector3(0, -0.11, -0.22);
        this.basePosition = new THREE.Vector3(0.2, -0.2, -0.5);

        this.mesh.position.copy(this.basePosition);
        this.camera.add(this.mesh);

        this.muzzlePos = new THREE.Object3D();
        this.muzzlePos.position.set(0, 0.03, -1.06);
        this.gunBody.add(this.muzzlePos);
    }

    reload() {
        if (this.isReloading || this.ammo >= this.maxAmmo) return;
        this.isReloading = true;

        soundSystem.playReloadSound();

        // Sniper reloads slightly slower, let's simulate
        setTimeout(() => {
            this.ammo = this.maxAmmo;
            this.isReloading = false;
            if (this.onAmmoChange) this.onAmmoChange(this.ammo);
        }, this.reloadTimeMs);
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

        // Sniper kick-back recoil
        this.currentRecoil = this.maxRecoil;
        this.socket.emit('player_shoot');

        const worldQuat = new THREE.Quaternion();
        this.camera.getWorldQuaternion(worldQuat);

        // Minimal bullet spread on sniper compared to rifle when aiming
        const spread = this.isAiming ? 0 : this.currentRecoil;
        const localDirection = new THREE.Vector3(
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread,
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
        this.mesh.position.z += 0.2; // Significant physical weapon kickback!
        this.mesh.rotation.x += 0.15; // Muzzle flips upward!

        const worldPos = new THREE.Vector3();
        this.muzzlePos.getWorldPosition(worldPos);
        this.muzzleFlash.position.copy(worldPos);
        this.muzzleFlash.intensity = 8;
    }

    update(dt) {
        if (this.muzzleFlash.intensity > 0) {
            this.muzzleFlash.intensity -= dt * 60;
        }

        this.currentRecoil = THREE.MathUtils.lerp(this.currentRecoil, 0, dt * 6);

        // Aiming transitions
        if (this.isAiming && !this.isReloading) {
            if (this.gunBody) this.gunBody.visible = false;
            if (this.scopeGroup) this.scopeGroup.visible = false;
            this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.aimFov, dt * 12);
            this.mesh.position.lerp(this.aimPosition, dt * 12);
        } else {
            if (this.gunBody) this.gunBody.visible = true;
            if (this.scopeGroup) this.scopeGroup.visible = true;
            this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.baseFov, dt * 10);
            const targetPos = this.basePosition.clone();

            if (this.isReloading) {
                // Tactical drop reload animation
                targetPos.y -= 0.35;
                this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, -Math.PI / 3, dt * 4);
            } else {
                this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, 0, dt * 10);
            }

            this.mesh.position.lerp(targetPos, dt * 10);
        }
        this.camera.updateProjectionMatrix();

        // Restore recoil recovery
        if (!this.isReloading) {
            this.mesh.position.z = THREE.MathUtils.lerp(this.mesh.position.z, this.isAiming ? this.aimPosition.z : this.basePosition.z, dt * 8);
            this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, 0, dt * 8);
        }
    }
}
