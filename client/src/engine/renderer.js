import * as THREE from 'three';
import cameraManager from './camera';

// Detect mobile for performance scaling
const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || ('ontouchstart' in window && window.innerWidth < 1024);

class RendererManager {
    constructor() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: isMobile ? "default" : "high-performance",
            alpha: false,
            stencil: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        // Smooth graphics: higher pixel ratio (was capped at 1.0)
        const maxRatio = isMobile ? 1.5 : 2.0;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxRatio));

        // Tone mapping for cinematic, smooth color transitions
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        // Soft shadow mapping
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.VSMShadowMap;

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
