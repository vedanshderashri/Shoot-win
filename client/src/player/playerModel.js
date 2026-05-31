import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import Controls from './controls';
import Movement from './movement';
import Soldier from './character';

export default class PlayerModel {
    constructor(scene, camera, world, physicsMaterial, onStaminaChange) {
        this.scene = scene;
        this.camera = camera;
        this.world = world;
        this.isDead = false;

        const radius = 0.5;
        this.shape = new CANNON.Sphere(radius);
        this.body = new CANNON.Body({
            mass: 75,
            material: physicsMaterial,
            fixedRotation: true,
            linearDamping: 0.1
        });
        this.body.addShape(this.shape, new CANNON.Vec3(0, radius, 0));
        this.body.position.set(0, 2, 0);
        this.world.addBody(this.body);

        this.pitchObject = new THREE.Object3D();
        this.yawObject = new THREE.Object3D();
        this.yawObject.position.y = 1.6;
        this.yawObject.add(this.pitchObject);
        this.pitchObject.add(this.camera);
        this.scene.add(this.yawObject);

        this.cameraMode = 'FPP';
        this.camera.fov = 65; // Starting FOV
        this.camera.updateProjectionMatrix();

        // Local player character mesh (used in TPP mode)
        this.character = new Soldier(this.scene);
        this.character.setVisible(false); // Hidden by default in FPP

        this.controls = new Controls(this.yawObject, this.pitchObject, this.body);
        this.movement = new Movement(this.body, this.yawObject, this.controls, onStaminaChange);

        this.lastPosition = new THREE.Vector3();
        this.lastRotation = 0;
    }

    toggleCameraMode() {
        if (this.isDead) return;
        this.cameraMode = this.cameraMode === 'FPP' ? 'TPP' : 'FPP';
        
        const newBaseFov = this.cameraMode === 'FPP' ? 65 : 75;
        this.camera.fov = newBaseFov;
        this.camera.updateProjectionMatrix();
        
        if (window.gameEngine && window.gameEngine.weaponSystem) {
            window.gameEngine.weaponSystem.rifle.baseFov = newBaseFov;
            window.gameEngine.weaponSystem.sniper.baseFov = newBaseFov;
        }
        
        console.log(`Camera mode toggled to: ${this.cameraMode}`);
    }

    update(dt) {
        this.movement.update(dt, this.isDead);

        // Smooth over-the-shoulder camera positioning
        const targetCamPos = new THREE.Vector3();
        if (this.cameraMode === 'TPP' && !this.isDead) {
            targetCamPos.set(0.5, 0.8, 3.2);
        } else {
            targetCamPos.set(0, 0, 0);
        }
        this.camera.position.lerp(targetCamPos, dt * 10);

        // Update local character model position & animations in TPP
        if (this.character) {
            const shouldBeVisible = (this.cameraMode === 'TPP') && !this.isDead;
            this.character.setVisible(shouldBeVisible);

            if (shouldBeVisible) {
                const pos = this.yawObject.position;
                const rot = this.yawObject.rotation.y;

                // Snap group position/rotation to local player's body immediately to avoid visual lag
                this.character.group.position.copy(pos);
                this.character.group.rotation.y = rot;
                this.character.targetPosition.copy(pos);
                this.character.targetRotation = rot;

                const isMoving = this.controls.keys.w || this.controls.keys.a || this.controls.keys.s || this.controls.keys.d;
                
                // Pass weapon states from window.gameEngine.weaponSystem
                const ws = window.gameEngine?.weaponSystem;
                if (ws) {
                    const activeWeaponName = ws.activeWeaponIndex === 0 ? 'Rifle' : 'Sniper';
                    this.character.setEquippedWeapon(activeWeaponName);
                    this.character.setAiming(ws.isAiming);
                    this.character.setReloading(ws.currentWeapon?.isReloading || false);
                }

                this.character.animate(isMoving, dt);

                // Snap again after animate to override lerping inside character.animate
                this.character.group.position.copy(pos);
                this.character.group.rotation.y = rot;

                // Crouching squashing
                const newEyeY = this.yawObject.position.y - this.body.position.y;
                if (this.character.model) {
                    this.character.model.position.y = -newEyeY;
                    const crouchScaleY = newEyeY / 1.6; // 1.0 standing, 0.56 crouching
                    this.character.model.scale.y = 1.1 * crouchScaleY;
                }
            }
        }
    }

    hasMoved() {
        const d = this.yawObject.position.distanceToSquared(this.lastPosition);
        const rChange = Math.abs(this.yawObject.rotation.y - this.lastRotation);

        if (d > 0.001 || rChange > 0.01) {
            this.lastPosition.copy(this.yawObject.position);
            this.lastRotation = this.yawObject.rotation.y;
            return true;
        }
        return false;
    }

    getPosition() {
        return this.yawObject.position;
    }

    getRotation() {
        return this.yawObject.rotation.y;
    }

    die() {
        this.isDead = true;
        this.pitchObject.rotation.x = Math.PI / 2;
        this.body.velocity.set(0, 0, 0);
        if (this.character) {
            this.character.setVisible(false);
        }
    }
}
