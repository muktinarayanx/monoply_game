import React from 'react';
import { View, StyleSheet, Text, Pressable, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface ActionBarProps {
  onBuild: () => void;
  onTrade: () => void;
  onMortgage: () => void;
  onMenu: () => void;
  onBank: () => void;
  onDiscount: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ActionButton: React.FC<{
  label: string;
  color: string;
  shadowColor: string;
  onPress: () => void;
}> = ({ label, color, shadowColor, onPress }) => {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value }
    ],
  }));

  return (
    <AnimatedPressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      onPressIn={() => {
        scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
        translateY.value = withSpring(2, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
        translateY.value = withSpring(0, { damping: 15, stiffness: 400 });
      }}
      style={[
        styles.actionBtnContainer,
        { backgroundColor: shadowColor },
        animStyle
      ]}
    >
      <View style={[styles.actionBtnInner, { backgroundColor: color }]}>
        <Text style={styles.actionLabel} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
      </View>
    </AnimatedPressable>
  );
};

export const ActionBar: React.FC<ActionBarProps> = ({
  onBuild,
  onTrade,
  onMortgage,
  onMenu,
  onBank,
  onDiscount,
}) => {
  const { width } = useWindowDimensions();
  // 3 buttons per row, gap of 4, padding 8 on each side
  const btnWidth = (width - 16 - (2 * 4)) / 3;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={{ width: btnWidth }}>
          <ActionButton label="MENU" color="#3B82F6" shadowColor="#1D4ED8" onPress={onMenu} />
        </View>
        <View style={{ width: btnWidth }}>
          <ActionButton label="BUILD" color="#10B981" shadowColor="#047857" onPress={onBuild} />
        </View>
        <View style={{ width: btnWidth }}>
          <ActionButton label="MORTGAGE" color="#10B981" shadowColor="#047857" onPress={onMortgage} />
        </View>
      </View>
      <View style={styles.row}>
        <View style={{ width: btnWidth }}>
          <ActionButton label="TRADE" color="#EF4444" shadowColor="#B91C1C" onPress={onTrade} />
        </View>
        <View style={{ width: btnWidth }}>
          <ActionButton label="BANK" color="#F59E0B" shadowColor="#B45309" onPress={onBank} />
        </View>
        <View style={{ width: btnWidth }}>
          <ActionButton label="DISCOUNT" color="#8B5CF6" shadowColor="#6D28D9" onPress={onDiscount} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  actionBtnContainer: {
    borderRadius: 6,
    paddingBottom: 4, // This creates the 3D depth effect
  },
  actionBtnInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    height: 34,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
