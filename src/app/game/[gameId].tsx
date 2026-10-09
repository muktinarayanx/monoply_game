import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  StatusBar,
  useWindowDimensions,
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInDown,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { initAudio, playDiceRollSound, unloadAllSounds } from '../../utils/sound';
import { GameBoard } from '../../components/board/Board';
import { DiceFace } from '../../components/dice/Dice';
import { PlayerHud } from '../../components/player/PlayerHud';
import { ActionBar } from '../../components/board/ActionBar';
import { PropertyModal } from '../../components/board/PropertyModal';
import { TileInfoModal } from '../../components/board/TileInfoModal';
import { PaymentModal } from '../../components/board/PaymentModal';
import { SalaryModal } from '../../components/board/SalaryModal';
import { AuctionModal } from '../../components/board/AuctionModal';
import { JailModal } from '../../components/board/JailModal';
import { PropertyManagerModal, ManagerMode } from '../../components/board/PropertyManagerModal';
import { TradeModal } from '../../components/board/TradeModal';
import { TradeReviewModal } from '../../components/board/TradeReviewModal';
import { GlobalEventPopup } from '../../components/board/GlobalEventPopup';
import { PlayerProfileModal } from '../../components/player/PlayerProfileModal';
import { BankModal } from '../../components/board/BankModal';
import { DiscountModal } from '../../components/board/DiscountModal';
import { CardModal } from '../../components/board/CardModal';
import { useGameStore } from '../../store/gameStore';
import { socketManager } from '../../utils/socket';
import { PaymentEvent } from '../../types/game';
import { Player } from '../../types/player';
import { theme } from '../../constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function GameScreen() {
  const { gameId } = useLocalSearchParams();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const game = useGameStore((s) => s.game);
  const initGame = useGameStore((s) => s.initGame);
  const rollDiceAction = useGameStore((s) => s.rollDice);
  const buyPropertyAction = useGameStore((s) => s.buyProperty);
  const endTurnAction = useGameStore((s) => s.endTurn);
  const startAuctionAction = useGameStore((s) => s.startAuction);
  const placeBidAction = useGameStore((s) => s.placeBid);
  const withdrawAuctionAction = useGameStore((s) => s.withdrawAuction);
  const rollForJailAction = useGameStore((s) => s.rollForJail);
  const payJailFineAction = useGameStore((s) => s.payJailFine);
  const sendToJailAction = useGameStore((s) => s.sendToJail);
  
  const buildHouseAction = useGameStore((s) => s.buildHouse);
  const buildHotelAction = useGameStore((s) => s.buildHotel);
  const sellBuildingAction = useGameStore((s) => s.sellBuilding);
  const mortgagePropertyAction = useGameStore((s) => s.mortgageProperty);
  const redeemPropertyAction = useGameStore((s) => s.redeemProperty);
  
  const proposeTradeAction = useGameStore((s) => s.proposeTrade);
  const acceptTradeAction = useGameStore((s) => s.acceptTrade);
  const rejectTradeAction = useGameStore((s) => s.rejectTrade);
  const takeLoanAction = useGameStore((s) => s.takeLoan);
  const repayLoanAction = useGameStore((s) => s.repayLoan);
  const setDiscountAction = useGameStore((s) => s.setDiscount);
  const removeDiscountAction = useGameStore((s) => s.removeDiscount);

  const [isRolling, setIsRolling] = useState(false);
  const [hasRolled, setHasRolled] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showTestPrompt, setShowTestPrompt] = useState(false);
  const [testSteps, setTestSteps] = useState('');
  const [declinedPropertyId, setDeclinedPropertyId] = useState<string | null>(null);
  const [inspectedPropertyId, setInspectedPropertyId] = useState<string | null>(null);
  const [activePayment, setActivePayment] = useState<PaymentEvent | null>(null);
  const [showJailModal, setShowJailModal] = useState(false);
  const [jailActionTaken, setJailActionTaken] = useState(false);
  const [viewingPlayerProfile, setViewingPlayerProfile] = useState<Player | null>(null);
  const [managerMode, setManagerMode] = useState<ManagerMode | null>(null);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [activeCardEvent, setActiveCardEvent] = useState<NonNullable<typeof game>['lastCardEvent'] | null>(null);
  const [lastProcessedCardTime, setLastProcessedCardTime] = useState<number>(0);

  // Dice glow animation
  const diceGlow = useSharedValue(0);
  const rollBtnScale = useSharedValue(1);

  useEffect(() => {
    if (!game) {
      initGame();
    }
    // Initialize audio system
    initAudio();
    return () => {
      unloadAllSounds();
    };
  }, [game, initGame]);

  const [lastProcessedPaymentTime, setLastProcessedPaymentTime] = useState(0);

  // Show payment modal when a new payment event happens and animation finishes
  useEffect(() => {
    if (game?.lastPayment && !isAnimating && game.lastPayment.timestamp > lastProcessedPaymentTime) {
      setActivePayment(game.lastPayment);
      setLastProcessedPaymentTime(game.lastPayment.timestamp);
    }
  }, [game?.lastPayment, isAnimating, lastProcessedPaymentTime]);

  // Show card modal when a new card event happens and animation finishes
  useEffect(() => {
    if (game?.lastCardEvent && !isAnimating && game.lastCardEvent.timestamp > lastProcessedCardTime) {
      setActiveCardEvent(game.lastCardEvent);
      setLastProcessedCardTime(game.lastCardEvent.timestamp);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [game?.lastCardEvent, isAnimating, lastProcessedCardTime]);

  // Two-phase Go-to-Jail: after landing on position 30, slide back to jail
  useEffect(() => {
    if (game?.pendingJail && !isAnimating) {
      // Player has landed on "Go to Jail" and the walk animation finished.
      // Wait a beat, then dispatch sendToJail to move them to position 10.
      const timer = setTimeout(() => {
        sendToJailAction();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [game?.pendingJail, isAnimating, sendToJailAction]);

  // Pulse the roll button when it's your turn
  useEffect(() => {
    if (!hasRolled && !isRolling) {
      diceGlow.value = withDelay(
        500,
        withSequence(
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        )
      );
    }
  }, [hasRolled, isRolling]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: diceGlow.value,
  }));

  const rollBtnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rollBtnScale.value }],
  }));

  const executeRoll = useCallback((forcedSteps?: number) => {
    setIsRolling(true);
    setIsAnimating(true); // Start animation lock
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    playDiceRollSound(); // Play dice roll sound

    setTimeout(() => {
      setIsRolling(false);
      setHasRolled(true);
      rollDiceAction(forcedSteps);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 900);
  }, [rollDiceAction]);

  const handleRollDice = useCallback(() => {
    if (isRolling || hasRolled) return;
    
    // For testing only
    setShowTestPrompt(true);
  }, [isRolling, hasRolled]);

  const handleAnimationComplete = useCallback(() => {
    setIsAnimating(false);
  }, []);

  const handleEndTurn = useCallback(() => {
    endTurnAction();
    setHasRolled(false);
    setDeclinedPropertyId(null);
    setShowJailModal(false);
    setJailActionTaken(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [endTurnAction]);

  if (!game) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.loadingEmoji}>🎲</Text>
        <Text style={styles.loadingText}>Setting up the board...</Text>
      </View>
    );
  }

  const currentPlayer = game.players[game.currentPlayerIndex];
  
  // Only true if the current player's name matches our session's player name
  const isMyTurn = socketManager.playerName === currentPlayer.name; 
  
  const dice1 = game.lastDiceRoll ? game.lastDiceRoll[0] : 1;
  const dice2 = game.lastDiceRoll ? game.lastDiceRoll[1] : 1;

  // Check if current tile is a buyable property
  const currentTile = game.board[currentPlayer.position];
  const currentProperty = currentTile?.propertyId ? game.properties[currentTile.propertyId] : undefined;
  
  // They can buy if they rolled, it's their turn, property is unowned, they can afford it, and they haven't declined it yet, and no active auction
  const canBuy = hasRolled && !isAnimating && isMyTurn && currentProperty && !currentProperty.ownerId && currentPlayer.money >= currentProperty.price && game.status !== 'auction';
  const showPropertyModal = canBuy && declinedPropertyId !== currentProperty?.id;

  // Jail detection: show jail modal at the start of a jailed player's turn
  const isPlayerInJail = currentPlayer.isInJail;
  const shouldShowJailModal = isPlayerInJail && !hasRolled && !jailActionTaken;
  const [displayedPlayers, setDisplayedPlayers] = useState<Player[]>(game.players);
  
  useEffect(() => {
    if (!isAnimating) {
      setDisplayedPlayers(game.players);
    }
  }, [isAnimating, game.players]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      {/* ── Player HUD (top) ─────────────────────── */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)}>
        <View style={{ height: Math.max(insets.top, 10) }} />
        <PlayerHud 
          players={displayedPlayers} 
          currentPlayerIndex={game.currentPlayerIndex} 
          onPlayerPress={(player) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setViewingPlayerProfile(player);
          }}
        />
        
        {/* Top Event Feed Log */}
        {game.eventFeed.length > 0 && (
          <View style={styles.topEventFeed}>
            <Text style={styles.topEventText} numberOfLines={1}>
              📢 {game.eventFeed[0]}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* ── Board ─────────────────────────────────── */}
      <Animated.View
        entering={FadeIn.delay(100).duration(600)}
        style={styles.boardWrapper}
      >
        <GameBoard
          boardData={game.board}
          properties={game.properties}
          players={game.players}
          currentPlayerIndex={game.currentPlayerIndex}
          onPlayerAnimationComplete={handleAnimationComplete}
          onTilePress={(propertyId) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setInspectedPropertyId(propertyId);
          }}
        />
        
        {/* Central Event Popup */}
        {game.eventFeed.length > 0 && (
          <GlobalEventPopup latestEvent={game.eventFeed[0]} />
        )}
      </Animated.View>

      {/* ── Action Bar ────────────────────────────── */}
      <Animated.View entering={FadeIn.delay(400).duration(400)} style={{ marginTop: 8 }}>
        <ActionBar
          onMenu={() => router.back()}
          onBuild={() => setManagerMode('BUILD')}
          onTrade={() => setShowTradeModal(true)}
          onMortgage={() => setManagerMode('MORTGAGE')}
          onBank={() => setShowBankModal(true)}
          onDiscount={() => setShowDiscountModal(true)}
        />
      </Animated.View>

      {/* ── Dice + Roll Section (bottom) ──────────── */}
      <Animated.View
        entering={SlideInDown.delay(300).duration(500).springify()}
        style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 12) }]}
      >
        {/* Dice display - Now Pressable for rolling */}
        <AnimatedPressable 
          style={styles.diceRow}
          onPress={(!hasRolled && isMyTurn && !isPlayerInJail) ? handleRollDice : undefined}
          onPressIn={() => { if (!hasRolled && isMyTurn && !isPlayerInJail) rollBtnScale.value = withSpring(0.92); }}
          onPressOut={() => { rollBtnScale.value = withSpring(1); }}
          disabled={hasRolled || !isMyTurn || isRolling || isPlayerInJail}
        >
          {/* Left Arrow */}
          <View style={styles.diceArrowContainer}>
            {!hasRolled && isMyTurn && <Text style={styles.diceArrow}>▶</Text>}
          </View>
          
          <Animated.View style={[{ flexDirection: 'row' }, rollBtnAnimStyle]}>
            <DiceFace value={dice1} size={52} isRolling={isRolling} />
            <View style={{ width: 12 }} />
            <DiceFace value={dice2} size={52} isRolling={isRolling} />
            <Animated.View style={[styles.rollGlow, glowStyle]} pointerEvents="none" />
          </Animated.View>

          {/* Right Arrow */}
          <View style={styles.diceArrowContainer}>
            {!hasRolled && isMyTurn && <Text style={styles.diceArrow}>◀</Text>}
          </View>
        </AnimatedPressable>

        {/* Roll / End Turn / Buy buttons */}
        <View style={styles.ctaRow}>
          {!hasRolled && isMyTurn && !isPlayerInJail ? (
            <Text style={styles.instructionText}>Roll the dice</Text>
          ) : !hasRolled && isPlayerInJail && !jailActionTaken ? (
            <Text style={styles.instructionText}>🔒 You are in Jail!</Text>
          ) : !isMyTurn ? (
            <Text style={styles.waitingText}>⏳ {currentPlayer.name}'s turn...</Text>
          ) : null}

          {/* Note: the old buy button is removed. It is now handled by the PropertyModal overlay */}

          {hasRolled && isMyTurn && !showPropertyModal && (
            <AnimatedPressable
              onPress={handleEndTurn}
              style={styles.endTurnButton}
            >
              <Text style={styles.endTurnText}>End Turn →</Text>
            </AnimatedPressable>
          )}
        </View>

      </Animated.View>

      {/* ── Test Dice Modal ────────────────────── */}
      <Modal
        visible={showTestPrompt}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.testModalOverlay}>
          <View style={styles.testModalContent}>
            <Text style={styles.testModalTitle}>Test Mode (Dice Roll)</Text>
            <Text style={styles.testModalSubtitle}>Enter steps to move or leave empty for random roll:</Text>
            <TextInput
              style={styles.testModalInput}
              keyboardType="number-pad"
              value={testSteps}
              onChangeText={setTestSteps}
              placeholder="e.g. 4"
              placeholderTextColor="#999"
              autoFocus
            />
            <View style={styles.testModalButtons}>
              <Pressable
                style={[styles.testModalButton, styles.testModalButtonCancel]}
                onPress={() => {
                  setShowTestPrompt(false);
                  setTestSteps('');
                }}
              >
                <Text style={styles.testModalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.testModalButton, styles.testModalButtonConfirm]}
                onPress={() => {
                  setShowTestPrompt(false);
                  const steps = parseInt(testSteps, 10);
                  executeRoll(isNaN(steps) ? undefined : steps);
                  setTestSteps('');
                }}
              >
                <Text style={styles.testModalButtonText}>Roll</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Overlay Modals ──────────────────────── */}
      {showPropertyModal && currentProperty && (
        <PropertyModal
          property={currentProperty}
          onBuy={() => {
            buyPropertyAction(currentProperty.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }}
          onAuction={() => {
            startAuctionAction(currentProperty.id);
            setDeclinedPropertyId(currentProperty.id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        />
      )}

      {/* ── Auction Modal ── */}
      {game.status === 'auction' && game.auction && (
        <AuctionModal
          auction={game.auction}
          players={game.players}
          property={game.properties[game.auction.propertyId]}
          onBid={(playerId, amount) => {
            placeBidAction(playerId, amount);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
          onWithdraw={(playerId) => {
            withdrawAuctionAction(playerId);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        />
      )}

      {/* ── Tile Info Modal (read-only inspection) ── */}
      {inspectedPropertyId && !showPropertyModal && (
        <TileInfoModal
          property={game.properties[inspectedPropertyId]}
          onClose={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setInspectedPropertyId(null);
          }}
        />
      )}

      {/* ── Payment / Rent Modal ── */}
      {activePayment && (
        <PaymentModal
          fromPlayer={game.players.find(p => p.id === activePayment.fromId)!}
          toPlayer={game.players.find(p => p.id === activePayment.toId)!}
          amount={activePayment.amount}
          discountPercent={activePayment.discountPercent}
          originalAmount={activePayment.originalAmount}
          onComplete={() => setActivePayment(null)}
        />
      )}

      {/* ── Jail Modal ── */}
      {shouldShowJailModal && (
        <JailModal
          player={currentPlayer}
          onRollForFreedom={() => {
            rollForJailAction();
            setJailActionTaken(true);
            // If player escaped jail (no longer in jail), they already moved via engine
            // If still in jail, they just wasted a turn
            setHasRolled(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          }}
          onPayFine={() => {
            payJailFineAction();
            setJailActionTaken(true);
            // Player paid fine, they're free but haven't rolled yet for movement
            // They can now roll the dice normally
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }}
        />
      )}

      {/* ── Player Profile Modal ── */}
      {viewingPlayerProfile && (
        <PlayerProfileModal
          player={viewingPlayerProfile}
          properties={game.properties}
          onClose={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setViewingPlayerProfile(null);
          }}
        />
      )}

      {/* ── Property Manager Modal ── */}
      {managerMode && (
        <PropertyManagerModal
          game={game}
          player={currentPlayer}
          properties={game.properties}
          initialMode={managerMode}
          allowedTabs={managerMode === 'BUILD' || managerMode === 'SELL' ? ['BUILD', 'SELL'] : ['MORTGAGE', 'REDEEM']}
          onClose={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setManagerMode(null);
          }}
          onAction={(mode, propertyId) => {
            const property = game.properties[propertyId];
            if (mode === 'BUILD') {
              if (property.level === 4) buildHotelAction(propertyId);
              else buildHouseAction(propertyId);
            } else if (mode === 'SELL') {
              sellBuildingAction(propertyId);
            } else if (mode === 'MORTGAGE') {
              mortgagePropertyAction(propertyId);
            } else if (mode === 'REDEEM') {
              redeemPropertyAction(propertyId);
            }
          }}
        />
      )}

      {/* ── Trade Modal (Propose) ── */}
      {showTradeModal && !game.pendingTrade && (
        <TradeModal
          game={game}
          currentPlayer={currentPlayer}
          onClose={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowTradeModal(false);
          }}
          onPropose={(toId, offerProperties, offerMoney, offerJailCards, requestProperties, requestMoney, requestJailCards) => {
            proposeTradeAction({
              fromId: currentPlayer.id,
              toId,
              offerProperties,
              offerMoney,
              offerJailCards,
              requestProperties,
              requestMoney,
              requestJailCards
            });
            setShowTradeModal(false);
          }}
        />
      )}

      {/* ── Trade Review Modal (Accept/Reject) ── */}
      {game.pendingTrade && (
        <TradeReviewModal
          game={game}
          trade={game.pendingTrade}
          onAccept={() => acceptTradeAction()}
          onReject={() => rejectTradeAction()}
        />
      )}

      {/* ── Bank Modal ── */}
      {showBankModal && currentPlayer && (
        <BankModal
          game={game}
          player={currentPlayer}
          onClose={() => setShowBankModal(false)}
          onTakeLoan={takeLoanAction}
          onRepayLoan={repayLoanAction}
        />
      )}

      {/* ── Discount Modal ── */}
      {showDiscountModal && currentPlayer && (
        <DiscountModal
          game={game}
          currentPlayer={currentPlayer}
          onClose={() => setShowDiscountModal(false)}
          onSetDiscount={setDiscountAction}
          onRemoveDiscount={removeDiscountAction}
        />
      )}

      {/* ── Card Modal ── */}
      {activeCardEvent && (
        <CardModal
          cardType={activeCardEvent.cardType}
          title={activeCardEvent.title}
          description={activeCardEvent.description}
          onClose={() => setActiveCardEvent(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  topSafeArea: {
    height: 50,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#0A1628',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },

  boardWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },

  bottomSection: {
    paddingTop: 8,
    backgroundColor: 'rgba(11,29,58,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },

  diceRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },

  ctaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },

  diceArrowContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diceArrow: {
    color: '#10B981', // green matching the screenshot
    fontSize: 16,
    fontWeight: '900',
    textShadowColor: 'rgba(16, 185, 129, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  rollGlow: {
    position: 'absolute',
    top: -10, left: -10, right: -10, bottom: -10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 30,
  },
  instructionText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },

  buyButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  buyButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },

  endTurnButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  endTurnText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '700',
  },

  waitingBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  waitingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '600',
  },

  topEventFeed: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topEventText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    textAlign: 'center',
  },
  testModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  testModalContent: {
    backgroundColor: '#1A2942',
    padding: 24,
    borderRadius: 16,
    width: '80%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  testModalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  testModalSubtitle: {
    color: '#A0B4D0',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  testModalInput: {
    backgroundColor: '#0A1628',
    color: '#FFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A90E2',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 24,
  },
  testModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  testModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  testModalButtonCancel: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  testModalButtonConfirm: {
    backgroundColor: '#4A90E2',
  },
  testModalButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
