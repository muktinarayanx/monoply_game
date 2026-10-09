import { GameState } from '../types/game';
import { Player } from '../types/player';

export type CardType = 'CHANCE' | 'COMMUNITY_CHEST';

export interface Card {
  id: string;
  type: CardType;
  title: string;
  description: string;
  effect: (state: GameState, playerIndex: number) => GameState;
}

// ── Helpers ──

const receiveMoney = (state: GameState, playerIndex: number, amount: number): GameState => {
  const newState = { ...state, players: [...state.players] };
  newState.players[playerIndex] = { ...newState.players[playerIndex], money: newState.players[playerIndex].money + amount };
  return newState;
};

const payMoney = (state: GameState, playerIndex: number, amount: number): GameState => {
  const newState = { ...state, players: [...state.players] };
  newState.players[playerIndex] = { ...newState.players[playerIndex], money: Math.max(0, newState.players[playerIndex].money - amount) };
  return newState;
};

const receiveFromAll = (state: GameState, playerIndex: number, amount: number): GameState => {
  const newState = { ...state, players: [...state.players] };
  let totalReceived = 0;
  newState.players = newState.players.map((p, i) => {
    if (i === playerIndex || p.isBankrupt) return p;
    totalReceived += amount;
    return { ...p, money: Math.max(0, p.money - amount) };
  });
  newState.players[playerIndex] = { ...newState.players[playerIndex], money: newState.players[playerIndex].money + totalReceived };
  return newState;
};

const payToAll = (state: GameState, playerIndex: number, amount: number): GameState => {
  const newState = { ...state, players: [...state.players] };
  let totalPaid = 0;
  newState.players = newState.players.map((p, i) => {
    if (i === playerIndex || p.isBankrupt) return p;
    totalPaid += amount;
    return { ...p, money: p.money + amount };
  });
  newState.players[playerIndex] = { ...newState.players[playerIndex], money: Math.max(0, newState.players[playerIndex].money - totalPaid) };
  return newState;
};

const extraTurn = (state: GameState, playerIndex: number): GameState => {
  const newState = { ...state, players: [...state.players] };
  newState.players[playerIndex] = { ...newState.players[playerIndex], extraTurn: true };
  return newState;
};

const hasActiveLoan = (player: Player): boolean => {
  return player.loans.some(l => !l.isRepaid);
};

const conditionalReceive = (state: GameState, playerIndex: number, amount: number, condition: (p: Player) => boolean): GameState => {
  const player = state.players[playerIndex];
  if (condition(player)) {
    return receiveMoney(state, playerIndex, amount);
  }
  return state;
};

const goToJail = (state: GameState, playerIndex: number): GameState => {
  const newState = { ...state, players: [...state.players] };
  newState.pendingJail = true;
  return newState;
};

const businessOpportunity = (state: GameState, playerIndex: number): GameState => {
  let newState = { ...state, players: [...state.players] };
  newState.players[playerIndex] = { 
    ...newState.players[playerIndex], 
    money: Math.max(0, newState.players[playerIndex].money - 50),
    pendingBonus: (newState.players[playerIndex].pendingBonus || 0) + 100 
  };
  return newState;
};

// ── Definitions ──

export const CHANCE_CARDS: Card[] = [
  { id: 'c1', type: 'CHANCE', title: 'Lucky Investment', description: 'Receive ₹200.', effect: (s, i) => receiveMoney(s, i, 200) },
  { id: 'c2', type: 'CHANCE', title: 'Business Boom', description: 'Receive ₹250.', effect: (s, i) => receiveMoney(s, i, 250) },
  { id: 'c3', type: 'CHANCE', title: 'Tax Notice', description: 'Pay ₹150.', effect: (s, i) => payMoney(s, i, 150) },
  { id: 'c4', type: 'CHANCE', title: 'Unexpected Expense', description: 'Pay ₹100.', effect: (s, i) => payMoney(s, i, 100) },
  { id: 'c5', type: 'CHANCE', title: 'Successful Deal', description: 'Receive ₹50 from each player.', effect: (s, i) => receiveFromAll(s, i, 50) },
  { id: 'c6', type: 'CHANCE', title: 'Business Loss', description: 'Pay ₹50 to each player.', effect: (s, i) => payToAll(s, i, 50) },
  { id: 'c7', type: 'CHANCE', title: 'Government Incentive', description: 'Receive ₹200.', effect: (s, i) => receiveMoney(s, i, 200) },
  { id: 'c8', type: 'CHANCE', title: 'Lucky Draw', description: 'Roll the dice again.', effect: (s, i) => extraTurn(s, i) },
  { id: 'c9', type: 'CHANCE', title: 'Road Construction', description: 'Pay ₹75.', effect: (s, i) => payMoney(s, i, 75) },
  { id: 'c10', type: 'CHANCE', title: 'Big Contract', description: 'Receive ₹250.', effect: (s, i) => receiveMoney(s, i, 250) },
  { id: 'c11', type: 'CHANCE', title: 'Property Dispute', description: 'Pay ₹100.', effect: (s, i) => payMoney(s, i, 100) },
  { id: 'c12', type: 'CHANCE', title: 'Early Repayment Bonus', description: 'Receive ₹50 if you have an active loan.', effect: (s, i) => conditionalReceive(s, i, 50, hasActiveLoan) },
  { id: 'c13', type: 'CHANCE', title: 'Bank Service Fee', description: 'Pay ₹30.', effect: (s, i) => payMoney(s, i, 30) },
  { id: 'c14', type: 'CHANCE', title: 'Go to Jail', description: 'Move directly to Jail.', effect: (s, i) => goToJail(s, i) },
  { id: 'c15', type: 'CHANCE', title: 'Strategic Partnership', description: 'Receive ₹100.', effect: (s, i) => receiveMoney(s, i, 100) },
  { id: 'c16', type: 'CHANCE', title: 'Business Opportunity', description: 'Pay ₹50 now and receive ₹100 on your next turn.', effect: (s, i) => businessOpportunity(s, i) },
  { id: 'c17', type: 'CHANCE', title: 'Market Fee', description: 'Pay ₹60.', effect: (s, i) => payMoney(s, i, 60) },
  { id: 'c18', type: 'CHANCE', title: 'Customer Bonus', description: 'Receive ₹125.', effect: (s, i) => receiveMoney(s, i, 125) },
  { id: 'c19', type: 'CHANCE', title: 'Business Fine', description: 'Pay ₹175.', effect: (s, i) => payMoney(s, i, 175) },
  { id: 'c20', type: 'CHANCE', title: 'Special Reward', description: 'Receive ₹225.', effect: (s, i) => receiveMoney(s, i, 225) }
];

export const COMMUNITY_CHEST_CARDS: Card[] = [
  { id: 'cc1', type: 'COMMUNITY_CHEST', title: 'Festival Bonus', description: 'Receive ₹150.', effect: (s, i) => receiveMoney(s, i, 150) },
  { id: 'cc2', type: 'COMMUNITY_CHEST', title: 'Scholarship', description: 'Receive ₹100.', effect: (s, i) => receiveMoney(s, i, 100) },
  { id: 'cc3', type: 'COMMUNITY_CHEST', title: 'Family Support', description: 'Receive ₹75.', effect: (s, i) => receiveMoney(s, i, 75) },
  { id: 'cc4', type: 'COMMUNITY_CHEST', title: 'Medical Expense', description: 'Pay ₹100.', effect: (s, i) => payMoney(s, i, 100) },
  { id: 'cc5', type: 'COMMUNITY_CHEST', title: 'House Repair', description: 'Pay ₹50.', effect: (s, i) => payMoney(s, i, 50) },
  { id: 'cc6', type: 'COMMUNITY_CHEST', title: 'Business Grant', description: 'Receive ₹200.', effect: (s, i) => receiveMoney(s, i, 200) },
  { id: 'cc7', type: 'COMMUNITY_CHEST', title: 'Customer Refund', description: 'Pay ₹75.', effect: (s, i) => payMoney(s, i, 75) },
  { id: 'cc8', type: 'COMMUNITY_CHEST', title: 'Good Reputation', description: 'Receive ₹50 from each player.', effect: (s, i) => receiveFromAll(s, i, 50) },
  { id: 'cc9', type: 'COMMUNITY_CHEST', title: 'Charity Donation', description: 'Pay ₹50.', effect: (s, i) => payMoney(s, i, 50) },
  { id: 'cc10', type: 'COMMUNITY_CHEST', title: 'Investment Return', description: 'Receive ₹250.', effect: (s, i) => receiveMoney(s, i, 250) },
  { id: 'cc11', type: 'COMMUNITY_CHEST', title: 'Community Reward', description: 'Receive ₹100.', effect: (s, i) => receiveMoney(s, i, 100) },
  { id: 'cc12', type: 'COMMUNITY_CHEST', title: 'Property Maintenance', description: 'Pay ₹30.', effect: (s, i) => payMoney(s, i, 30) },
  { id: 'cc13', type: 'COMMUNITY_CHEST', title: 'Insurance Claim', description: 'Receive ₹150.', effect: (s, i) => receiveMoney(s, i, 150) },
  { id: 'cc14', type: 'COMMUNITY_CHEST', title: 'Bank Error', description: 'Receive ₹100.', effect: (s, i) => receiveMoney(s, i, 100) },
  { id: 'cc15', type: 'COMMUNITY_CHEST', title: 'Fine', description: 'Pay ₹125.', effect: (s, i) => payMoney(s, i, 125) },
  { id: 'cc16', type: 'COMMUNITY_CHEST', title: 'Community Event', description: 'Pay ₹20 to the community pool and receive ₹100.', effect: (s, i) => receiveMoney(s, i, 80) },
  { id: 'cc17', type: 'COMMUNITY_CHEST', title: 'Emergency Fund', description: 'Receive ₹200.', effect: (s, i) => receiveMoney(s, i, 200) },
  { id: 'cc18', type: 'COMMUNITY_CHEST', title: 'Utility Bill', description: 'Pay ₹80.', effect: (s, i) => payMoney(s, i, 80) },
  { id: 'cc19', type: 'COMMUNITY_CHEST', title: 'Local Business Reward', description: 'Receive ₹125.', effect: (s, i) => receiveMoney(s, i, 125) },
  { id: 'cc20', type: 'COMMUNITY_CHEST', title: 'Unexpected Bonus', description: 'Receive ₹225.', effect: (s, i) => receiveMoney(s, i, 225) }
];

export const drawCard = (state: GameState, playerId: string, type: CardType): { state: GameState, card: Card } => {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return { state, card: CHANCE_CARDS[0] }; // fallback

  const cards = type === 'CHANCE' ? CHANCE_CARDS : COMMUNITY_CHEST_CARDS;
  const card = cards[Math.floor(Math.random() * cards.length)];

  const newState = card.effect(state, playerIndex);
  
  // Format the event feed nicely
  const typeText = type === 'CHANCE' ? 'CHANCE' : 'COMMUNITY CHEST';
  const prefix = type === 'CHANCE' ? '❓' : '📦';
  newState.eventFeed = [`${prefix} ${newState.players[playerIndex].name} drew ${typeText}: ${card.title} - ${card.description}`, ...newState.eventFeed];

  return { state: newState, card };
};
