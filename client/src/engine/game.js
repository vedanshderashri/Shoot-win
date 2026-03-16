import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { io } from 'socket.io-client';
import PlayerModel from '../player/playerModel';
import WeaponSystem from '../weapons/weaponSystem';
import sceneManager from './scene';
import cameraManager from './camera';
import rendererManager from './renderer';
import gameLoop from './gameLoop';
import { buildWarzoneMap, AmbientWarAudio } from '../maps/warzoneMap';
import { buildAdvancedMap } from '../maps/desertMap';
import { buildCQBMap } from '../maps/cqbMap';
import { buildArcticMap } from '../maps/arcticMap';
import Soldier from '../player/character';

class GameEngine {
    constructor() {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const serverUrl = isLocal
            ? 'http://127.0.0.1:3000' // Use IP instead of 'localhost' to avoid DNS resolution delays
            : 'https://warzone-battlefield.onrender.com';

        console.log(`[Network] Establishing high-speed link to: ${serverUrl}`);
        this.socket = io(serverUrl, {
            transports: ['polling', 'websocket'], // Polling first is more robust for initial handshake
            reconnectionAttempts: 10,
            timeout: 5000,
            forceNew: true,
            autoConnect: true
        });

        this.socket.on('connect', () => {
            console.log(`[Network] Link established. SID: ${this.socket.id}`);
            this.isInitialized = true;
        });
        this.socket.on('connect_error', (err) => console.error(`[Network] Connection failed:`, err));

        this.players = {};
        this.isInitialized = false;
    }

    init(container, roomCode, callbacks) {
        this.container = container;
        this.roomCode = roomCode;
        this.callbacks = callbacks;
        this.isInitialized = true;

        // Use Modular Engines
        this.scene = sceneManager.scene;
        this.world = sceneManager.world;
        this.physicsMaterial = sceneManager.physicsMaterial;

        this.camera = cameraManager.camera;

        rendererManager.attach(this.container);

        this.clock = new THREE.Clock();

        // ── Random Map Selection ──
        const maps = ['warzone', 'desert', 'cqb', 'arctic'];
        const selectedMap = maps[Math.floor(Math.random() * maps.length)];
        console.log(`[Map] Loading map: ${selectedMap.toUpperCase()}`);

        this.animateMap = null; // Generic map animate function
        switch (selectedMap) {
            case 'warzone': {
                const { animateWarzone } = buildWarzoneMap(this.scene, this.world, this.physicsMaterial);
                this.animateMap = animateWarzone;
                break;
            }
            case 'desert': {
                const { animateDesert } = buildAdvancedMap(this.scene, this.world, this.physicsMaterial);
                this.animateMap = animateDesert;
                break;
            }
            case 'cqb': {
                const { animateCQB } = buildCQBMap(this.scene, this.world, this.physicsMaterial);
                this.animateMap = animateCQB;
                break;
            }
            case 'arctic': {
                const { animateArctic } = buildArcticMap(this.scene, this.world, this.physicsMaterial);
                this.animateMap = animateArctic;
                break;
            }
        }

        // Start ambient war audio (requires user interaction first — deferred to resume)
        this.ambientAudio = new AmbientWarAudio();
        const startAudio = () => { this.ambientAudio.start(); document.removeEventListener('click', startAudio); };
        document.addEventListener('click', startAudio);

        // Setup Local Player
        this.localPlayer = new PlayerModel(this.scene, this.camera, this.world, this.physicsMaterial, this.callbacks.onStaminaChange);

        // Setup Weapon System
        this.weaponSystem = new WeaponSystem(this.scene, this.camera, this.socket, this.callbacks.onAmmoChange, this.callbacks.onHitmarker, this.callbacks.onGrenadeChange);

        this.setupNetworkEvents();

        // Pointer Lock on click
        this.container.addEventListener('click', () => {
            if (document.pointerLockElement !== this.container) {
                this.container.requestPointerLock();
            }
        });

        // Start Loop
        window.gameEngine = this;
        gameLoop.start(this.localPlayer, this.weaponSystem, this.socket);
    }

    setupNetworkEvents() {
        if (!this.socket) return;

        // Remove any existing listeners to prevent duplicates if init is called multiple times
        this.socket.off('room_joined');
        this.socket.off('room_created');
        this.socket.off('player_joined');
        this.socket.off('player_moved');
        this.socket.off('player_left');
        this.socket.off('player_health_changed');
        this.socket.off('player_died');
        this.socket.off('scores_update');
        this.socket.off('sync_state');
        this.socket.off('player_throw_grenade');
        this.socket.off('game_over');

        // Listen for room join confirmation
        this.socket.on('room_joined', (data) => {
            console.log(`Joined room ${data.code}`);
            for (let id in data.players) {
                if (id !== this.socket.id) {
                    this.addRemotePlayer(data.players[id]);
                }
            }
        });

        this.socket.on('room_created', (data) => {
            console.log(`Created room ${data.code}`);
        });

        this.socket.on('player_joined', (playerData) => {
            this.addRemotePlayer(playerData);
            if (this.callbacks.onKillFeed) {
                this.callbacks.onKillFeed(`${playerData.name} joined the game`);
            }
        });

        this.socket.on('player_moved', (data) => {
            if (this.players[data.id] && this.players[data.id].character) {
                const p = this.players[data.id];
                p.character.updatePosition(data.x, data.y, data.z, data.rotation);
                p.lastMoveTime = performance.now();
                p.isMoving = true;
            }
        });

        this.socket.on('player_left', (id) => {
            if (this.players[id]) {
                if (this.players[id].character) {
                    this.players[id].character.cleanup();
                }
                const name = this.players[id].name || 'A player';
                delete this.players[id];
                if (this.callbacks.onKillFeed) {
                    this.callbacks.onKillFeed(`${name} left the game`);
                }
            }
        });

        this.socket.on('player_health_changed', (data) => {
            if (data.id === this.socket.id && this.callbacks.onHealthChange) {
                this.callbacks.onHealthChange(data.hp);
            }
        });

        this.socket.on('player_died', (data) => {
            if (this.callbacks.onKillFeed) {
                this.callbacks.onKillFeed(`${data.killerName} killed ${data.victimName}`);
            }

            if (data.id === this.socket.id && this.callbacks.onDeath) {
                this.callbacks.onDeath();
                if (this.localPlayer) {
                    this.localPlayer.die();
                }
            } else if (data.killerId === this.socket.id && this.callbacks.onKill) {
                this.callbacks.onKill();
            } else {
                if (this.players[data.id] && this.players[data.id].character) {
                    this.players[data.id].character.setVisible(false);
                }
            }
        });

        this.socket.on('scores_update', (scores) => {
            if (this.callbacks.onScoresUpdate) {
                this.callbacks.onScoresUpdate(scores);
            }
        });

        this.socket.on('sync_state', (players) => {
            for (let id in players) {
                if (id === this.socket.id) continue;
                const p = players[id];
                if (this.players[id] && this.players[id].character) {
                    this.players[id].character.updatePosition(p.x, p.y, p.z, p.rotation);
                    this.players[id].character.setVisible(!p.isDead);
                } else if (!this.players[id]) {
                    this.addRemotePlayer(p);
                }
            }
        });

        this.socket.on('player_throw_grenade', (data) => {
            if (this.weaponSystem) {
                this.weaponSystem.syncRemoteGrenade(data);
            }
        });

        this.socket.on('game_over', (data) => {
            if (this.callbacks.onGameOver) {
                this.callbacks.onGameOver(data);
            }
        });
    } update(dt) {
        const now = performance.now();
        for (let id in this.players) {
            const p = this.players[id];
            if (p.character) {
                if (now - p.lastMoveTime > 100) p.isMoving = false;
                p.character.animate(p.isMoving, dt);
            }
        }
        // Animate map effects (fire, smoke, dust, snow, etc.)
        if (this.animateMap) this.animateMap(dt);
    }

    joinRoom(code, name) {
        this.socket.emit('join_room', { code, name });
    }

    createRoom(name) {
        return new Promise((resolve, reject) => {
            if (!this.socket.connected) {
                reject(new Error('Socket not connected'));
                return;
            }

            const timeout = setTimeout(() => {
                reject(new Error('Connection timed out. Please try again.'));
            }, 10000);

            this.socket.emit('create_room', { name });
            this.socket.once('room_created', (data) => {
                clearTimeout(timeout);
                resolve(data.code);
            });
        });
    }

    getSocket() {
        return this.socket;
    }

    addRemotePlayer(data) {
        if (this.players[data.id]) return; // Already exists

        const soldier = new Soldier(this.scene);
        soldier.updatePosition(data.x, data.y, data.z, data.rotation);

        // Add metadata for raycasting
        soldier.group.traverse(child => {
            if (child.isMesh) {
                child.userData.isPlayer = true;
                child.userData.id = data.id;
            }
        });

        this.players[data.id] = {
            id: data.id,
            character: soldier,
            name: data.name,
            isMoving: false,
            lastMoveTime: 0
        };
    }

    cleanup() {
        gameLoop.stop();
        if (this.socket) this.socket.disconnect();
        if (this.container) {
            rendererManager.detach(this.container);
        }
    }
}

export default new GameEngine();
