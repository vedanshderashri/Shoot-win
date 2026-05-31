import Rifle from './rifle';
import Sniper from './sniper';
import * as THREE from 'three';
import sceneManager from '../engine/scene';
import { Grenade } from './grenade';
import { isMobile } from '../player/touchControls';

export default class WeaponSystem {
    constructor(scene, camera, socket, onAmmoChange, onHitmarker, onGrenadeChange, onWeaponChange) {
        this.scene = scene;
        this.camera = camera;
        this.socket = socket;
        this.onGrenadeChange = onGrenadeChange;
        this.onWeaponChange = onWeaponChange; // Callback to notify App.jsx of weapon changes

        this.rifle = new Rifle(scene, camera, socket, onAmmoChange, onHitmarker);
        this.sniper = new Sniper(scene, camera, socket, onAmmoChange, onHitmarker);

        // Hide sniper model initially
        this.sniper.mesh.visible = false;

        this.weapons = [this.rifle, this.sniper];
        this.activeWeaponIndex = 0;
        this.currentWeapon = this.rifle;

        this.isMouseDown = false;
        this.isAiming = false;
        this.isDead = false;

        this.maxGrenades = 3;
        this.grenadesLeft = this.maxGrenades;
        this.activeGrenades = [];

        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onWheel = this.onWheel.bind(this);

        document.addEventListener('mousedown', this.onMouseDown, false);
        document.addEventListener('mouseup', this.onMouseUp, false);
        document.addEventListener('keydown', this.onKeyDown, false);
        document.addEventListener('wheel', this.onWheel, { passive: false });

        // Emit initial grenade count
        if (this.onGrenadeChange) this.onGrenadeChange(this.grenadesLeft);
    }

    switchWeapon(index) {
        if (this.isDead || index === this.activeWeaponIndex || index < 0 || index >= this.weapons.length) return;

        // Hide current weapon and reset its aiming state
        this.currentWeapon.mesh.visible = false;
        this.currentWeapon.setAiming(false);

        // Reset camera FOV
        this.camera.fov = this.currentWeapon.baseFov;
        this.camera.updateProjectionMatrix();

        // Switch to new weapon
        this.activeWeaponIndex = index;
        this.currentWeapon = this.weapons[this.activeWeaponIndex];
        this.currentWeapon.mesh.visible = true;

        console.log(`Switched to weapon index ${index}: ${this.activeWeaponIndex === 0 ? 'Assault Rifle' : 'Sniper Rifle'}`);

        // Update HUD callbacks
        if (this.currentWeapon.onAmmoChange) {
            this.currentWeapon.onAmmoChange(this.currentWeapon.ammo);
        }
        if (this.onWeaponChange) {
            this.onWeaponChange(this.activeWeaponIndex === 0 ? 'Rifle' : 'Sniper');
        }
    }

    onKeyDown(event) {
        if (this.isDead) return;
        if (event.code === 'KeyR') {
            this.currentWeapon.reload();
            // Reload grenades back to max
            this.grenadesLeft = this.maxGrenades;
            if (this.onGrenadeChange) this.onGrenadeChange(this.grenadesLeft);
        } else if (event.code === 'KeyG') {
            this.throwGrenade();
        } else if (event.code === 'Digit1') {
            this.switchWeapon(0);
        } else if (event.code === 'Digit2') {
            this.switchWeapon(1);
        }
    }

    onWheel(event) {
        if (this.isDead) return;
        // deltaY > 0 means scroll down, deltaY < 0 means scroll up
        if (event.deltaY > 0) {
            this.switchWeapon(1);
        } else if (event.deltaY < 0) {
            this.switchWeapon(0);
        }
    }

    onMouseDown(event) {
        if (this.isDead) return;
        if (event.button === 0) { // Left click
            this.isMouseDown = true;
            // Always try to fire on the first click regardless of lock.
            // This ensures the click that locks the pointer also fires the gun.
            this.currentWeapon.shoot();
        } else if (event.button === 2) { // Right click
            this.isAiming = true;
            if (this.currentWeapon.setAiming) {
                this.currentWeapon.setAiming(true);
            }
        }
    }

    onMouseUp(event) {
        if (event.button === 0) { // Left click
            this.isMouseDown = false;
        } else if (event.button === 2) { // Right click
            this.isAiming = false;
            if (this.currentWeapon.setAiming) {
                this.currentWeapon.setAiming(false);
            }
        }
    }

    // Proxy for external controls
    shoot() {
        if (this.isDead) return;
        this.currentWeapon.shoot();
    }

    reload() {
        if (this.isDead) return;
        this.currentWeapon.reload();
    }

    throwGrenade() {
        if (this.isDead || this.grenadesLeft <= 0) return;
        this.grenadesLeft--;
        if (this.onGrenadeChange) this.onGrenadeChange(this.grenadesLeft);

        const worldQuat = new THREE.Quaternion();
        this.camera.getWorldQuaternion(worldQuat);
        const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(worldQuat).normalize();

        const pos = new THREE.Vector3();
        this.camera.getWorldPosition(pos);
        // Spawn slightly in front of player
        pos.addScaledVector(direction, 1.0);

        const id = 'grenade_' + Date.now();

        const grenade = new Grenade(this.scene, sceneManager.world, pos, direction, id, true, (hitPos) => {
            this.handleGrenadeExplosion(hitPos);
        });

        this.activeGrenades.push(grenade);

        // Tell server we threw a grenade so others can render it
        this.socket.emit('player_throw_grenade', {
            id: id,
            x: pos.x, y: pos.y, z: pos.z,
            dx: direction.x, dy: direction.y, dz: direction.z
        });
    }

    handleGrenadeExplosion(hitPos) {
        const explosionRadius = 10;
        const maxDamage = 75;

        // Check distance to all other players
        this.scene.children.forEach(child => {
            if (child.userData.isPlayer) {
                const childPos = new THREE.Vector3();
                child.getWorldPosition(childPos);

                const dist = hitPos.distanceTo(childPos);
                if (dist <= explosionRadius) {
                    const damage = maxDamage * (1 - (dist / explosionRadius));
                    this.socket.emit('player_hit', {
                        targetId: child.userData.id,
                        damage: damage,
                        isHeadshot: false
                    });
                }
            }
        });
    }

    syncRemoteGrenade(data) {
        const pos = new THREE.Vector3(data.x, data.y, data.z);
        const dir = new THREE.Vector3(data.dx, data.dy, data.dz);
        const grenade = new Grenade(this.scene, sceneManager.world, pos, dir, data.id, false);
        this.activeGrenades.push(grenade);
    }

    update(dt, isDead) {
        this.isDead = isDead;
        if (this.currentWeapon) {
            this.currentWeapon.update(dt);

            if (!this.isDead && this.isMouseDown && (document.pointerLockElement || isMobile)) {
                this.currentWeapon.shoot();
            }
        }

        // Update active grenades
        for (let i = this.activeGrenades.length - 1; i >= 0; i--) {
            const g = this.activeGrenades[i];
            g.update(dt);
            if (g.isExploded) {
                this.activeGrenades.splice(i, 1);
            }
        }
    }
}
