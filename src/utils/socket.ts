import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGameStore } from '../store/gameStore';

// ─── Configuration ───────────────────────────────────────────
// For local testing, use your local IP. For production, use your Render URL.
// e.g. 'https://indian-tycoon-backend.onrender.com'
const SERVER_URL = __DEV__
  ? 'http://192.168.1.6:3000'
  : 'https://indian-tycoon-backend.onrender.com'; // Replace with your Render URL

// ─── Storage keys ────────────────────────────────────────────
const STORAGE_KEYS = {
  GAME_ID: 'itb_gameId',
  SESSION_ID: 'itb_sessionId',
  IS_HOST: 'itb_isHost',
  PLAYER_NAME: 'itb_playerName',
};

export interface LobbyPlayer {
  name: string;
  emoji: string;
  isHost: boolean;
  isConnected: boolean;
}

// ─── Callbacks for UI updates ────────────────────────────────
type LobbyUpdateCallback = (players: LobbyPlayer[]) => void;
type GameStartedCallback = (gameState: any) => void;
type PlayerDisconnectedCallback = (data: { name: string; players: LobbyPlayer[] }) => void;

class SocketManager {
  socket: Socket | null = null;
  gameId: string | null = null;
  sessionId: string | null = null;
  isHost: boolean = false;
  playerName: string | null = null;

  // UI callbacks
  private onLobbyUpdate: LobbyUpdateCallback | null = null;
  private onGameStarted: GameStartedCallback | null = null;
  private onPlayerDisconnected: PlayerDisconnectedCallback | null = null;

  // ── Connect ────────────────────────────────────────────────
  connect() {
    if (this.socket?.connected) return;

    this.socket = io(SERVER_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    this.socket.on('reconnect', () => {
      console.log('[Socket] Reconnected — attempting rejoin...');
      if (this.gameId && this.sessionId) {
        this.rejoinGame();
      }
    });

    // Listen for lobby updates
    this.socket.on('lobbyUpdate', ({ players }) => {
      this.onLobbyUpdate?.(players);
    });

    // Listen for game start
    this.socket.on('gameStarted', ({ gameState }) => {
      useGameStore.setState({ game: gameState });
      this.onGameStarted?.(gameState);
    });

    // Listen for state updates from other players
    this.socket.on('stateUpdated', (newState) => {
      useGameStore.setState({ game: newState });
    });

    // Listen for player disconnection
    this.socket.on('playerDisconnected', (data) => {
      this.onPlayerDisconnected?.(data);
    });
  }

  // ── Register UI callbacks ──────────────────────────────────
  setLobbyUpdateCallback(cb: LobbyUpdateCallback | null) {
    this.onLobbyUpdate = cb;
  }

  setGameStartedCallback(cb: GameStartedCallback | null) {
    this.onGameStarted = cb;
  }

  setPlayerDisconnectedCallback(cb: PlayerDisconnectedCallback | null) {
    this.onPlayerDisconnected = cb;
  }

  // ── Create Game ────────────────────────────────────────────
  async createGame(playerName: string, emoji: string = '😎'): Promise<{ gameId: string; players: LobbyPlayer[] }> {
    this.connect();

    return new Promise((resolve, reject) => {
      this.socket!.emit('createGame', { playerName, emoji }, async (res: any) => {
        if (res.success) {
          this.gameId = res.gameId;
          this.sessionId = res.sessionId;
          this.isHost = true;
          this.playerName = playerName;

          await AsyncStorage.multiSet([
            [STORAGE_KEYS.GAME_ID, res.gameId],
            [STORAGE_KEYS.SESSION_ID, res.sessionId],
            [STORAGE_KEYS.IS_HOST, 'true'],
            [STORAGE_KEYS.PLAYER_NAME, playerName],
          ]);

          resolve({ gameId: res.gameId, players: res.players });
        } else {
          reject(new Error(res.error));
        }
      });
    });
  }

  // ── Join Game ──────────────────────────────────────────────
  async joinGame(gameId: string, playerName: string, emoji: string = '🎯'): Promise<{ players: LobbyPlayer[] }> {
    this.connect();

    return new Promise((resolve, reject) => {
      this.socket!.emit('joinGame', { gameId: gameId.toUpperCase(), playerName, emoji }, async (res: any) => {
        if (res.success) {
          this.gameId = res.gameId;
          this.sessionId = res.sessionId;
          this.isHost = false;
          this.playerName = playerName;

          await AsyncStorage.multiSet([
            [STORAGE_KEYS.GAME_ID, res.gameId],
            [STORAGE_KEYS.SESSION_ID, res.sessionId],
            [STORAGE_KEYS.IS_HOST, 'false'],
            [STORAGE_KEYS.PLAYER_NAME, playerName],
          ]);

          resolve({ players: res.players });
        } else {
          reject(new Error(res.error));
        }
      });
    });
  }

  // ── Rejoin Game (after refresh / back) ─────────────────────
  async rejoinGame(): Promise<{
    success: boolean;
    started: boolean;
    isHost: boolean;
    players: LobbyPlayer[];
    gameState: any;
  }> {
    const savedGameId = await AsyncStorage.getItem(STORAGE_KEYS.GAME_ID);
    const savedSessionId = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_ID);
    const savedPlayerName = await AsyncStorage.getItem(STORAGE_KEYS.PLAYER_NAME);

    if (!savedGameId || !savedSessionId) {
      return { success: false, started: false, isHost: false, players: [], gameState: null };
    }

    this.connect();

    return new Promise((resolve) => {
      this.socket!.emit('rejoinGame', { gameId: savedGameId, sessionId: savedSessionId }, (res: any) => {
        if (res.success) {
          this.gameId = savedGameId;
          this.sessionId = savedSessionId;
          this.isHost = res.isHost;
          this.playerName = savedPlayerName;

          if (res.gameState) {
            useGameStore.setState({ game: res.gameState });
          }

          resolve({
            success: true,
            started: res.started,
            isHost: res.isHost,
            players: res.players,
            gameState: res.gameState,
          });
        } else {
          this.clearSession();
          resolve({ success: false, started: false, isHost: false, players: [], gameState: null });
        }
      });
    });
  }

  // ── Start Game (host only) ─────────────────────────────────
  async startGame(initialState: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.gameId || !this.sessionId) {
        return reject(new Error('Not connected'));
      }

      this.socket.emit('startGame', {
        gameId: this.gameId,
        sessionId: this.sessionId,
        initialState,
      }, (res: any) => {
        if (res?.success) {
          resolve();
        } else {
          reject(new Error(res?.error || 'Failed to start game'));
        }
      });
    });
  }

  // ── Sync State (broadcast after any action) ────────────────
  syncState() {
    if (this.socket?.connected && this.gameId && this.sessionId) {
      const currentState = useGameStore.getState().game;
      if (currentState) {
        this.socket.emit('updateState', {
          gameId: this.gameId,
          sessionId: this.sessionId,
          newState: currentState,
        });
      }
    }
  }

  // ── Clear saved session ────────────────────────────────────
  async clearSession() {
    this.gameId = null;
    this.sessionId = null;
    this.isHost = false;
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.GAME_ID,
      STORAGE_KEYS.SESSION_ID,
      STORAGE_KEYS.IS_HOST,
      STORAGE_KEYS.PLAYER_NAME,
    ]);
  }

  // ── Disconnect ─────────────────────────────────────────────
  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const socketManager = new SocketManager();
