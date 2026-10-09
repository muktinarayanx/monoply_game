import { create, StateCreator } from 'zustand';
import { GameState, TradeOffer } from '../types/game';
import { mockPlayers } from '../data/playerData';
import { mockBoard, mockProperties } from '../data/boardData';
import { mockEventCards } from '../data/cardData';
import * as Engine from '../game-engine/gameEngine';
import * as PropertyEngine from '../game-engine/propertyEngine';
import * as BuildingEngine from '../game-engine/buildingEngine';
import * as TradeEngine from '../game-engine/tradeEngine';
import * as BankEngine from '../game-engine/bankEngine';
import * as DiscountEngine from '../game-engine/discountEngine';
import { socketManager } from '../utils/socket';

// Middleware: after every `set()` that changes `game`, sync to server
const socketSync = <T extends { game: GameState | null }>(
  config: StateCreator<T>
): StateCreator<T> => (set, get, api) =>
  config(
    (...args: any[]) => {
      (set as any)(...args);
      // After state update, sync to other players
      const state = get() as any;
      if (state.game && socketManager.gameId) {
        socketManager.syncState();
      }
    },
    get,
    api,
  );

interface GameStore {
  game: GameState | null;
  initGame: () => void;
  rollDice: (forcedSteps?: number) => void;
  buyProperty: (propertyId: string) => void;
  endTurn: () => void;
  startAuction: (propertyId: string) => void;
  placeBid: (playerId: string, amount: number) => void;
  withdrawAuction: (playerId: string) => void;
  rollForJail: () => void;
  payJailFine: () => void;
  sendToJail: () => void;
  mortgageProperty: (propertyId: string) => void;
  redeemProperty: (propertyId: string) => void;
  buildHouse: (propertyId: string) => void;
  buildHotel: (propertyId: string) => void;
  sellBuilding: (propertyId: string) => void;
  proposeTrade: (offer: TradeOffer) => void;
  acceptTrade: () => void;
  rejectTrade: () => void;
  // ── Bank Loan ──
  takeLoan: (amount: number) => void;
  repayLoan: (loanId: string) => void;
  // ── Discount ──
  setDiscount: (toPlayerId: string, discountPercent: number) => void;
  removeDiscount: (toPlayerId: string) => void;
}

const getInitialState = (): GameState => ({
  id: "game-1",
  status: "playing",
  players: mockPlayers,
  currentPlayerIndex: 0,
  properties: mockProperties,
  board: mockBoard,
  round: 1,
  turnCount: 0,
  eventCards: mockEventCards,
  eventFeed: ["Game started"],
});

export const useGameStore = create<GameStore>()(socketSync<GameStore>((set, get) => ({
  game: null,

  initGame: () => set({ game: getInitialState() }),

  rollDice: (forcedSteps?: number) => {
    const { game } = get();
    if (!game) return;

    let dice1, dice2, totalSteps;
    if (forcedSteps !== undefined) {
      dice1 = Math.min(6, Math.max(1, Math.floor(forcedSteps / 2)));
      dice2 = forcedSteps - dice1;
      totalSteps = forcedSteps;
    } else {
      [dice1, dice2] = Engine.rollDice();
      totalSteps = dice1 + dice2;
    }
    const currentPlayer = game.players[game.currentPlayerIndex];

    let newState: GameState = { ...game, lastDiceRoll: [dice1, dice2] as [number, number] };
    newState = Engine.movePlayer(newState, currentPlayer.id, totalSteps);

    set({ game: newState });
  },

  buyProperty: (propertyId: string) => {
    const { game } = get();
    if (!game) return;

    const currentPlayer = game.players[game.currentPlayerIndex];
    const newState = Engine.buyProperty(game, currentPlayer.id, propertyId);
    
    set({ game: newState });
  },

  endTurn: () => {
    const { game } = get();
    if (!game) return;

    const newState = Engine.endTurn(game);
    set({ game: newState });
  },

  startAuction: (propertyId: string) => {
    const { game } = get();
    if (!game) return;
    set({ game: Engine.startAuction(game, propertyId) });
  },

  placeBid: (playerId: string, amount: number) => {
    const { game } = get();
    if (!game) return;
    set({ game: Engine.placeBid(game, playerId, amount) });
  },

  withdrawAuction: (playerId: string) => {
    const { game } = get();
    if (!game) return;
    set({ game: Engine.withdrawAuction(game, playerId) });
  },

  rollForJail: () => {
    const { game } = get();
    if (!game) return;
    const currentPlayer = game.players[game.currentPlayerIndex];
    set({ game: Engine.rollForJail(game, currentPlayer.id) });
  },

  payJailFine: () => {
    const { game } = get();
    if (!game) return;
    const currentPlayer = game.players[game.currentPlayerIndex];
    set({ game: Engine.payJailFine(game, currentPlayer.id) });
  },

  sendToJail: () => {
    const { game } = get();
    if (!game) return;
    const currentPlayer = game.players[game.currentPlayerIndex];
    set({ game: Engine.sendToJail(game, currentPlayer.id) });
  },

  mortgageProperty: (propertyId: string) => {
    const { game } = get();
    if (!game) return;
    const currentPlayer = game.players[game.currentPlayerIndex];
    set({ game: PropertyEngine.mortgageProperty(game, currentPlayer.id, propertyId) });
  },

  redeemProperty: (propertyId: string) => {
    const { game } = get();
    if (!game) return;
    const currentPlayer = game.players[game.currentPlayerIndex];
    set({ game: PropertyEngine.redeemProperty(game, currentPlayer.id, propertyId) });
  },

  buildHouse: (propertyId: string) => {
    const { game } = get();
    if (!game) return;
    const currentPlayer = game.players[game.currentPlayerIndex];
    set({ game: BuildingEngine.buildHouse(game, currentPlayer.id, propertyId) });
  },

  buildHotel: (propertyId: string) => {
    const { game } = get();
    if (!game) return;
    const currentPlayer = game.players[game.currentPlayerIndex];
    set({ game: BuildingEngine.buildHotel(game, currentPlayer.id, propertyId) });
  },

  sellBuilding: (propertyId: string) => {
    const { game } = get();
    if (!game) return;
    const currentPlayer = game.players[game.currentPlayerIndex];
    set({ game: BuildingEngine.sellBuilding(game, currentPlayer.id, propertyId) });
  },

  proposeTrade: (offer) => {
    const { game } = get();
    if (!game) return;
    set({ game: TradeEngine.proposeTrade(game, offer) });
  },

  acceptTrade: () => {
    const { game } = get();
    if (!game) return;
    set({ game: TradeEngine.acceptTrade(game) });
  },

  rejectTrade: () => {
    const { game } = get();
    if (!game) return;
    set({ game: TradeEngine.rejectTrade(game) });
  },

  // ── Bank Loan Actions ──
  takeLoan: (amount: number) => {
    const { game } = get();
    if (!game) return;
    const currentPlayer = game.players[game.currentPlayerIndex];
    set({ game: BankEngine.takeLoan(game, currentPlayer.id, amount) });
  },

  repayLoan: (loanId: string) => {
    const { game } = get();
    if (!game) return;
    const currentPlayer = game.players[game.currentPlayerIndex];
    set({ game: BankEngine.repayLoan(game, currentPlayer.id, loanId) });
  },

  // ── Discount Actions ──
  setDiscount: (toPlayerId: string, discountPercent: number) => {
    const { game } = get();
    if (!game) return;
    const currentPlayer = game.players[game.currentPlayerIndex];
    set({ game: DiscountEngine.setDiscount(game, currentPlayer.id, toPlayerId, discountPercent) });
  },

  removeDiscount: (toPlayerId: string) => {
    const { game } = get();
    if (!game) return;
    const currentPlayer = game.players[game.currentPlayerIndex];
    set({ game: DiscountEngine.removeDiscount(game, currentPlayer.id, toPlayerId) });
  },
})));
