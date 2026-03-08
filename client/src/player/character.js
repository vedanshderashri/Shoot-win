import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export default class Soldier {
    constructor(scene) {
        this.group = new THREE.Group();
        this.scene = scene;
        this.scene.add(this.group);

        // A hidden hitbox for raycasting compat (headshots check localHit.y > 0.6)
        // By using this hitbox, we ensure game.js can synchronously assign userData.id
        // and rifle raycasting hits something predictable regardless of GLTF bones.
        this.hitbox = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 2.0, 0.8),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        this.hitbox.position.y = -0.6; // Center is at world ~1.0, top is ~2.0, bottom is ~0.0
        // with group roughly at 1.6 (camera height).
        // Hitbox local Y goes from -1.0 to 1.0. A headshot is > 0.6,
        // which corresponds to the top 40cm of the box (from 1.6 to 2.0 meters high).
        this.group.add(this.hitbox);

        this.mixer = null;
        this.idleAction = null;
        this.walkAction = null;
        this.currentAction = null;
        this.isLoaded = false;

        this.loadModel();
    }

    loadModel() {
        const loader = new GLTFLoader();
        loader.load('/models/Soldier.glb', (gltf) => {
            this.model = gltf.scene;

            // Soldier.glb might be slightly small or large, scaling it to fit a 2.0m tall box
            // Typically Soldier.glb is about 1.6m tall at scale 1, let's make it 1.2 scale to match 2m
            this.model.scale.set(1.1, 1.1, 1.1);

            // Since the group's Y-position corresponds to camera eye-level (~1.6),
            // we offset the visual model by -1.6 to plant its feet perfectly at world Y=0.
            this.model.position.y = -1.6;

            this.model.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    // Disable raycasting on visual model to force hitting only the hitbox
                    child.raycast = () => { };
                }
            });

            this.group.add(this.model);

            // Set up animations
            this.mixer = new THREE.AnimationMixer(this.model);
            const animations = gltf.animations;

            const idleClip = THREE.AnimationClip.findByName(animations, 'Idle');
            const walkClip = THREE.AnimationClip.findByName(animations, 'Walk');

            if (idleClip && walkClip) {
                this.idleAction = this.mixer.clipAction(idleClip);
                this.walkAction = this.mixer.clipAction(walkClip);

                // Start with idle
                this.idleAction.play();
                this.currentAction = this.idleAction;
            }

            // Create a procedural weapon and attach it to the right hand
            this.attachWeapon();

            this.isLoaded = true;
        }, undefined, (error) => {
            console.error('Error loading Soldier.glb:', error);
        });
    }

    attachWeapon() {
        const gunMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.6 });

        this.weaponGroup = new THREE.Group();

        // Receiver
        const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.10, 0.44), gunMat);
        this.weaponGroup.add(receiver);

        // Barrel
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.32), gunMat);
        barrel.position.set(0, 0.015, 0.38);
        receiver.add(barrel);

        // Magazine
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.08), gunMat);
        mag.position.set(0, -0.14, 0.02);
        receiver.add(mag);

        // Find RightHand bone
        let rightHand = null;
        this.model.traverse(child => {
            if (child.isBone && child.name === 'mixamorigRightHand') {
                rightHand = child;
            }
        });

        if (rightHand) {
            rightHand.add(this.weaponGroup);
            // Adjust weapon position relative to hand
            this.weaponGroup.position.set(0, 0.1, 0);
            this.weaponGroup.rotation.x = Math.PI / 2;
            this.weaponGroup.rotation.y = -Math.PI / 2;
        } else {
            // Fallback if bone names differ
            this.model.add(this.weaponGroup);
        }
    }

    animate(isMoving, dt) {
        if (!this.isLoaded || !this.mixer) return;

        this.mixer.update(dt);

        const targetAction = isMoving ? this.walkAction : this.idleAction;

        if (this.currentAction !== targetAction && targetAction) {
            // Crossfade to new action
            targetAction.reset().fadeIn(0.2).play();
            if (this.currentAction) {
                this.currentAction.fadeOut(0.2);
            }
            this.currentAction = targetAction;
        }
    }

    updatePosition(x, y, z, rotation) {
        this.group.position.set(x, y, z);
        this.group.rotation.y = rotation;
    }

    setVisible(visible) {
        this.group.visible = visible;
    }

    cleanup() {
        this.scene.remove(this.group);
    }
}
