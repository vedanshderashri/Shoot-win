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
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
        this.scene.add(ambientLight);

        // Soft hemisphere light for smooth ambient fill
        const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x3a2a1a, 0.6);
        this.scene.add(hemiLight);

        // Warm desert sun
        const dirLight = new THREE.DirectionalLight(0xffeedd, 2.2);
        dirLight.position.set(50, 100, 50);
        dirLight.castShadow = true;

        // Higher resolution shadows for smoother edges
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 200;
        dirLight.shadow.camera.left = -60;
        dirLight.shadow.camera.right = 60;
        dirLight.shadow.camera.top = 60;
        dirLight.shadow.camera.bottom = -60;

        // Soft shadow blur (works with VSMShadowMap)
        dirLight.shadow.radius = 4;
        dirLight.shadow.blurSamples = 16;
        dirLight.shadow.bias = -0.0005;

        this.scene.add(dirLight);
    }
}

export default new SceneManager();
