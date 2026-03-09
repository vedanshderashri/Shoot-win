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
        // Find RightHand bone - expanded search criteria
        let rightHand = null;
        this.model.traverse(child => {
            if (child.isBone) {
                const name = child.name.toLowerCase();
                // Match "right" and ("hand", "wrist", "palm", "arm", or naming suffixes like .r or _r)
                const isRight = name.includes('right') || name.includes('_r') || name.includes('.r');
                const isHand = name.includes('hand') || name.includes('wrist') || name.includes('palm') || name.includes('arm');

                if (isRight && isHand && !rightHand) {
                    rightHand = child;
                }
            }
        });

        const gunMat = new THREE.MeshStandardMaterial({
            color: 0x333333, // Slightly lighter than before
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0x111111 // Add a tiny bit of emissive to prevent total pitch blackness
        });

        this.weaponGroup = new THREE.Group();

        // Receiver
        const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, 0.5), gunMat);
        this.weaponGroup.add(receiver);

        // Barrel
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4), gunMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.03, 0.45);
        receiver.add(barrel);

        // Magazine
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.25, 0.1), gunMat);
        mag.position.set(0, -0.2, 0.05);
        receiver.add(mag);

        // Scope (simplified for opponent)
        const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.15), gunMat);
        scope.rotation.x = Math.PI / 2;
        scope.position.set(0, 0.12, 0);
        receiver.add(scope);

        // Enable shadows for all weapon parts
        this.weaponGroup.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        if (rightHand) {
            rightHand.add(this.weaponGroup);
            // Mixamo models usually need this offset
            this.weaponGroup.position.set(0, 0.2, 0);
            this.weaponGroup.rotation.set(Math.PI / 2, -Math.PI / 2, 0);
            this.weaponGroup.scale.set(1, 1, 1);
        } else {
            // Fallback: Attach to model root at chest height, slightly to the right
            this.model.add(this.weaponGroup);
            this.weaponGroup.position.set(0.4, 1.2, 0.5);
            this.weaponGroup.rotation.y = Math.PI; // Point forward
            this.weaponGroup.scale.set(1.2, 1.2, 1.2); // Make it slightly bigger to be sure
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
