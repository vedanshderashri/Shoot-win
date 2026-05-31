import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export default class Soldier {
    constructor(scene) {
        this.group = new THREE.Group();
        this.scene = scene;
        this.scene.add(this.group);

        // Network movement interpolation properties
        this.targetPosition = new THREE.Vector3();
        this.targetRotation = 0;
        this.hasInitializedPositions = false;
        this.muzzleFlash = null;
        this.lastFrameY = 0;

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

            // Find shoulder and arm bones for procedural arm adjustments
            this.rightShoulder = null;
            this.leftShoulder = null;
            this.rightArm = null;
            this.leftArm = null;
            this.model.traverse(child => {
                if (child.isBone) {
                    const name = child.name.toLowerCase();
                    if (name.includes('rightshoulder') || name.includes('r_shoulder')) this.rightShoulder = child;
                    if (name.includes('leftshoulder') || name.includes('l_shoulder')) this.leftShoulder = child;
                    if (name.includes('rightarm') || name.includes('r_arm') || (name.includes('shoulder') && name.includes('right'))) this.rightArm = child;
                    if (name.includes('leftarm') || name.includes('l_arm') || (name.includes('shoulder') && name.includes('left'))) this.leftArm = child;
                }
            });

            // Create procedural weapons and attach them to the right hand
            this.attachWeapon();

            this.isLoaded = true;
        }, undefined, (error) => {
            console.error('Error loading Soldier.glb:', error);
        });
    }

    createTPPRifle() {
        const rifleGroup = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x1E2922, metalness: 0.6, roughness: 0.3 }); // Military olive
        const partsMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.7, roughness: 0.5 });

        // Receiver
        const rc = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.35), mat);
        rc.position.set(0, 0, 0);
        rifleGroup.add(rc);

        // Barrel
        const br = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3), partsMat);
        br.rotation.x = Math.PI / 2;
        br.position.set(0, 0.01, -0.325);
        rc.add(br);

        // Magazine
        const mg = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.16, 0.06), partsMat);
        mg.rotation.x = 0.15;
        mg.position.set(0, -0.11, -0.08);
        rc.add(mg);

        // Stock
        const st = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.09, 0.18), partsMat);
        st.position.set(0, -0.01, 0.26);
        rc.add(st);

        // Scope
        const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12), partsMat);
        sc.rotation.x = Math.PI / 2;
        sc.position.set(0, 0.06, -0.05);
        rc.add(sc);

        return rifleGroup;
    }

    createTPPSniper() {
        const sniperGroup = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, metalness: 0.8, roughness: 0.1 }); // Steel black
        const partsMat = new THREE.MeshStandardMaterial({ color: 0x4B5320, roughness: 0.95 }); // Olive green chassis details

        // Heavy chassis
        const rc = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.1, 0.45), partsMat);
        rc.position.set(0, 0, 0);
        sniperGroup.add(rc);

        // Long heavy steel barrel
        const br = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.55), mat);
        br.rotation.x = Math.PI / 2;
        br.position.set(0, 0.02, -0.5);
        rc.add(br);

        // Huge scope
        const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.18), mat);
        sc.rotation.x = Math.PI / 2;
        sc.position.set(0, 0.085, -0.05);
        rc.add(sc);

        // Huge magazine
        const mg = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.22, 0.08), mat);
        mg.position.set(0, -0.15, -0.02);
        rc.add(mg);

        // Heavy Stock
        const st = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.12, 0.25), partsMat);
        st.position.set(0, -0.02, 0.35);
        rc.add(st);

        return sniperGroup;
    }

    attachWeapon() {
        // Find RightHand bone - expanded search criteria
        let rightHand = null;
        this.model.traverse(child => {
            if (child.isBone) {
                const name = child.name.toLowerCase();
                const isRight = name.includes('right') || name.includes('_r') || name.includes('.r');
                const isHand = name.includes('hand') || name.includes('wrist') || name.includes('palm') || name.includes('arm');

                if (isRight && isHand && !rightHand) {
                    rightHand = child;
                }
            }
        });

        // 1. Build TPP Rifle Group
        this.tppRifle = this.createTPPRifle();
        this.tppRifle.traverse(c => {
            if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
        });

        // 2. Build TPP Sniper Group
        this.tppSniper = this.createTPPSniper();
        this.tppSniper.traverse(c => {
            if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
        });

        // Visible weapon status tracks
        this.activeWeaponName = 'Rifle';
        this.currentRifleScale = 1.0;
        this.currentSniperScale = 0.0;
        this.tppRecoilOffset = 0.0;

        // Aiming, reloading states
        this.tppIsAiming = false;
        this.tppIsReloading = false;

        // Default weapon visible scales
        this.tppRifle.scale.set(1, 1, 1);
        this.tppSniper.scale.set(0, 0, 0);

        if (rightHand) {
            rightHand.add(this.tppRifle);
            rightHand.add(this.tppSniper);

            // Positioning relative to rightHand
            this.tppRifle.position.set(0, 0.2, 0);
            this.tppRifle.rotation.set(Math.PI / 2, -Math.PI / 2, 0);

            this.tppSniper.position.set(-0.02, 0.25, -0.05);
            this.tppSniper.rotation.set(Math.PI / 1.8, -Math.PI / 2, 0.1);
        } else {
            // Fallback: Attach to model root
            this.model.add(this.tppRifle);
            this.model.add(this.tppSniper);

            this.tppRifle.position.set(0.4, 1.2, 0.5);
            this.tppRifle.rotation.set(0, Math.PI, 0);

            this.tppSniper.position.set(0.4, 1.2, 0.5);
            this.tppSniper.rotation.set(0, Math.PI, 0);
        }
    }

    setEquippedWeapon(weaponName) {
        if (!this.isLoaded) return;
        this.activeWeaponName = weaponName;
    }

    setAiming(isAiming) {
        if (!this.isLoaded) return;
        this.tppIsAiming = isAiming;
    }

    setReloading(isReloading) {
        if (!this.isLoaded) return;
        this.tppIsReloading = isReloading;
    }

    animate(isMoving, dt) {
        if (!this.isLoaded || !this.mixer) return;

        this.mixer.update(dt);

        // Interpolate position
        this.group.position.lerp(this.targetPosition, dt * 15);

        // Interpolate rotation with angular wrapping to prevent full spins
        let diff = this.targetRotation - this.group.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        this.group.rotation.y += diff * dt * 15;

        // Calculate visual Y velocity to trigger procedural jump lean/bobs
        const yVelocity = dt > 0 ? (this.group.position.y - this.lastFrameY) / dt : 0;
        this.lastFrameY = this.group.position.y;

        let targetModelY = -1.6;
        let targetModelRotX = 0;

        if (Math.abs(yVelocity) > 0.45) {
            // Ascending or descending in the air (jumping)
            targetModelY = -1.45; // Pull legs up slightly
            targetModelRotX = yVelocity > 0 ? -0.15 : 0.1; // Lean forward when rising, lean back when falling
        }

        // Smoothly lerp model Y offset and tilt
        if (this.model) {
            this.model.position.y = THREE.MathUtils.lerp(this.model.position.y, targetModelY, dt * 12);
            this.model.rotation.x = THREE.MathUtils.lerp(this.model.rotation.x, targetModelRotX, dt * 12);
        }

        // Decay muzzle flash if alive
        if (this.muzzleFlash && this.muzzleFlash.intensity > 0) {
            this.muzzleFlash.intensity = Math.max(0, this.muzzleFlash.intensity - dt * 40);
        }

        // Animate visual weapon switches (lerp weapon scales)
        const targetRifleScale = this.activeWeaponName === 'Rifle' ? 1.0 : 0.0;
        const targetSniperScale = this.activeWeaponName === 'Sniper' ? 1.0 : 0.0;

        this.currentRifleScale = THREE.MathUtils.lerp(this.currentRifleScale || 0, targetRifleScale, dt * 12);
        this.currentSniperScale = THREE.MathUtils.lerp(this.currentSniperScale || 0, targetSniperScale, dt * 12);

        if (this.tppRifle) {
            this.tppRifle.scale.set(this.currentRifleScale, this.currentRifleScale, this.currentRifleScale);
        }
        if (this.tppSniper) {
            this.tppSniper.scale.set(this.currentSniperScale, this.currentSniperScale, this.currentSniperScale);
        }

        // Decay recoil kickback inside right hand
        this.tppRecoilOffset = THREE.MathUtils.lerp(this.tppRecoilOffset || 0, 0, dt * 15);
        if (this.tppRifle) {
            this.tppRifle.position.z = 0.2 + this.tppRecoilOffset; // base z is 0.2
        }
        if (this.tppSniper) {
            this.tppSniper.position.z = -0.05 + this.tppRecoilOffset; // base z is -0.05
        }

        // Procedural holding poses
        let targetRightArmRotX = 0;
        let targetLeftArmRotX = 0;

        if (this.activeWeaponName) {
            if (this.tppIsAiming) {
                // Raise weapon forward and upward to aim down sights in TPP
                targetRightArmRotX = -1.1;
                targetLeftArmRotX = -0.9;
            } else if (this.tppIsReloading) {
                // Dip weapon downward to chest height for reload animation
                targetRightArmRotX = 0.2;
                targetLeftArmRotX = 0.4;
            } else if (this.activeWeaponName === 'Rifle') {
                targetRightArmRotX = -0.35;
                targetLeftArmRotX = -0.2;
            } else if (this.activeWeaponName === 'Sniper') {
                targetRightArmRotX = -0.55;
                targetLeftArmRotX = -0.4;
            }
        }

        // Breathing sway
        const breathingOffset = Math.sin(performance.now() / 600) * 0.035;
        if (this.activeWeaponName && !this.tppIsAiming && !this.tppIsReloading) {
            targetRightArmRotX += breathingOffset;
        }

        // Smooth bone rotation injection
        if (this.rightArm) {
            this.rightArm.rotation.x = THREE.MathUtils.lerp(this.rightArm.rotation.x, targetRightArmRotX, dt * 10);
        }
        if (this.leftArm) {
            this.leftArm.rotation.x = THREE.MathUtils.lerp(this.leftArm.rotation.x, targetLeftArmRotX, dt * 10);
        }

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

    triggerMuzzleFlash() {
        if (!this.isLoaded) return;

        const activeWeapon = this.activeWeaponName === 'Rifle' ? this.tppRifle : this.tppSniper;
        if (!activeWeapon) return;

        if (!this.muzzleFlash) {
            this.muzzleFlash = new THREE.PointLight(0xff9900, 0, 8);
            this.scene.add(this.muzzleFlash);
        }

        const worldPos = new THREE.Vector3();
        if (this.activeWeaponName === 'Rifle') {
            const muzzle = new THREE.Object3D();
            muzzle.position.set(0, 0.01, -0.5);
            activeWeapon.add(muzzle);
            muzzle.getWorldPosition(worldPos);
            activeWeapon.remove(muzzle);
        } else {
            const muzzle = new THREE.Object3D();
            muzzle.position.set(0, 0.02, -0.8);
            activeWeapon.add(muzzle);
            muzzle.getWorldPosition(worldPos);
            activeWeapon.remove(muzzle);
        }

        this.muzzleFlash.position.copy(worldPos);
        this.muzzleFlash.intensity = 5;

        // Physical weapon kickback reaction
        this.tppRecoilOffset = 0.08;
    }

    updatePosition(x, y, z, rotation) {
        if (!this.hasInitializedPositions) {
            this.group.position.set(x, y, z);
            this.group.rotation.y = rotation;
            this.targetPosition.copy(this.group.position);
            this.targetRotation = rotation;
            this.lastFrameY = y;
            this.hasInitializedPositions = true;
            return;
        }
        this.targetPosition.set(x, y, z);
        this.targetRotation = rotation;
    }

    setVisible(visible) {
        this.group.visible = visible;
    }

    cleanup() {
        if (this.muzzleFlash && this.muzzleFlash.parent) {
            this.muzzleFlash.parent.remove(this.muzzleFlash);
        }
        if (this.tppRifle && this.tppRifle.parent) this.tppRifle.parent.remove(this.tppRifle);
        if (this.tppSniper && this.tppSniper.parent) this.tppSniper.parent.remove(this.tppSniper);
        this.scene.remove(this.group);
    }
}
