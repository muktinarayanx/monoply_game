import React, { useState } from 'react';
import { View, StyleSheet, Text, Pressable, ScrollView, useWindowDimensions, Modal } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { FontAwesome5 } from '@expo/vector-icons';
import { Player } from '../../types/player';
import { DISCOUNT_OPTIONS, getPlayerDiscounts, DiscountPercent } from '../../game-engine/discountEngine';
import { GameState } from '../../types/game';

interface DiscountModalProps {
  game: GameState;
  currentPlayer: Player;
  onClose: () => void;
  onSetDiscount: (toPlayerId: string, percent: number) => void;
  onRemoveDiscount: (toPlayerId: string) => void;
}

export const DiscountModal: React.FC<DiscountModalProps> = ({
  game,
  currentPlayer,
  onClose,
  onSetDiscount,
  onRemoveDiscount
}) => {
  const { width } = useWindowDimensions();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  // Other active players
  const otherPlayers = game.players.filter(p => p.id !== currentPlayer.id && !p.isBankrupt);
  
  // Current active discounts this player has given
  const activeDiscounts = currentPlayer.discountsGiven || {};

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
            <Text style={styles.headerIcon}>🏷️</Text>
            <Text style={styles.headerTitle}>DISCOUNTS</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <FontAwesome5 name="times" size={18} color="#FFF" />
            </Pressable>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Offer discounts on your properties to specific players. Discounts apply automatically when they land on your properties.
            </Text>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {otherPlayers.map(player => {
              const currentDiscount = activeDiscounts[player.id];
              const isExpanded = selectedPlayerId === player.id;

              return (
                <View key={player.id} style={styles.playerCard}>
                  <Pressable
                    style={styles.playerHeader}
                    onPress={() => setSelectedPlayerId(isExpanded ? null : player.id)}
                  >
                    <View style={styles.playerInfo}>
                      <Text style={styles.playerName}>{player.name}</Text>
                      {currentDiscount ? (
                        <View style={styles.activeBadge}>
                          <Text style={styles.activeBadgeText}>{currentDiscount}% Active</Text>
                        </View>
                      ) : (
                        <Text style={styles.noDiscountText}>No discount</Text>
                      )}
                    </View>
                    <FontAwesome5
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={14}
                      color="rgba(255,255,255,0.5)"
                    />
                  </Pressable>

                  {isExpanded && (
                    <View style={styles.optionsContainer}>
                      <Text style={styles.optionsLabel}>Select Discount:</Text>
                      <View style={styles.optionsGrid}>
                        {DISCOUNT_OPTIONS.map(percent => (
                          <Pressable
                            key={percent}
                            style={[
                              styles.optionBtn,
                              currentDiscount === percent && styles.optionBtnActive
                            ]}
                            onPress={() => {
                              onSetDiscount(player.id, percent);
                              setSelectedPlayerId(null);
                            }}
                          >
                            <Text
                              style={[
                                styles.optionText,
                                currentDiscount === percent && styles.optionTextActive
                              ]}
                            >
                              {percent}%
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                      {currentDiscount && (
                        <Pressable
                          style={styles.removeBtn}
                          onPress={() => {
                            onRemoveDiscount(player.id);
                            setSelectedPlayerId(null);
                          }}
                        >
                          <FontAwesome5 name="trash" size={12} color="#EF4444" style={{ marginRight: 6 }} />
                          <Text style={styles.removeBtnText}>Remove Discount</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
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
    borderColor: 'rgba(16, 185, 129, 0.4)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  headerIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
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
  infoBox: {
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  infoText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 16,
    textAlign: 'center',
  },
  content: {
    padding: 16,
    maxHeight: 400,
  },
  playerCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  noDiscountText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
  },
  activeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFF',
  },
  optionsContainer: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    marginTop: -4,
  },
  optionsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 10,
    marginTop: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  optionBtnActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  optionTextActive: {
    color: '#FFF',
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  removeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EF4444',
  },
});
