import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  TextInput,
  StatusBar,
  Alert,
} from 'react-native';
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
import { socketManager } from '../../utils/socket';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const CODE_LENGTH = 6; // Server generates 6-char codes

export default function JoinRoomScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  // Listen for game start after joining lobby
  useEffect(() => {
    socketManager.setGameStartedCallback(() => {
      router.replace(`/game/${code || 'online'}` as never);
    });

    return () => {
      socketManager.setGameStartedCallback(null);
    };
  }, [code]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const handleCodeChange = (text: string) => {
    const clean = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length <= CODE_LENGTH) {
      setCode(clean);
      setError('');
    }
  };

  const handleJoin = async () => {
    if (code.length < CODE_LENGTH) {
      setError('Please enter a valid 6-character room code');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (!playerName.trim()) {
      setError('Please enter your name');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setJoining(true);
    setError('');

    try {
      await socketManager.joinGame(code, playerName.trim());
      // After joining, wait for the host to start the game.
      // The gameStarted callback will navigate us.
      // Show a waiting state
    } catch (err: any) {
      setError(err.message || 'Failed to join room');
      setJoining(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const codePads = Array.from({ length: CODE_LENGTH }, (_, i) => code[i] || '');

  if (joining) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" />
        <Text style={{ fontSize: 40, marginBottom: 16 }}>🎯</Text>
        <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '700' }}>Joined Room {code}!</Text>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 8 }}>
          Waiting for host to start the game...
        </Text>
        <Pressable
          onPress={() => { setJoining(false); socketManager.clearSession(); }}
          style={{ marginTop: 24, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)' }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>← Leave Room</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <View style={styles.topSafe} />

      {/* Header */}
      <Animated.View
        entering={FadeInDown.delay(100).duration(500)}
        style={styles.header}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>JOIN ROOM</Text>
        <View style={{ width: 60 }} />
      </Animated.View>

      {/* Icon */}
      <Animated.View
        entering={FadeIn.delay(250).duration(600)}
        style={styles.iconSection}
      >
        <Text style={styles.bigIcon}>🎯</Text>
        <Text style={styles.subtitle}>Enter the room code shared by your host</Text>
      </Animated.View>

      {/* Name Input */}
      <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.nameSection}>
        <Text style={styles.nameLabel}>YOUR NAME</Text>
        <TextInput
          style={styles.nameInput}
          value={playerName}
          onChangeText={setPlayerName}
          placeholder="Enter your name..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          maxLength={15}
        />
      </Animated.View>

      {/* Code Input */}
      <Animated.View
        entering={FadeInDown.delay(400).duration(500)}
        style={styles.codeSection}
      >
        <Pressable
          style={styles.codeRow}
          onPress={() => inputRef.current?.focus()}
        >
          {codePads.map((char, i) => (
            <View
              key={i}
              style={[
                styles.codePad,
                char ? styles.codePadFilled : {},
                i === code.length ? styles.codePadActive : {},
              ]}
            >
              <Text style={[styles.codePadText, char && styles.codePadTextFilled]}>
                {char || '·'}
              </Text>
            </View>
          ))}
        </Pressable>

        {/* Hidden input */}
        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          value={code}
          onChangeText={handleCodeChange}
          maxLength={CODE_LENGTH}
          autoCapitalize="characters"
          autoFocus
        />

        {error ? (
          <Animated.Text entering={FadeIn.duration(300)} style={styles.errorText}>
            {error}
          </Animated.Text>
        ) : null}
      </Animated.View>

      {/* Join Button */}
      <Animated.View entering={FadeInUp.delay(600).duration(400)} style={styles.bottomSection}>
        <AnimatedPressable
          onPress={handleJoin}
          disabled={code.length < CODE_LENGTH || !playerName.trim()}
          style={[
            styles.joinButton,
            code.length === CODE_LENGTH && playerName.trim()
              ? pulseStyle
              : styles.joinButtonDisabled,
          ]}
        >
          <Text style={styles.joinButtonText}>
            {code.length === CODE_LENGTH && playerName.trim() ? '🎲 JOIN GAME' : 'Enter code & name'}
          </Text>
        </AnimatedPressable>
      </Animated.View>
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
  backBtn: { width: 60 },
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

  iconSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
  },
  bigIcon: { fontSize: 48 },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 40,
  },

  nameSection: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  nameLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
    marginBottom: 8,
  },
  nameInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  codeSection: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  codeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  codePad: {
    width: 48,
    height: 60,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  codePadFilled: {
    backgroundColor: 'rgba(59,109,224,0.15)',
    borderColor: '#3B6DE0',
  },
  codePadActive: {
    borderColor: '#3B6DE0',
    backgroundColor: 'rgba(59,109,224,0.08)',
  },
  codePadText: {
    fontSize: 28,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.15)',
  },
  codePadTextFilled: {
    color: '#3B6DE0',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },

  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
  },

  bottomSection: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 44,
  },
  joinButton: {
    backgroundColor: '#1A49B8',
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: '#1A49B8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  joinButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#555',
    shadowOpacity: 0,
  },
});
