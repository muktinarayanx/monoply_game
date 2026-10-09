import { GameState } from '../types/game';
import { Loan } from '../types/player';

const MAX_LOANS = 4;
const BASE_RATE = 20;
const RATE_REDUCTION = 4;
const REPAYMENT_WINDOW = 6; // GO passes
const INTEREST_INTERVAL = 2; // GO passes

export const MAX_LOAN_TOTAL = 2000;

/**
 * Available loan amounts based on the game. Players can choose from preset amounts.
 */
export const LOAN_AMOUNTS = [200, 500];

/**
 * Check if a player can take a new loan.
 */
export const canTakeLoan = (state: GameState, playerId: string, amount?: number): boolean => {
  const player = state.players.find(p => p.id === playerId);
  if (!player || player.isBankrupt) return false;
  if (player.loans.length >= MAX_LOANS) return false;

  const activeLoanTotal = player.loans.filter(l => !l.isRepaid).reduce((sum, l) => sum + l.amount, 0);
  if (amount !== undefined) {
    return (activeLoanTotal + amount) <= MAX_LOAN_TOTAL;
  }
  return activeLoanTotal < MAX_LOAN_TOTAL;
};

/**
 * Get loan details for a player.
 */
export const getLoanInfo = (state: GameState, playerId: string) => {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return null;

  const totalLoans = player.loans.length;
  const activeLoans = player.loans.filter(l => !l.isRepaid);
  const loansRemaining = MAX_LOANS - totalLoans;
  const currentRate = player.currentLoanRate;

  const activeLoanTotal = activeLoans.reduce((sum, l) => sum + l.amount, 0);

  return {
    totalLoans,
    activeLoans,
    loansRemaining,
    currentRate,
    maxLoans: MAX_LOANS,
    activeLoanTotal,
    maxLoanTotal: MAX_LOAN_TOTAL,
  };
};

/**
 * Take a loan from the bank.
 */
export const takeLoan = (state: GameState, playerId: string, amount: number): GameState => {
  if (!canTakeLoan(state, playerId, amount)) return state;

  const newState = { ...state, players: [...state.players] };
  const playerIndex = newState.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return state;

  const player = { ...newState.players[playerIndex] };

  const loan: Loan = {
    id: `loan-${player.id}-${player.loans.length + 1}`,
    amount,
    interestRate: player.currentLoanRate,
    goPassesAtTake: player.goPassCount,
    totalInterestPaid: 0,
    isRepaid: false,
    wasOnTime: false,
  };

  player.loans = [...player.loans, loan];
  player.money += amount;

  newState.players[playerIndex] = player;
  newState.eventFeed = [
    `🏦 ${player.name} took a bank loan of ₹${amount} at ${loan.interestRate}% interest`,
    ...newState.eventFeed,
  ];

  return newState;
};

/**
 * Repay a specific loan. The repayment amount is the remaining principal.
 */
export const repayLoan = (state: GameState, playerId: string, loanId: string): GameState => {
  const newState = { ...state, players: [...state.players] };
  const playerIndex = newState.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return state;

  const player = { ...newState.players[playerIndex] };
  const loanIndex = player.loans.findIndex(l => l.id === loanId && !l.isRepaid);
  if (loanIndex === -1) return state;

  const loan = { ...player.loans[loanIndex] };

  // Must have enough money to repay
  if (player.money < loan.amount) return state;

  player.money -= loan.amount;

  // Check if repaid on time (within 6 GO passes of taking)
  const goPassesSinceTake = player.goPassCount - loan.goPassesAtTake;
  const isOnTime = goPassesSinceTake <= REPAYMENT_WINDOW;

  loan.isRepaid = true;
  loan.wasOnTime = isOnTime;

  player.loans = [...player.loans];
  player.loans[loanIndex] = loan;

  // If repaid on time, reduce rate for next loan (min 8%)
  if (isOnTime) {
    player.currentLoanRate = Math.max(8, player.currentLoanRate - RATE_REDUCTION);
    newState.eventFeed = [
      `🏦 ${player.name} repaid loan of ₹${loan.amount} ON TIME! Next rate: ${player.currentLoanRate}%`,
      ...newState.eventFeed,
    ];
  } else {
    newState.eventFeed = [
      `🏦 ${player.name} repaid loan of ₹${loan.amount} (late). Rate stays at ${player.currentLoanRate}%`,
      ...newState.eventFeed,
    ];
  }

  newState.players[playerIndex] = player;
  return newState;
};

/**
 * Process loan interest deductions when a player passes GO.
 * Called from movePlayer when player passes GO.
 * Interest is deducted every 2 GO passes since the loan was taken.
 */
export const processLoanInterest = (state: GameState, playerId: string): GameState => {
  let newState = { ...state, players: [...state.players] };
  const playerIndex = newState.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return state;

  const player = { ...newState.players[playerIndex] };
  let interestCharged = false;
  let totalInterest = 0;

  player.loans = player.loans.map(loan => {
    if (loan.isRepaid) return loan;

    const goPassesSinceTake = player.goPassCount - loan.goPassesAtTake;

    // Deduct interest every 2 GO passes
    if (goPassesSinceTake > 0 && goPassesSinceTake % INTEREST_INTERVAL === 0) {
      const interest = Math.ceil(loan.amount * (loan.interestRate / 100));
      player.money -= interest;
      totalInterest += interest;
      interestCharged = true;

      return {
        ...loan,
        totalInterestPaid: loan.totalInterestPaid + interest,
      };
    }
    return loan;
  });

  if (interestCharged) {
    newState.eventFeed = [
      `🏦 ${player.name} paid ₹${totalInterest} in loan interest`,
      ...newState.eventFeed,
    ];
    newState.lastLoanInterestEvent = {
      playerId: player.id,
      loanId: 'all',
      interestAmount: totalInterest,
      timestamp: Date.now(),
    };
  }

  newState.players[playerIndex] = player;
  return newState;
};

/**
 * Get deadline info for a specific loan.
 */
export const getLoanDeadlineInfo = (loan: Loan, currentGoPassCount: number) => {
  const goPassesSinceTake = currentGoPassCount - loan.goPassesAtTake;
  const goPassesRemaining = Math.max(0, REPAYMENT_WINDOW - goPassesSinceTake);
  const isOverdue = goPassesSinceTake > REPAYMENT_WINDOW;
  const nextInterestIn = INTEREST_INTERVAL - (goPassesSinceTake % INTEREST_INTERVAL);

  return {
    goPassesSinceTake,
    goPassesRemaining,
    isOverdue,
    nextInterestIn: goPassesSinceTake === 0 ? INTEREST_INTERVAL : nextInterestIn,
    repaymentWindow: REPAYMENT_WINDOW,
  };
};
