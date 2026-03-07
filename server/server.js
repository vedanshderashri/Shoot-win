const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { initNetworking } = require('./matchMaker');
const gameServer = require('./gameServer');

const app = express();
const server = http.createServer(app);

// Allow cross-origin for local development with Vite
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.get('/', (req, res) => {
  res.send('Multiplayer FPS Server is running.');
});

// Initialize networking and attach to Socket.IO
initNetworking(io);

// Start the game loop
gameServer.startLoop();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
