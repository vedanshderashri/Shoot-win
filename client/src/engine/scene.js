import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { buildAdvancedMap } from '../maps/desertMap';

class SceneManager {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Bright desert sky blue
        this.scene.fog = new THREE.Fog(0xd2b48c, 80, 400); // Linear fog, starts far

        // Physics Setup
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0);

        this.physicsMaterial = new CANNON.Material("standard");
        const physicsContactMaterial = new CANNON.ContactMaterial(
            this.physicsMaterial,
            this.physicsMaterial,
            { friction: 0.1, restitution: 0.0 }
        );
        this.world.addContactMaterial(physicsContactMaterial);

        this.setupLighting();
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
        this.scene.add(ambientLight);

        // Warm desert sun
        const dirLight = new THREE.DirectionalLight(0xffeedd, 2.5);
        dirLight.position.set(50, 100, 50);
        dirLight.castShadow = true;
        // Optimization for shadows
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 150;
        dirLight.shadow.camera.left = -50;
        dirLight.shadow.camera.right = 50;
        dirLight.shadow.camera.top = 50;
        dirLight.shadow.camera.bottom = -50;
        this.scene.add(dirLight);
    }
}

export default new SceneManager();
