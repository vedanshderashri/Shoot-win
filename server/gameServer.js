const playerManager = require('./playerManager');
const { GAME_CONSTANTS } = require('../shared/constants');

const TICK_RATE = GAME_CONSTANTS.TICK_RATE; // 20 updates per second
const TICK_INTERVAL = 1000 / TICK_RATE;

class GameServer {
    constructor() {
        this.intervalId = null;
        this.lastTick = Date.now();
    }

    startLoop() {
        console.log(`Starting game loop at ${TICK_RATE} ticks per second.`);
        this.intervalId = setInterval(() => {
            this.tick();
        }, TICK_INTERVAL);
    }

    stopLoop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    tick() {
        const now = Date.now();
        const dt = (now - this.lastTick) / 1000;
        this.lastTick = now;

        const physics = require('./physics');
        physics.update(dt);

        // Process game logic here (respawns, environment updates if needed)
        playerManager.update(dt);
    }
}

module.exports = new GameServer();
