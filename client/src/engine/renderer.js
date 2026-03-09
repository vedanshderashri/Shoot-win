import * as THREE from 'three';
import cameraManager from './camera';

class RendererManager {
    constructor() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    onWindowResize() {
        cameraManager.resize(window.innerWidth, window.innerHeight);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    attach(container) {
        container.appendChild(this.renderer.domElement);
    }

    detach(container) {
        if (container.contains(this.renderer.domElement)) {
            container.removeChild(this.renderer.domElement);
        }
    }

    render(scene, camera) {
        this.renderer.render(scene, camera);
    }
}

export default new RendererManager();
