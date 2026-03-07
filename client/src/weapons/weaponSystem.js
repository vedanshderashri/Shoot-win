import Rifle from './rifle';

export default class WeaponSystem {
    constructor(scene, camera, socket, onAmmoChange, onHitmarker) {
        this.currentWeapon = new Rifle(scene, camera, socket, onAmmoChange, onHitmarker);
        this.isMouseDown = false;
        this.isAiming = false;
        this.isDead = false;

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

    update(dt, isDead) {
        this.isDead = isDead;
        if (this.currentWeapon) {
            this.currentWeapon.update(dt);

            // Handle automatic firing
            // Only continue automatic firing if the pointer is locked
            if (!this.isDead && this.isMouseDown && document.pointerLockElement) {
                this.currentWeapon.shoot();
            }
        }
    }
}
