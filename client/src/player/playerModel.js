import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import Controls from './controls';
import Movement from './movement';

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

        this.controls = new Controls(this.yawObject, this.pitchObject, this.body);
        this.movement = new Movement(this.body, this.yawObject, this.controls, onStaminaChange);

        this.lastPosition = new THREE.Vector3();
        this.lastRotation = 0;
    }

    update(dt) {
        this.movement.update(dt, this.isDead);
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

        setTimeout(() => {
            this.isDead = false;
            this.body.position.set((Math.random() - 0.5) * 20, 5, (Math.random() - 0.5) * 20);
            this.pitchObject.rotation.x = 0;
        }, 3000);
    }
}
