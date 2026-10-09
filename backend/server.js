const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());

// Health check for Render
app.get('/', (req, res) => {
  res.json({ status: 'ok', games: Object.keys(games).length });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ─── In-memory game rooms ──────────────────────────────────────
// games[gameId] = {
//   gameState: GameState | null,
//   players: {
//     [sessionId]: { socketId, name, emoji, isHost, playerId }
//   },
//   started: boolean,
//   createdAt: number,
// }
const games = {};

// Clean up stale games every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [gameId, game] of Object.entries(games)) {
    if (now - game.createdAt > 4 * 60 * 60 * 1000) { // 4 hours
      delete games[gameId];
      console.log(`Cleaned up stale game: ${gameId}`);
    }
  }
}, 30 * 60 * 1000);

// ─── Helper: get lobby player list ─────────────────────────────
function getLobbyPlayers(game) {
  return Object.entries(game.players).map(([sessionId, p]) => ({
    name: p.name,
    emoji: p.emoji,
    isHost: p.isHost,
    isConnected: !!p.socketId,
  }));
}

// ─── Socket handlers ───────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  // ── 1. CREATE GAME ─────────────────────────────────────────
  socket.on('createGame', ({ playerName, emoji }, callback) => {
    const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const sessionId = crypto.randomUUID();

    games[gameId] = {
      gameState: null,
      players: {
        [sessionId]: {
          socketId: socket.id,
          name: playerName,
          emoji: emoji || '😎',
          isHost: true,
          playerId: null,
        }
      },
      started: false,
      createdAt: Date.now(),
    };

    socket.join(gameId);
    console.log(`Game ${gameId} created by ${playerName}`);

    callback({
      success: true,
      gameId,
      sessionId,
      isHost: true,
      players: getLobbyPlayers(games[gameId]),
    });
  });

  // ── 2. JOIN GAME ───────────────────────────────────────────
  socket.on('joinGame', ({ gameId, playerName, emoji }, callback) => {
    const game = games[gameId];

    if (!game) {
      return callback({ success: false, error: 'Game not found. Check the room code.' });
    }

    if (game.started) {
      return callback({ success: false, error: 'Game already started.' });
    }

    const playerCount = Object.keys(game.players).length;
    if (playerCount >= 5) {
      return callback({ success: false, error: 'Room is full (max 5 players).' });
    }

    const sessionId = crypto.randomUUID();
    game.players[sessionId] = {
      socketId: socket.id,
      name: playerName,
      emoji: emoji || '🎯',
      isHost: false,
      playerId: null,
    };

    socket.join(gameId);
    console.log(`${playerName} joined game ${gameId}`);

    const lobbyPlayers = getLobbyPlayers(game);

    // Notify everyone in the room about the new player list
    io.to(gameId).emit('lobbyUpdate', { players: lobbyPlayers });

    callback({
      success: true,
      sessionId,
      gameId,
      isHost: false,
      players: lobbyPlayers,
    });
  });

  // ── 3. REJOIN GAME (refresh / back button recovery) ────────
  socket.on('rejoinGame', ({ gameId, sessionId }, callback) => {
    const game = games[gameId];

    if (!game) {
      return callback({ success: false, error: 'Game session ended.' });
    }

    const playerSession = game.players[sessionId];
    if (!playerSession) {
      return callback({ success: false, error: 'Invalid session.' });
    }

    // Update their socket ID
    playerSession.socketId = socket.id;
    socket.join(gameId);

    console.log(`${playerSession.name} reconnected to game ${gameId}`);

    if (game.started && game.gameState) {
      // Game is in progress — send current state
      callback({
        success: true,
        gameState: game.gameState,
        isHost: playerSession.isHost,
        started: true,
        players: getLobbyPlayers(game),
      });
    } else {
      // Still in lobby
      callback({
        success: true,
        gameState: null,
        isHost: playerSession.isHost,
        started: false,
        players: getLobbyPlayers(game),
      });
    }
  });

  // ── 4. START GAME (host only) ──────────────────────────────
  socket.on('startGame', ({ gameId, sessionId, initialState }, callback) => {
    const game = games[gameId];
    if (!game) return callback?.({ success: false, error: 'Game not found.' });

    const session = game.players[sessionId];
    if (!session || !session.isHost) {
      return callback?.({ success: false, error: 'Only the host can start the game.' });
    }

    // Assign player IDs from the initial state to sessions
    const sessions = Object.entries(game.players);
    if (initialState && initialState.players) {
      sessions.forEach(([sid, playerData], index) => {
        if (initialState.players[index]) {
          playerData.playerId = initialState.players[index].id;
        }
      });
    }

    game.gameState = initialState;
    game.started = true;

    // Broadcast to ALL players (including host)
    io.to(gameId).emit('gameStarted', { gameState: initialState });

    console.log(`Game ${gameId} started with ${sessions.length} players`);
    callback?.({ success: true });
  });

  // ── 5. STATE SYNC (relay state changes) ────────────────────
  socket.on('updateState', ({ gameId, sessionId, newState }) => {
    const game = games[gameId];
    if (!game || !game.players[sessionId]) return;

    // Save authoritative state on server
    game.gameState = newState;
    // Broadcast to everyone ELSE in the room
    socket.to(gameId).emit('stateUpdated', newState);
  });

  // ── 6. DISCONNECT ──────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log('Disconnected:', socket.id);

    // Mark player as disconnected but don't remove them
    for (const [gameId, game] of Object.entries(games)) {
      for (const [sessionId, player] of Object.entries(game.players)) {
        if (player.socketId === socket.id) {
          player.socketId = null;
          console.log(`${player.name} went offline in game ${gameId}`);

          // Notify others
          io.to(gameId).emit('playerDisconnected', {
            name: player.name,
            players: getLobbyPlayers(game),
          });
          return;
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🎲 Indian Tycoon Server running on port ${PORT}`);
});
