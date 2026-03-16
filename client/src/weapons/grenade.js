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
        const pos = this.mesh.position.clone();

        // ── Stage 1: Bright Flash ──
        const flashLight = new THREE.PointLight(0xffcc00, 15, 30);
        flashLight.position.copy(pos);
        this.scene.add(flashLight);

        // Flash sphere (very bright, very brief)
        const flashGeo = new THREE.SphereGeometry(1.5, 12, 12);
        const flashMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const flashMesh = new THREE.Mesh(flashGeo, flashMat);
        flashMesh.position.copy(pos);
        this.scene.add(flashMesh);

        // ── Stage 2: Fireball ──
        const fireballGeo = new THREE.SphereGeometry(2.5, 16, 16);
        const fireballMat = new THREE.MeshBasicMaterial({
            color: 0xff4400,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const fireball = new THREE.Mesh(fireballGeo, fireballMat);
        fireball.position.copy(pos);
        this.scene.add(fireball);

        // Inner fireball (brighter core)
        const coreGeo = new THREE.SphereGeometry(1.2, 12, 12);
        const coreMat = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.copy(pos);
        this.scene.add(core);

        // ── Stage 3: Shockwave Ring ──
        const ringGeo = new THREE.RingGeometry(0.5, 1.5, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xffaa44,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(pos);
        ring.rotation.x = -Math.PI / 2;
        this.scene.add(ring);

        // ── Stage 4: Debris Particles ──
        const debrisCount = 20;
        const debrisParts = [];
        for (let i = 0; i < debrisCount; i++) {
            const size = 0.05 + Math.random() * 0.12;
            const dGeo = new THREE.BoxGeometry(size, size, size);
            const dMat = new THREE.MeshBasicMaterial({
                color: Math.random() > 0.5 ? 0x333333 : 0x664400,
                transparent: true,
                opacity: 1
            });
            const debris = new THREE.Mesh(dGeo, dMat);
            debris.position.copy(pos);
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 12,
                Math.random() * 8 + 2,
                (Math.random() - 0.5) * 12
            );
            debris.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            this.scene.add(debris);
            debrisParts.push({ mesh: debris, velocity, life: 0.8 + Math.random() * 0.6 });
        }

        // ── Stage 5: Ember Particles ──
        const emberCount = 15;
        const embers = [];
        for (let i = 0; i < emberCount; i++) {
            const eGeo = new THREE.SphereGeometry(0.03 + Math.random() * 0.05, 4, 4);
            const eMat = new THREE.MeshBasicMaterial({
                color: 0xff6600,
                transparent: true,
                opacity: 1,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const ember = new THREE.Mesh(eGeo, eMat);
            ember.position.copy(pos);
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 6,
                Math.random() * 6 + 3,
                (Math.random() - 0.5) * 6
            );
            this.scene.add(ember);
            embers.push({ mesh: ember, velocity, life: 1.0 + Math.random() * 1.0 });
        }

        // ── Stage 6: Smoke Cloud ──
        const smokeParticles = [];
        for (let i = 0; i < 6; i++) {
            const sGeo = new THREE.SphereGeometry(0.8 + Math.random() * 1.2, 8, 8);
            const sMat = new THREE.MeshBasicMaterial({
                color: 0x222222,
                transparent: true,
                opacity: 0.5,
                depthWrite: false
            });
            const smoke = new THREE.Mesh(sGeo, sMat);
            smoke.position.set(
                pos.x + (Math.random() - 0.5) * 2,
                pos.y + Math.random() * 1.5,
                pos.z + (Math.random() - 0.5) * 2
            );
            this.scene.add(smoke);
            smokeParticles.push({
                mesh: smoke,
                drift: new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.8 + Math.random() * 0.5, (Math.random() - 0.5) * 0.5),
                life: 1.5 + Math.random() * 1.0
            });
        }

        // Explosion Sound
        soundSystem.playShootSound();

        // ── Animation Loop ──
        let elapsed = 0;
        const scene = this.scene;
        const animate = () => {
            const dt = 0.016; // ~60fps
            elapsed += dt;

            // Flash fades quickly
            if (flashMesh.parent) {
                flashMat.opacity -= dt * 8;
                flashMesh.scale.multiplyScalar(1 + dt * 6);
                flashLight.intensity = Math.max(0, flashLight.intensity - dt * 40);
                if (flashMat.opacity <= 0) {
                    scene.remove(flashMesh);
                    scene.remove(flashLight);
                }
            }

            // Fireball expands and fades
            if (fireball.parent) {
                fireball.scale.multiplyScalar(1 + dt * 3);
                fireballMat.opacity -= dt * 2.5;
                if (fireballMat.opacity <= 0) scene.remove(fireball);
            }
            if (core.parent) {
                core.scale.multiplyScalar(1 + dt * 2);
                coreMat.opacity -= dt * 3;
                if (coreMat.opacity <= 0) scene.remove(core);
            }

            // Shockwave ring expands rapidly
            if (ring.parent) {
                ring.scale.multiplyScalar(1 + dt * 16);
                ringMat.opacity -= dt * 3;
                if (ringMat.opacity <= 0) scene.remove(ring);
            }

            // Debris flies outward and falls
            for (let i = debrisParts.length - 1; i >= 0; i--) {
                const d = debrisParts[i];
                d.life -= dt;
                d.velocity.y -= 9.8 * dt; // gravity
                d.mesh.position.addScaledVector(d.velocity, dt);
                d.mesh.rotation.x += dt * 5;
                d.mesh.rotation.z += dt * 3;
                d.mesh.material.opacity = Math.max(0, d.life / 1.4);
                if (d.life <= 0 || d.mesh.position.y < 0) {
                    scene.remove(d.mesh);
                    debrisParts.splice(i, 1);
                }
            }

            // Embers float up
            for (let i = embers.length - 1; i >= 0; i--) {
                const e = embers[i];
                e.life -= dt;
                e.velocity.y -= 2 * dt;
                e.mesh.position.addScaledVector(e.velocity, dt);
                e.mesh.material.opacity = Math.max(0, e.life / 2.0);
                if (e.life <= 0) {
                    scene.remove(e.mesh);
                    embers.splice(i, 1);
                }
            }

            // Smoke drifts up and fades
            for (let i = smokeParticles.length - 1; i >= 0; i--) {
                const s = smokeParticles[i];
                s.life -= dt;
                s.mesh.position.addScaledVector(s.drift, dt);
                s.mesh.scale.multiplyScalar(1 + dt * 0.8);
                s.mesh.material.opacity = Math.max(0, s.life / 2.5) * 0.4;
                if (s.life <= 0) {
                    scene.remove(s.mesh);
                    smokeParticles.splice(i, 1);
                }
            }

            // Continue animating if anything is still alive
            if (debrisParts.length > 0 || embers.length > 0 || smokeParticles.length > 0 ||
                flashMesh.parent || fireball.parent || core.parent || ring.parent) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);

        // Cleanup physics and grenade mesh
        this.scene.remove(this.mesh);
        this.world.removeBody(this.body);

        // Only calculate and emit damage if WE threw this grenade
        if (this.isLocal && this.onExplode) {
            this.onExplode(pos);
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
