export default class Controls {
    constructor(yawObject, pitchObject, body) {
        this.yawObject = yawObject;
        this.pitchObject = pitchObject;
        this.body = body;

        this.keys = { w: false, a: false, s: false, d: false, space: false, shift: false, crouch: false };
        this.canJump = false;

        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.onKeyDown(e), false);
        document.addEventListener('keyup', (e) => this.onKeyUp(e), false);
        document.addEventListener('mousemove', (e) => this.onMouseMove(e), false);
    }

    onKeyDown(event) {
        switch (event.code) {
            case 'KeyW': this.keys.w = true; break;
            case 'KeyA': this.keys.a = true; break;
            case 'KeyS': this.keys.s = true; break;
            case 'KeyD': this.keys.d = true; break;
            case 'Space': this.keys.space = true; break;
            case 'ShiftLeft':
            case 'ShiftRight': this.keys.shift = true; break;
            case 'ControlLeft':
            case 'ControlRight': this.keys.crouch = true; break;
        }
    }

    onKeyUp(event) {
        switch (event.code) {
            case 'KeyW': this.keys.w = false; break;
            case 'KeyA': this.keys.a = false; break;
            case 'KeyS': this.keys.s = false; break;
            case 'KeyD': this.keys.d = false; break;
            case 'Space': this.keys.space = false; break;
            case 'ShiftLeft':
            case 'ShiftRight': this.keys.shift = false; break;
            case 'ControlLeft':
            case 'ControlRight': this.keys.crouch = false; break;
        }
    }

    onMouseMove(event) {
        // Accept pointer lock on any element (game container or body)
        if (!document.pointerLockElement) return;

        this.yawObject.rotation.y -= (event.movementX || 0) * 0.002;
        this.pitchObject.rotation.x -= (event.movementY || 0) * 0.002;
        this.pitchObject.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitchObject.rotation.x));
    }
}
