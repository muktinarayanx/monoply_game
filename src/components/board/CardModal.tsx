import React, { useEffect } from 'react';
import { View, StyleSheet, Text, Pressable, useWindowDimensions, Modal } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { FontAwesome5 } from '@expo/vector-icons';

interface CardModalProps {
  cardType: 'CHANCE' | 'COMMUNITY_CHEST';
  title: string;
  description: string;
  onClose: () => void;
}

export const CardModal: React.FC<CardModalProps> = ({ cardType, title, description, onClose }) => {
  const { width } = useWindowDimensions();
  const isChance = cardType === 'CHANCE';

  // Auto-close after 4 seconds
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  // Determine if the card is positive or negative
  const isPositive = description.toLowerCase().includes('receive') || 
                     description.toLowerCase().includes('collect') ||
                     description.toLowerCase().includes('roll the dice');
  const isNegative = description.toLowerCase().includes('pay') || 
                     description.toLowerCase().includes('jail');

  return (
    <Modal visible transparent animationType="none">
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.overlay}>
        <Animated.View
          entering={ZoomIn.duration(400).springify()}
          exiting={ZoomOut.duration(300)}
          style={[
            styles.card,
            { width: width * 0.82 },
            isChance ? styles.cardChance : styles.cardChest,
          ]}
        >
          {/* Card Header */}
          <View style={[styles.cardHeader, isChance ? styles.headerChance : styles.headerChest]}>
            <Text style={styles.cardTypeEmoji}>{isChance ? '🎲' : '📦'}</Text>
            <Text style={[styles.cardTypeText, isChance ? styles.typeTextChance : styles.typeTextChest]}>
              {isChance ? 'CHANCE' : 'COMMUNITY CHEST'}
            </Text>
          </View>

          {/* Card Body */}
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{title}</Text>
            <View style={styles.divider} />
            <Text style={styles.cardDescription}>{description}</Text>

            {/* Effect indicator */}
            <View style={[
              styles.effectBadge,
              isPositive ? styles.effectPositive : isNegative ? styles.effectNegative : styles.effectNeutral,
            ]}>
              <FontAwesome5 
                name={isPositive ? 'arrow-up' : isNegative ? 'arrow-down' : 'exchange-alt'} 
                size={12} 
                color="#FFF" 
              />
              <Text style={styles.effectText}>
                {isPositive ? 'GAIN' : isNegative ? 'LOSS' : 'SPECIAL'}
              </Text>
            </View>
          </View>

          {/* Dismiss */}
          <Pressable onPress={onClose} style={styles.dismissBtn}>
            <Text style={styles.dismissText}>Tap to dismiss</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
  },
  cardChance: {
    borderColor: 'rgba(239, 68, 68, 0.6)',
    backgroundColor: '#1A0A0A',
  },
  cardChest: {
    borderColor: 'rgba(59, 130, 246, 0.6)',
    backgroundColor: '#0A0A1A',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  headerChance: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  headerChest: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  cardTypeEmoji: {
    fontSize: 24,
  },
  cardTypeText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 3,
  },
  typeTextChance: {
    color: '#EF4444',
  },
  typeTextChest: {
    color: '#3B82F6',
  },
  cardBody: {
    padding: 24,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 12,
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 1,
    marginBottom: 14,
  },
  cardDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 18,
  },
  effectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  effectPositive: {
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
  },
  effectNegative: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
  },
  effectNeutral: {
    backgroundColor: 'rgba(245, 158, 11, 0.3)',
  },
  effectText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
  },
  dismissBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  dismissText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
  },
});
