import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Text, Pressable, StatusBar, Alert, Share } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  FadeIn,
  FadeInDown,
  FadeInUp,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { socketManager, LobbyPlayer } from '../../utils/socket';
import { useGameStore } from '../../store/gameStore';
import { mockBoard, mockProperties } from '../../data/boardData';
import { mockEventCards } from '../../data/cardData';
import { Player } from '../../types/player';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 5;

const PLAYER_EMOJIS = ['😎', '💃', '🧑‍💻', '🎯', '🌟'];

export default function CreateRoomScreen() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [isCreating, setIsCreating] = useState(true);

  const pulseScale = useSharedValue(1);

  // Create the room on mount
  useEffect(() => {
    const create = async () => {
      try {
        const result = await socketManager.createGame('Host', '😎');
        setRoomCode(result.gameId);
        setPlayers(result.players);
        setIsCreating(false);
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to create room');
        router.back();
      }
    };
    create();

    // Register lobby update callback
    socketManager.setLobbyUpdateCallback((updatedPlayers) => {
      setPlayers(updatedPlayers);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    });

    // Register game started callback (in case host starts from another device somehow)
    socketManager.setGameStartedCallback(() => {
      router.replace(`/game/${roomCode || 'online'}` as never);
    });

    return () => {
      socketManager.setLobbyUpdateCallback(null);
      socketManager.setGameStartedCallback(null);
    };
  }, []);

  // Pulse the start button
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const canStart = players.length >= MIN_PLAYERS;

  const handleStartGame = useCallback(async () => {
    if (!canStart) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Build initial state with real player names from lobby
    const gamePlayers: Player[] = players.map((p, i) => ({
      id: `player-${i + 1}`,
      name: p.name,
      avatar: `avatar-${i + 1}`,
      money: 1000,
      position: 0,
      isBankrupt: false,
      isInJail: false,
      jailTurns: 0,
      getOutOfJailCards: 0,
      goPassCount: 0,
      loans: [],
      currentLoanRate: 20,
      discountsGiven: {},
    }));

    const initialState = {
      id: roomCode || 'online-game',
      status: 'playing' as const,
      players: gamePlayers,
      currentPlayerIndex: 0,
      properties: mockProperties,
      board: mockBoard,
      round: 1,
      turnCount: 0,
      eventCards: mockEventCards,
      eventFeed: ['Game started!'],
    };

    try {
      // Set local state
      useGameStore.setState({ game: initialState });
      // Tell server to broadcast to all
      await socketManager.startGame(initialState);
      // Navigate to game
      router.replace(`/game/${roomCode}` as never);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to start game');
    }
  }, [canStart, players, roomCode, router]);

  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Join my Indian Tycoon game! Room Code: ${roomCode}`,
      });
    } catch {}
  };

  if (isCreating) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" />
        <Text style={{ color: '#FFF', fontSize: 18 }}>Creating room...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <View style={styles.topSafe} />

      {/* Header */}
      <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.header}>
        <Pressable onPress={() => { socketManager.clearSession(); router.back(); }} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>GAME ROOM</Text>
        <View style={{ width: 60 }} />
      </Animated.View>

      {/* Room Code */}
      <Animated.View entering={FadeIn.delay(300).duration(600)} style={styles.codeSection}>
        <Text style={styles.codeLabel}>ROOM CODE</Text>
        <Pressable onPress={handleShareCode}>
          <View style={styles.codeBox}>
            {roomCode.split('').map((char, i) => (
              <View key={i} style={styles.codeLetter}>
                <Text style={styles.codeChar}>{char}</Text>
              </View>
            ))}
          </View>
        </Pressable>
        <Text style={styles.shareHint}>Tap code to share with friends 📤</Text>
      </Animated.View>

      {/* Players list */}
      <View style={styles.playersSection}>
        <Text style={styles.sectionTitle}>PLAYERS ({players.length}/{MAX_PLAYERS})</Text>
        {players.map((p, i) => (
          <Animated.View
            key={`${p.name}-${i}`}
            entering={FadeInDown.delay(i * 200).duration(400).springify()}
            style={styles.playerRow}
          >
            <View style={styles.playerAvatar}>
              <Text style={styles.playerEmoji}>{p.emoji}</Text>
            </View>
            <Text style={styles.playerName}>
              {p.name} {p.isHost ? '👑' : ''}
            </Text>
            <View style={[styles.readyBadge, p.isConnected && styles.readyBadgeActive]}>
              <Text style={[styles.readyText, p.isConnected && styles.readyTextActive]}>
                {p.isConnected ? '✓ Online' : '⏳ Offline'}
              </Text>
            </View>
          </Animated.View>
        ))}
        {players.length < MAX_PLAYERS && (
          <View style={styles.waitingSlot}>
            <Text style={styles.waitingSlotText}>⏳ Waiting for players... (min {MIN_PLAYERS})</Text>
          </View>
        )}
      </View>

      {/* Settings */}
      <Animated.View entering={FadeInUp.delay(600).duration(400)} style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>GAME SETTINGS</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Starting Cash</Text>
          <Text style={styles.settingValue}>₹1,000</Text>
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Mode</Text>
          <Text style={styles.settingValue}>Online Multiplayer</Text>
        </View>
      </Animated.View>

      {/* Start Button */}
      <View style={styles.bottomSection}>
        <AnimatedPressable
          onPress={handleStartGame}
          disabled={!canStart}
          style={[styles.startButton, canStart ? pulseStyle : styles.startButtonDisabled]}
        >
          <Text style={styles.startButtonText}>
            {canStart ? '🎲 START GAME' : `⏳ Need ${MIN_PLAYERS - players.length} more player(s)`}
          </Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  topSafe: { height: 50 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 60,
  },
  backText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
  },

  codeSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 3,
    marginBottom: 10,
  },
  codeBox: {
    flexDirection: 'row',
    gap: 6,
  },
  codeLetter: {
    width: 44,
    height: 52,
    borderRadius: 10,
    backgroundColor: 'rgba(255,153,51,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,153,51,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeChar: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FF9933',
  },
  shareHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 10,
  },

  playersSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
    marginBottom: 10,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerEmoji: {
    fontSize: 20,
  },
  playerName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  readyBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  readyBadgeActive: {
    backgroundColor: 'rgba(16,185,129,0.2)',
  },
  readyText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
  readyTextActive: {
    color: '#10B981',
  },
  waitingSlot: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderStyle: 'dashed',
    paddingVertical: 16,
    alignItems: 'center',
  },
  waitingSlotText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.2)',
  },

  settingsSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  settingLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  bottomSection: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 44,
  },
  startButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  startButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#555',
    shadowOpacity: 0,
  },
});
