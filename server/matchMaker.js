const playerManager = require('./playerManager');

// Store rooms: { code: { players: Set<socketId>, maxPlayers: 10 } }
const rooms = {};

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function initNetworking(io) {

    io.on('connection', (socket) => {
        console.log(`Player connected: ${socket.id}`);

        // Create a new room
        socket.on('create_room', (data) => {
            const code = generateRoomCode();
            const playerName = data.name || `Player_${socket.id.substr(0, 4)}`;

            rooms[code] = {
                players: new Set(),
                maxPlayers: 10,
                createdAt: Date.now()
            };

            rooms[code].players.add(socket.id);
            socket.join(code);
            socket.roomCode = code;

            playerManager.addPlayer(socket.id, playerName, code);

            socket.emit('room_created', {
                code,
                id: socket.id,
                players: playerManager.getPlayersInRoom(code)
            });

            console.log(`Room ${code} created by ${playerName}`);
        });

        // Join an existing room
        socket.on('join_room', (data) => {
            const code = (data.code || '').toUpperCase().trim();
            const playerName = data.name || `Player_${socket.id.substr(0, 4)}`;

            if (!rooms[code]) {
                socket.emit('join_error', { message: 'Room not found. Check the code and try again.' });
                return;
            }

            if (rooms[code].players.size >= rooms[code].maxPlayers) {
                socket.emit('join_error', { message: 'Room is full (max 10 players).' });
                return;
            }

            rooms[code].players.add(socket.id);
            socket.join(code);
            socket.roomCode = code;

            playerManager.addPlayer(socket.id, playerName, code);

            // Send state to joining player
            socket.emit('room_joined', {
                code,
                id: socket.id,
                players: playerManager.getPlayersInRoom(code)
            });

            // Notify others in the room
            socket.to(code).emit('player_joined', playerManager.getPlayer(socket.id));

            console.log(`${playerName} joined room ${code} (${rooms[code].players.size} players)`);
        });

        // Movement — scoped to room
        socket.on('player_move', (data) => {
            if (!socket.roomCode) return;
            playerManager.updatePlayerState(socket.id, data);
            socket.to(socket.roomCode).emit('player_moved', { id: socket.id, ...data });
        });

        // Shooting — scoped to room
        socket.on('player_shoot', () => {
            if (!socket.roomCode) return;
            socket.to(socket.roomCode).emit('player_shot', { id: socket.id });
        });

        // Hit — scoped to room
        socket.on('player_hit', (data) => {
            if (!socket.roomCode) return;
            const targetId = data.targetId;
            const damage = data.damage || 25;

            const result = playerManager.handleHit(targetId, damage, socket.id);
            if (result) {
                io.to(socket.roomCode).emit('player_health_changed', { id: targetId, hp: result.target.hp });

                if (result.killed) {
                    io.to(socket.roomCode).emit('player_died', {
                        id: targetId,
                        killerId: socket.id,
                        killerName: playerManager.getPlayer(socket.id)?.name || 'Unknown',
                        victimName: result.target.name || 'Unknown'
                    });

                    // Send updated scores to room
                    io.to(socket.roomCode).emit('scores_update', playerManager.getScoresInRoom(socket.roomCode));
                }
            }
        });

        // Request scoreboard
        socket.on('get_scores', () => {
            if (!socket.roomCode) return;
            socket.emit('scores_update', playerManager.getScoresInRoom(socket.roomCode));
        });

        // Disconnect
        socket.on('disconnect', () => {
            console.log(`Player disconnected: ${socket.id}`);
            const code = socket.roomCode;

            playerManager.removePlayer(socket.id);

            if (code && rooms[code]) {
                rooms[code].players.delete(socket.id);
                io.to(code).emit('player_left', socket.id);

                // Clean up empty rooms
                if (rooms[code].players.size === 0) {
                    delete rooms[code];
                    console.log(`Room ${code} deleted (empty)`);
                } else {
                    io.to(code).emit('scores_update', playerManager.getScoresInRoom(code));
                }
            }
        });
    });

    // Periodic state sync per room
    setInterval(() => {
        for (const code in rooms) {
            io.to(code).emit('sync_state', playerManager.getPlayersInRoom(code));
        }
    }, 1000);
}

module.exports = { initNetworking };
