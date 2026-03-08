import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const PLAYER_SPEED = 15;
const SPRINT_SPEED = 25;
const CROUCH_SPEED = 5;
const JUMP_VELOCITY = 4; // Reduced from 8

export default class Movement {
    constructor(body, yawObject, controls, onStaminaChange) {
        this.body = body;
        this.yawObject = yawObject;
        this.controls = controls;
        this.onStaminaChange = onStaminaChange;

        this.speed = PLAYER_SPEED;
        this.sprintSpeed = SPRINT_SPEED;
        this.crouchSpeed = CROUCH_SPEED;
        this.jumpVelocity = JUMP_VELOCITY;
        this.stamina = 100;
        this.isCrouching = false;

        this.raycastResult = new CANNON.RaycastResult();
    }

    update(dt, isDead) {
        if (isDead) return;

        // Ground check using raycast
        const from = this.body.position.clone();
        const to = new CANNON.Vec3(from.x, from.y - 0.6, from.z);

        this.raycastResult.reset();
        this.body.world.raycastClosest(from, to, { skipBackfaces: true }, this.raycastResult);

        const isGrounded = this.raycastResult.hasHit || Math.abs(this.body.velocity.y) < 0.1;
        this.controls.canJump = isGrounded;

        // Crouch
        this.isCrouching = !!this.controls.keys.crouch;

        if (this.controls.keys.space && this.controls.canJump && !this.isCrouching) {
            this.body.velocity.y = this.jumpVelocity;
            this.controls.canJump = false;
        }

        const inputVector = new THREE.Vector3(0, 0, 0);
        if (this.controls.keys.w) inputVector.z -= 1;
        if (this.controls.keys.s) inputVector.z += 1;
        if (this.controls.keys.a) inputVector.x -= 1;
        if (this.controls.keys.d) inputVector.x += 1;

        inputVector.normalize();
        inputVector.applyQuaternion(this.yawObject.quaternion);

        let isSprintKey = this.controls.keys.shift && !this.isCrouching && isGrounded;

        if (isSprintKey && inputVector.length() > 0 && this.stamina > 0) {
            this.stamina -= dt * 20;
            if (this.stamina < 0) this.stamina = 0;
        } else {
            isSprintKey = false;
            if (this.stamina < 100) {
                this.stamina += dt * 10;
                if (this.stamina > 100) this.stamina = 100;
            }
        }

        if (this.onStaminaChange) this.onStaminaChange(this.stamina);

        const currentSpeed = this.isCrouching ? this.crouchSpeed : (isSprintKey ? this.sprintSpeed : this.speed);

        if (inputVector.length() > 0) {
            this.body.velocity.x = inputVector.x * currentSpeed;
            this.body.velocity.z = inputVector.z * currentSpeed;
        } else {
            this.body.velocity.x *= 0.5;
            this.body.velocity.z *= 0.5;
        }

        // Camera height: lower when crouching
        const targetEyeY = this.isCrouching ? 0.9 : 1.6;
        const currentEyeY = this.yawObject.position.y - this.body.position.y;
        const newEyeY = THREE.MathUtils.lerp(currentEyeY, targetEyeY, dt * 12);

        this.yawObject.position.copy(this.body.position);
        this.yawObject.position.y += newEyeY;
    }
}
