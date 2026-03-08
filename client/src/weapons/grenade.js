import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import soundSystem from '../engine/soundSystem';

export class Grenade {
    constructor(scene, world, position, direction, id, isLocal = false, onExplode = null) {
        this.scene = scene;
        this.world = world;
        this.id = id;
        this.isLocal = isLocal;
        this.onExplode = onExplode; // Callback for damage calc (only local throws)

        // Visual Mesh
        const geometry = new THREE.SphereGeometry(0.1, 8, 8);
        const material = new THREE.MeshStandardMaterial({ color: 0x224422, roughness: 0.8 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);

        // Physics Body
        const shape = new CANNON.Sphere(0.1);
        this.body = new CANNON.Body({
            mass: 1,
            material: new CANNON.Material({ friction: 0.1, restitution: 0.5 }), // Bouncy
            position: new CANNON.Vec3(position.x, position.y, position.z)
        });
        this.body.addShape(shape);
        this.body.linearDamping = 0.4;
        this.body.angularDamping = 0.4;

        // Initial throw velocity
        const throwForce = 15;
        this.body.velocity.set(direction.x * throwForce, direction.y * throwForce + 3, direction.z * throwForce);

        this.world.addBody(this.body);

        this.fuseTime = 3.0; // Seconds until boom
        this.isExploded = false;
        this.timeAlive = 0;
    }

    update(dt) {
        if (this.isExploded) return;

        this.timeAlive += dt;

        // Sync mesh to physics body
        this.mesh.position.copy(this.body.position);
        this.mesh.quaternion.copy(this.body.quaternion);

        if (this.timeAlive >= this.fuseTime) {
            this.explode();
        }
    }

    explode() {
        this.isExploded = true;

        // Explosion Visuals
        const explosionGeom = new THREE.SphereGeometry(3, 16, 16);
        const explosionMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 });
        const explosionMesh = new THREE.Mesh(explosionGeom, explosionMat);
        explosionMesh.position.copy(this.mesh.position);
        this.scene.add(explosionMesh);

        // Explosion Sound
        // Playing a generic loud sound or reusing shoot with low pitch if no explosion asset exists
        soundSystem.playShootSound();

        // Cleanup after boom effect
        setTimeout(() => {
            this.scene.remove(explosionMesh);
        }, 300);

        // Cleanup physics and object
        this.scene.remove(this.mesh);
        this.world.removeBody(this.body);

        // Only calculate and emit damage if WE threw this grenade
        if (this.isLocal && this.onExplode) {
            this.onExplode(this.mesh.position.clone());
        }
    }

    cleanup() {
        if (!this.isExploded) {
            this.scene.remove(this.mesh);
            this.world.removeBody(this.body);
            this.isExploded = true;
        }
    }
}
