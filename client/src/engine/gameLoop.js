import * as THREE from 'three';
import rendererManager from './renderer';
import cameraManager from './camera';
import sceneManager from './scene';

class GameLoop {
    constructor() {
        this.clock = new THREE.Clock();
        this.isRunning = false;
        this.entities = {
            localPlayer: null,
            weaponSystem: null,
            socket: null
        };
    }

    start(localPlayer, weaponSystem, socket) {
        this.entities.localPlayer = localPlayer;
        this.entities.weaponSystem = weaponSystem;
        this.entities.socket = socket;
        this.isRunning = true;
        this.loop();
    }

    stop() {
        this.isRunning = false;
    }

    loop() {
        if (!this.isRunning) return;
        requestAnimationFrame(this.loop.bind(this));

        const delta = this.clock.getDelta();

        this.physics(delta);
        this.update(delta);
        this.networkSync();
        this.render();
    }

    physics(delta) {
        // Step Physics world
        sceneManager.world.step(1 / 60, delta, 3);
    }

    update(delta) {
        if (this.entities.localPlayer) {
            this.entities.localPlayer.update(delta);
        }
        if (this.entities.weaponSystem) {
            this.entities.weaponSystem.update(delta, this.entities.localPlayer?.isDead || false);
        }

        // Import gameEngine dynamically to avoid circular dependency if needed, 
        // but here we can just import it at top if we want. 
        // For now, let's assume gameEngine is available or we add it to entities.
        if (window.gameEngine) {
            window.gameEngine.update(delta);
        }
    }

    networkSync() {
        const lp = this.entities.localPlayer;
        if (lp && lp.hasMoved()) {
            const pos = lp.getPosition();
            const rot = lp.getRotation();
            this.entities.socket.emit('player_move', {
                x: pos.x, y: pos.y, z: pos.z, rotation: rot
            });
        }
    }

    render() {
        rendererManager.render(sceneManager.scene, cameraManager.camera);
    }
}

export default new GameLoop();
