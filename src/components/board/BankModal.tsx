import React, { useState } from 'react';
import { View, StyleSheet, Text, Pressable, ScrollView, useWindowDimensions, Modal } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { FontAwesome5 } from '@expo/vector-icons';
import { Player, Loan } from '../../types/player';
import { LOAN_AMOUNTS, getLoanDeadlineInfo, canTakeLoan, MAX_LOAN_TOTAL } from '../../game-engine/bankEngine';
import { GameState } from '../../types/game';

interface BankModalProps {
  game: GameState;
  player: Player;
  onClose: () => void;
  onTakeLoan: (amount: number) => void;
  onRepayLoan: (loanId: string) => void;
}

const MAX_LOANS = 4;

export const BankModal: React.FC<BankModalProps> = ({ game, player, onClose, onTakeLoan, onRepayLoan }) => {
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<'TAKE' | 'REPAY'>('TAKE');

  const activeLoans = player.loans.filter(l => !l.isRepaid);
  const totalLoansUsed = player.loans.length;
  const loansRemaining = MAX_LOANS - totalLoansUsed;
  const activeLoanTotal = activeLoans.reduce((sum, l) => sum + l.amount, 0);
  const canTake = canTakeLoan(game, player.id);

  return (
    <Modal visible transparent animationType="none">
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.overlay}>
        <Animated.View
          entering={SlideInDown.duration(400).springify()}
          exiting={SlideOutDown.duration(300)}
          style={[styles.modal, { width: width * 0.92 }]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerIcon}>🏦</Text>
            <Text style={styles.headerTitle}>BANK</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <FontAwesome5 name="times" size={18} color="#FFF" />
            </Pressable>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Balance</Text>
              <Text style={[styles.statValue, { fontSize: 13 }]}>₹{player.money.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Rate</Text>
              <Text style={[styles.statValue, { color: '#F59E0B', fontSize: 13 }]}>{player.currentLoanRate}%</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Left</Text>
              <Text style={[styles.statValue, { color: loansRemaining > 0 ? '#10B981' : '#EF4444', fontSize: 13 }]}>
                {loansRemaining}/{MAX_LOANS}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Active</Text>
              <Text style={[styles.statValue, { color: activeLoanTotal >= MAX_LOAN_TOTAL ? '#EF4444' : '#10B981', fontSize: 13 }]}>
                {activeLoanTotal}/{MAX_LOAN_TOTAL}
              </Text>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabRow}>
            <Pressable
              style={[styles.tab, tab === 'TAKE' && styles.tabActive]}
              onPress={() => setTab('TAKE')}
            >
              <Text style={[styles.tabText, tab === 'TAKE' && styles.tabTextActive]}>Take Loan</Text>
            </Pressable>
            <Pressable
              style={[styles.tab, tab === 'REPAY' && styles.tabActive]}
              onPress={() => setTab('REPAY')}
            >
              <Text style={[styles.tabText, tab === 'REPAY' && styles.tabTextActive]}>
                Repay ({activeLoans.length})
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {tab === 'TAKE' ? (
              canTake ? (
                <View>
                  <Text style={styles.sectionInfo}>
                    Interest: {player.currentLoanRate}% deducted every 2 GO passes.
                    {'\n'}Repay within 6 GO passes to reduce your rate by 4%.
                  </Text>
                  <View style={styles.loanGrid}>
                    {LOAN_AMOUNTS.map(amount => {
                      const isAmountAllowed = canTakeLoan(game, player.id, amount);
                      return (
                        <Pressable
                          key={amount}
                          style={[styles.loanOption, !isAmountAllowed && { opacity: 0.5, borderColor: '#EF4444' }]}
                          onPress={() => {
                            if (isAmountAllowed) {
                              onTakeLoan(amount);
                              onClose();
                            }
                          }}
                          disabled={!isAmountAllowed}
                        >
                          <Text style={styles.loanAmount}>₹{amount.toLocaleString('en-IN')}</Text>
                          <Text style={styles.loanInterestPreview}>
                            Interest: ₹{Math.ceil(amount * (player.currentLoanRate / 100))}/cycle
                          </Text>
                          {!isAmountAllowed && (
                            <Text style={{fontSize: 10, color: '#EF4444', marginTop: 4, fontWeight: 'bold'}}>Exceeds limit</Text>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>🚫</Text>
                  <Text style={styles.emptyText}>You've reached your loan limit.</Text>
                </View>
              )
            ) : (
              activeLoans.length > 0 ? (
                activeLoans.map(loan => {
                  const deadline = getLoanDeadlineInfo(loan, player.goPassCount);
                  const canAfford = player.money >= loan.amount;

                  return (
                    <View key={loan.id} style={styles.loanCard}>
                      <View style={styles.loanCardHeader}>
                        <Text style={styles.loanCardTitle}>₹{loan.amount.toLocaleString('en-IN')}</Text>
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: deadline.isOverdue ? '#EF4444' : '#10B981' }
                        ]}>
                          <Text style={styles.statusText}>
                            {deadline.isOverdue ? 'OVERDUE' : 'ACTIVE'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.loanDetails}>
                        <View style={styles.loanDetailRow}>
                          <Text style={styles.loanDetailLabel}>Rate</Text>
                          <Text style={styles.loanDetailValue}>{loan.interestRate}%</Text>
                        </View>
                        <View style={styles.loanDetailRow}>
                          <Text style={styles.loanDetailLabel}>Interest Paid</Text>
                          <Text style={styles.loanDetailValue}>₹{loan.totalInterestPaid}</Text>
                        </View>
                        <View style={styles.loanDetailRow}>
                          <Text style={styles.loanDetailLabel}>Deadline</Text>
                          <Text style={[
                            styles.loanDetailValue,
                            { color: deadline.goPassesRemaining <= 1 ? '#EF4444' : '#F8FAFC' }
                          ]}>
                            {deadline.goPassesRemaining > 0
                              ? `${deadline.goPassesRemaining} GO passes left`
                              : 'Overdue!'}
                          </Text>
                        </View>
                        <View style={styles.loanDetailRow}>
                          <Text style={styles.loanDetailLabel}>Next Interest</Text>
                          <Text style={styles.loanDetailValue}>In {deadline.nextInterestIn} GO passes</Text>
                        </View>
                      </View>

                      <Pressable
                        style={[styles.repayBtn, !canAfford && styles.repayBtnDisabled]}
                        onPress={() => {
                          if (canAfford) {
                            onRepayLoan(loan.id);
                          }
                        }}
                        disabled={!canAfford}
                      >
                        <Text style={styles.repayBtnText}>
                          {canAfford
                            ? `Repay ₹${loan.amount.toLocaleString('en-IN')}`
                            : `Need ₹${(loan.amount - player.money).toLocaleString('en-IN')} more`}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>✅</Text>
                  <Text style={styles.emptyText}>No active loans. You're debt-free!</Text>
                </View>
              )
            )}

            {/* Loan History */}
            {player.loans.filter(l => l.isRepaid).length > 0 && (
              <View style={styles.historySection}>
                <Text style={styles.historyTitle}>Loan History</Text>
                {player.loans.filter(l => l.isRepaid).map(loan => (
                  <View key={loan.id} style={styles.historyItem}>
                    <Text style={styles.historyAmount}>₹{loan.amount}</Text>
                    <View style={[
                      styles.historyBadge,
                      { backgroundColor: loan.wasOnTime ? '#10B981' : '#F59E0B' }
                    ]}>
                      <Text style={styles.historyBadgeText}>
                        {loan.wasOnTime ? 'ON TIME' : 'LATE'}
                      </Text>
                    </View>
                    <Text style={styles.historyInterest}>
                      Interest: ₹{loan.totalInterestPaid}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.4)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(245,158,11,0.1)',
  },
  headerIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
    flex: 1,
    letterSpacing: 2,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  tabActive: {
    backgroundColor: '#F59E0B',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
  },
  tabTextActive: {
    color: '#000',
  },
  content: {
    padding: 12,
    maxHeight: 380,
  },
  sectionInfo: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 18,
    marginBottom: 12,
    textAlign: 'center',
  },
  loanGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  loanOption: {
    width: '48%',
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  loanAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F59E0B',
    marginBottom: 4,
  },
  loanInterestPreview: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  loanCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  loanCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  loanCardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  loanDetails: {
    marginBottom: 12,
  },
  loanDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  loanDetailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  loanDetailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  repayBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  repayBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  repayBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  historySection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  historyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  historyBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFF',
  },
  historyInterest: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
    marginLeft: 'auto',
  },
});
