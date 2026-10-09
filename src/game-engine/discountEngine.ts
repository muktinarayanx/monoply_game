import { GameState } from '../types/game';

export const DISCOUNT_OPTIONS = [10, 20, 30, 40] as const;
export type DiscountPercent = typeof DISCOUNT_OPTIONS[number];

/**
 * Set a discount from one player to another.
 * If a discount already exists, it is updated.
 */
export const setDiscount = (
  state: GameState,
  fromPlayerId: string,
  toPlayerId: string,
  discountPercent: number
): GameState => {
  if (!DISCOUNT_OPTIONS.includes(discountPercent as DiscountPercent)) return state;
  if (fromPlayerId === toPlayerId) return state;

  const newState = { ...state, players: [...state.players] };
  const fromIndex = newState.players.findIndex(p => p.id === fromPlayerId);
  if (fromIndex === -1) return state;

  const fromPlayer = { ...newState.players[fromIndex] };
  fromPlayer.discountsGiven = { ...fromPlayer.discountsGiven, [toPlayerId]: discountPercent };
  newState.players[fromIndex] = fromPlayer;

  const toPlayer = state.players.find(p => p.id === toPlayerId);
  newState.eventFeed = [
    `🏷️ ${fromPlayer.name} gave ${toPlayer?.name ?? 'Unknown'} a ${discountPercent}% discount on their properties`,
    ...newState.eventFeed,
  ];

  return newState;
};

/**
 * Remove a discount from one player to another.
 */
export const removeDiscount = (
  state: GameState,
  fromPlayerId: string,
  toPlayerId: string
): GameState => {
  const newState = { ...state, players: [...state.players] };
  const fromIndex = newState.players.findIndex(p => p.id === fromPlayerId);
  if (fromIndex === -1) return state;

  const fromPlayer = { ...newState.players[fromIndex] };
  const { [toPlayerId]: _, ...remaining } = fromPlayer.discountsGiven;
  fromPlayer.discountsGiven = remaining;
  newState.players[fromIndex] = fromPlayer;

  const toPlayer = state.players.find(p => p.id === toPlayerId);
  newState.eventFeed = [
    `🏷️ ${fromPlayer.name} removed the discount for ${toPlayer?.name ?? 'Unknown'}`,
    ...newState.eventFeed,
  ];

  return newState;
};

/**
 * Get the discount a property owner has given to a specific tenant.
 * Returns 0 if no discount exists.
 */
export const getDiscount = (state: GameState, ownerId: string, tenantId: string): number => {
  const owner = state.players.find(p => p.id === ownerId);
  if (!owner) return 0;
  return owner.discountsGiven[tenantId] ?? 0;
};

/**
 * Calculate the discounted rent amount.
 */
export const calculateDiscountedRent = (
  originalRent: number,
  discountPercent: number
): number => {
  if (discountPercent <= 0) return originalRent;
  return Math.round(originalRent * (1 - discountPercent / 100));
};

/**
 * Get all active discounts given by a player.
 * Returns array of { targetPlayerId, targetPlayerName, discountPercent }.
 */
export const getPlayerDiscounts = (state: GameState, playerId: string) => {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return [];

  return Object.entries(player.discountsGiven).map(([targetId, percent]) => {
    const targetPlayer = state.players.find(p => p.id === targetId);
    return {
      targetPlayerId: targetId,
      targetPlayerName: targetPlayer?.name ?? 'Unknown',
      discountPercent: percent,
    };
  });
};

/**
 * Clean up discounts when a player is eliminated.
 * Removes all discounts given to and by the eliminated player.
 */
export const cleanupPlayerDiscounts = (state: GameState, eliminatedPlayerId: string): GameState => {
  const newState = { ...state, players: [...state.players] };

  newState.players = newState.players.map(player => {
    const newPlayer = { ...player };
    // Remove discounts given to the eliminated player
    const { [eliminatedPlayerId]: _, ...remaining } = newPlayer.discountsGiven;
    newPlayer.discountsGiven = remaining;
    // If this IS the eliminated player, clear all their discounts
    if (newPlayer.id === eliminatedPlayerId) {
      newPlayer.discountsGiven = {};
    }
    return newPlayer;
  });

  return newState;
};
