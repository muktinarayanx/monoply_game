export interface Loan {
  id: string;
  amount: number;          // Principal amount borrowed
  interestRate: number;    // e.g. 20 for 20%
  goPassesAtTake: number;  // goPassCount when loan was taken
  totalInterestPaid: number;
  isRepaid: boolean;
  wasOnTime: boolean;      // true if repaid within 6 GO passes
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  money: number;
  position: number;
  isBankrupt: boolean;
  isInJail: boolean;
  jailTurns: number;
  getOutOfJailCards: number;
  // ── Bank Loan System ──
  goPassCount: number;             // Total GO passes this game
  loans: Loan[];                   // All loans (active + repaid), max 4
  currentLoanRate: number;         // Next loan interest rate (starts at 20)
  // ── Discount System ──
  discountsGiven: Record<string, number>; // { targetPlayerId: discountPercent }
  // ── Cards System ──
  extraTurn?: boolean;
  pendingBonus?: number;
}
