import Rifle from './rifle';
import * as THREE from 'three';
import sceneManager from '../engine/scene';
import { Grenade } from './grenade';

export default class WeaponSystem {
    constructor(scene, camera, socket, onAmmoChange, onHitmarker) {
        this.scene = scene;
        this.camera = camera;
        this.socket = socket;
        this.currentWeapon = new Rifle(scene, camera, socket, onAmmoChange, onHitmarker);

        this.isMouseDown = false;
        this.isAiming = false;
        this.isDead = false;

        this.grenadesLeft = 3;
        this.activeGrenades = [];

        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);

        document.addEventListener('mousedown', this.onMouseDown, false);
        document.addEventListener('mouseup', this.onMouseUp, false);
        document.addEventListener('keydown', this.onKeyDown, false);
    }

    onKeyDown(event) {
        if (this.isDead) return;
        if (event.code === 'KeyR') {
            this.currentWeapon.reload();
        } else if (event.code === 'KeyG') {
            this.throwGrenade();
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

            if (!this.isDead && this.isMouseDown && document.pointerLockElement) {
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
