import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, Text, useWindowDimensions, Pressable, ScrollView, TextInput, Alert } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInUp, SlideOutDown } from 'react-native-reanimated';
import { FontAwesome5 } from '@expo/vector-icons';
import { Property } from '../../types/property';
import { Player } from '../../types/player';
import { GameState } from '../../types/game';
import * as Haptics from 'expo-haptics';
import { canTradeProperty } from '../../game-engine/tradeEngine';
import { GROUP_COLORS } from '../../data/boardData';

interface TradeModalProps {
  game: GameState;
  currentPlayer: Player;
  onClose: () => void;
  onPropose: (toId: string, offerProperties: string[], offerMoney: number, offerJailCards: number, requestProperties: string[], requestMoney: number, requestJailCards: number) => void;
}

export const TradeModal: React.FC<TradeModalProps> = ({ game, currentPlayer, onClose, onPropose }) => {
  const { width, height } = useWindowDimensions();
  const [targetPlayerId, setTargetPlayerId] = useState<string | null>(null);
  
  const [offerProps, setOfferProps] = useState<Set<string>>(new Set());
  const [requestProps, setRequestProps] = useState<Set<string>>(new Set());
  
  const [offerMoney, setOfferMoney] = useState<string>('0');
  const [requestMoney, setRequestMoney] = useState<string>('0');
  
  const [offerJailCards, setOfferJailCards] = useState<number>(0);
  const [requestJailCards, setRequestJailCards] = useState<number>(0);

  const [myPropIndex, setMyPropIndex] = useState(0);
  const [targetPropIndex, setTargetPropIndex] = useState(0);

  // Reset indices when target player changes
  useEffect(() => {
    setMyPropIndex(0);
    setTargetPropIndex(0);
    setOfferProps(new Set());
    setRequestProps(new Set());
    setOfferMoney('0');
    setRequestMoney('0');
  }, [targetPlayerId]);

  const otherPlayers = game.players.filter(p => p.id !== currentPlayer.id);
  const targetPlayer = otherPlayers.find(p => p.id === targetPlayerId);

  const myTradeableProps = useMemo(() => {
    return Object.values(game.properties).filter(p => p.ownerId === currentPlayer.id && canTradeProperty(game, p.id));
  }, [game, currentPlayer.id]);

  const targetTradeableProps = useMemo(() => {
    if (!targetPlayerId) return [];
    return Object.values(game.properties).filter(p => p.ownerId === targetPlayerId && canTradeProperty(game, p.id));
  }, [game, targetPlayerId]);

  const toggleSet = (set: Set<string>, id: string) => {
    const newSet = new Set(set);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    return newSet;
  };

  const hasProperty = offerProps.size > 0 || requestProps.size > 0;

  const handlePropose = () => {
    if (!targetPlayerId) return;
    if (!hasProperty) {
      Alert.alert("Invalid Trade", "A trade must include at least one property. Money-only trades are not allowed.");
      return;
    }
    const oMoney = Math.min(parseInt(offerMoney) || 0, currentPlayer.money);
    const rMoney = Math.min(parseInt(requestMoney) || 0, targetPlayer?.money || 0);
    onPropose(targetPlayerId, Array.from(offerProps), oMoney, offerJailCards, Array.from(requestProps), rMoney, requestJailCards);
    onClose();
  };

  const renderPropertySlideshow = (
    props: Property[],
    currentIndex: number,
    setIndex: React.Dispatch<React.SetStateAction<number>>,
    selectedSet: Set<string>,
    toggleFn: (id: string) => void
  ) => {
    if (props.length === 0) {
      return <Text style={styles.emptyText}>No tradeable properties</Text>;
    }
    const currentProp = props[currentIndex];
    const isSelected = selectedSet.has(currentProp.id);
    const groupColor = GROUP_COLORS[currentProp.group] ?? '#999';
    
    return (
      <View style={styles.slideshowContainer}>
        <View style={styles.slideshowControls}>
          <Pressable onPress={() => { Haptics.selectionAsync(); setIndex((currentIndex - 1 + props.length) % props.length); }} style={styles.slideshowBtn}>
            <FontAwesome5 name="chevron-left" size={16} color="#FFF" />
          </Pressable>
          <Text style={styles.slideshowIndicator}>{currentIndex + 1} / {props.length}</Text>
          <Pressable onPress={() => { Haptics.selectionAsync(); setIndex((currentIndex + 1) % props.length); }} style={styles.slideshowBtn}>
            <FontAwesome5 name="chevron-right" size={16} color="#FFF" />
          </Pressable>
        </View>

        <Pressable 
          style={[
            styles.miniCard, 
            { borderColor: groupColor },
            isSelected && styles.miniCardSelected
          ]} 
          onPress={() => { Haptics.selectionAsync(); toggleFn(currentProp.id); }}
        >
          <View style={[styles.miniCardHeader, { backgroundColor: groupColor }]}>
            <Text style={styles.miniCardName} numberOfLines={2}>{currentProp.name}</Text>
          </View>
          <View style={styles.miniCardBody}>
            <Text style={styles.miniCardRent}>RENT ₹{currentProp.baseRent}</Text>
            <Text style={styles.miniCardPrice}>MORTGAGE ₹{Math.floor(currentProp.price / 2)}</Text>
            
            {isSelected ? (
              <View style={styles.includedBadge}>
                <Text style={styles.includedBadgeText}>✓ INCLUDED</Text>
              </View>
            ) : (
              <Text style={styles.tapToInclude}>TAP TO INCLUDE</Text>
            )}
          </View>
        </Pressable>
      </View>
    );
  };

  if (!targetPlayerId) {
    return (
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.overlay}>
        <Animated.View entering={SlideInUp.duration(300)} exiting={SlideOutDown.duration(200)} style={[styles.modalBase, { width: width * 0.8, maxHeight: height * 0.7 }]}>
          <View style={styles.modalWrapper}>
            <View style={styles.modalHeader}>
              <Text style={styles.headerTitle}>SELECT TRADER</Text>
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <FontAwesome5 name="times" size={24} color="#FFF" />
              </Pressable>
            </View>
            <ScrollView style={styles.innerContent} contentContainerStyle={{ padding: 8 }}>
              {otherPlayers.map(p => (
                <Pressable key={p.id} style={styles.playerBtn} onPress={() => { Haptics.selectionAsync(); setTargetPlayerId(p.id); }}>
                  <Text style={styles.playerName}>{p.name}</Text>
                  <Text style={styles.playerMoney}>₹{p.money}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Animated.View>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.overlay}>
      <Animated.View entering={SlideInUp.duration(300)} exiting={SlideOutDown.duration(200)} style={[styles.modalBase, { width: width * 0.95, maxHeight: height * 0.85 }]}>
        <View style={styles.modalWrapper}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setTargetPlayerId(null)} style={styles.backBtn}>
              <FontAwesome5 name="arrow-left" size={20} color="#FFF" />
            </Pressable>
            <Text style={styles.headerTitle}>PROPOSE TRADE</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <FontAwesome5 name="times" size={24} color="#FFF" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {/* Left Column: Your Offer */}
              <View style={styles.tradeCol}>
                <Text style={styles.colHeader}>YOUR OFFER</Text>
                <Text style={styles.balText}>Bal: ₹{currentPlayer.money}</Text>
                
                <View style={styles.moneyInputBox}>
                  <Text style={styles.rupee}>₹</Text>
                  <TextInput 
                    style={styles.moneyInput}
                    keyboardType="number-pad"
                    value={offerMoney}
                    onChangeText={t => setOfferMoney(t.replace(/[^0-9]/g, ''))}
                    placeholder="0"
                  />
                </View>

                {currentPlayer.getOutOfJailCards > 0 && (
                  <View style={styles.jailCardContainer}>
                    <Text style={styles.jailCardLabel}>Jail Cards: {currentPlayer.getOutOfJailCards}</Text>
                    <View style={styles.jailCardControls}>
                      <Pressable onPress={() => { Haptics.selectionAsync(); setOfferJailCards(Math.max(0, offerJailCards - 1)); }} style={styles.qtyBtn}><Text style={styles.qtyBtnText}>-</Text></Pressable>
                      <Text style={styles.qtyText}>{offerJailCards}</Text>
                      <Pressable onPress={() => { Haptics.selectionAsync(); setOfferJailCards(Math.min(currentPlayer.getOutOfJailCards, offerJailCards + 1)); }} style={styles.qtyBtn}><Text style={styles.qtyBtnText}>+</Text></Pressable>
                    </View>
                  </View>
                )}

                <View style={styles.propsList}>
                  {renderPropertySlideshow(myTradeableProps, myPropIndex, setMyPropIndex, offerProps, (id) => setOfferProps(toggleSet(offerProps, id)))}
                </View>
              </View>

              <View style={styles.tradeCol}>
                <Text style={styles.colHeader}>WANT FROM {targetPlayer?.name.split(' ')[0]?.toUpperCase()}</Text>
                <Text style={styles.balText}>Bal: ₹{targetPlayer?.money}</Text>
                
                <View style={styles.moneyInputBox}>
                  <Text style={styles.rupee}>₹</Text>
                  <TextInput 
                    style={styles.moneyInput}
                    keyboardType="number-pad"
                    value={requestMoney}
                    onChangeText={t => setRequestMoney(t.replace(/[^0-9]/g, ''))}
                    placeholder="0"
                  />
                </View>

                {targetPlayer && targetPlayer.getOutOfJailCards > 0 && (
                  <View style={styles.jailCardContainer}>
                    <Text style={styles.jailCardLabel}>Jail Cards: {targetPlayer.getOutOfJailCards}</Text>
                    <View style={styles.jailCardControls}>
                      <Pressable onPress={() => { Haptics.selectionAsync(); setRequestJailCards(Math.max(0, requestJailCards - 1)); }} style={styles.qtyBtn}><Text style={styles.qtyBtnText}>-</Text></Pressable>
                      <Text style={styles.qtyText}>{requestJailCards}</Text>
                      <Pressable onPress={() => { Haptics.selectionAsync(); setRequestJailCards(Math.min(targetPlayer.getOutOfJailCards, requestJailCards + 1)); }} style={styles.qtyBtn}><Text style={styles.qtyBtnText}>+</Text></Pressable>
                    </View>
                  </View>
                )}

                <View style={styles.propsList}>
                  {renderPropertySlideshow(targetTradeableProps, targetPropIndex, setTargetPropIndex, requestProps, (id) => setRequestProps(toggleSet(requestProps, id)))}
                </View>
              </View>
            </View>

            <View style={styles.actionRow}>
              <Pressable 
                style={[styles.proposeBtn, !hasProperty && { backgroundColor: '#888', borderColor: '#666' }]} 
                onPress={handlePropose}
              >
                <Text style={styles.proposeBtnText}>
                  {hasProperty ? 'SEND TRADE OFFER' : 'ADD PROPERTY'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>

        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  modalBase: {
    backgroundColor: '#C85A17', 
    borderRadius: 16,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  modalWrapper: {
    backgroundColor: '#FF7F27',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFA050',
    padding: 12,
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 2,
    letterSpacing: 1,
  },
  closeBtn: { padding: 4 },
  backBtn: { padding: 4 },
  innerContent: {
    backgroundColor: '#FFF4D2',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(200, 150, 50, 0.3)',
  },
  playerBtn: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  playerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  playerMoney: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10B981',
  },
  tradeCol: {
    flex: 1,
    backgroundColor: '#FFF4D2',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E8B661',
    padding: 8,
  },
  colHeader: {
    fontSize: 11,
    fontWeight: '900',
    color: '#8B5A2B',
    textAlign: 'center',
    marginBottom: 2,
  },
  balText: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  moneyInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  rupee: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10B981',
  },
  moneyInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  propsList: {
    flex: 1,
  },
  miniCard: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderRadius: 6,
    overflow: 'hidden',
    height: 120,
    justifyContent: 'flex-start',
  },
  miniCardSelected: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  miniCardHeader: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  miniCardName: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  miniCardBody: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  miniCardRent: {
    fontSize: 10,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 2,
  },
  miniCardPrice: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  includedBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  includedBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
  },
  tapToInclude: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 12,
  },
  slideshowContainer: {
    marginVertical: 4,
  },
  slideshowControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    padding: 6,
    marginBottom: 8,
  },
  slideshowBtn: {
    backgroundColor: '#8B5A2B',
    padding: 6,
    borderRadius: 16,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideshowIndicator: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8B5A2B',
  },
  actionRow: {
    marginTop: 12,
    paddingHorizontal: 8,
  },
  proposeBtn: {
    backgroundColor: '#10B981',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderColor: '#047857',
  },
  proposeBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
  },
  jailCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  jailCardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#334155',
  },
  jailCardControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyBtn: {
    backgroundColor: '#E2E8F0',
    width: 24,
    height: 24,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#334155',
  },
  qtyText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1E293B',
    minWidth: 12,
    textAlign: 'center',
  },
});
