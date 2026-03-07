const GAME_CONSTANTS = {
    TICK_RATE: 20, // 20 updates per second as requested
    MAX_PLAYERS_PER_ROOM: 10,
    PLAYER_SPEED: 15,
    SPRINT_SPEED: 25,
    JUMP_VELOCITY: 8,
    GRAVITY: -9.81,
    WEAPONS: {
        RIFLE: {
            damage: 25,
            headshotMultiplier: 2,
            fireRateRPM: 600,
            magazine: 30,
            reloadTimeSec: 2
        }
    }
};

module.exports = { GAME_CONSTANTS };
