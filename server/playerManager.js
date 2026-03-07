class PlayerManager {
    constructor() {
        this.players = {};
        this.MAX_HP = 100;
        this.RESPAWN_TIME = 3000;
    }

    addPlayer(id, name, roomCode) {
        this.players[id] = {
            id,
            name,
            roomCode,
            x: (Math.random() - 0.5) * 80,
            y: 2,
            z: (Math.random() - 0.5) * 80,
            rotation: 0,
            hp: this.MAX_HP,
            isDead: false,
            kills: 0,
            deaths: 0,
            lastDeathTime: null
        };
        return this.players[id];
    }

    removePlayer(id) {
        delete this.players[id];
    }

    getPlayer(id) {
        return this.players[id];
    }

    getAllPlayers() {
        return this.players;
    }

    getPlayersInRoom(roomCode) {
        const result = {};
        for (const id in this.players) {
            if (this.players[id].roomCode === roomCode) {
                result[id] = this.players[id];
            }
        }
        return result;
    }

    getScoresInRoom(roomCode) {
        const scores = [];
        for (const id in this.players) {
            const p = this.players[id];
            if (p.roomCode === roomCode) {
                scores.push({
                    id: p.id,
                    name: p.name,
                    kills: p.kills,
                    deaths: p.deaths
                });
            }
        }
        // Sort by kills descending
        scores.sort((a, b) => b.kills - a.kills);
        return scores;
    }

    updatePlayerState(id, data) {
        const p = this.players[id];
        if (p && !p.isDead) {
            if (data.x !== undefined) p.x = data.x;
            if (data.y !== undefined) p.y = data.y;
            if (data.z !== undefined) p.z = data.z;
            if (data.rotation !== undefined) p.rotation = data.rotation;
        }
    }

    handleHit(targetId, damage, attackerId) {
        const target = this.players[targetId];
        if (target && !target.isDead) {
            target.hp -= damage;
            if (target.hp <= 0) {
                target.hp = 0;
                target.isDead = true;
                target.deaths++;
                target.lastDeathTime = Date.now();

                // Award kill to attacker
                const attacker = this.players[attackerId];
                if (attacker) {
                    attacker.kills++;
                }

                return { killed: true, target };
            }
            return { killed: false, target };
        }
        return null;
    }

    update(dt) {
        const now = Date.now();
        for (let id in this.players) {
            const p = this.players[id];
            if (p.isDead && now - p.lastDeathTime > this.RESPAWN_TIME) {
                p.isDead = false;
                p.hp = this.MAX_HP;
                // Spawn at the opposite side of the map from where player died
                const signX = p.x >= 0 ? -1 : 1;
                const signZ = p.z >= 0 ? -1 : 1;
                p.x = signX * (20 + Math.random() * 20);
                p.z = signZ * (20 + Math.random() * 20);
                p.y = 2;
            }
        }
    }
}

module.exports = new PlayerManager();
